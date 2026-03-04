import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import { storage } from '../storage';
import { generateDiff } from '../llm-router';
import { buildContext, formatContext } from '../context-builder';
import {
  sanitizeUnifiedDiff,
  extractDiff,
  validateUnifiedDiffEnhanced,
  validateDiffApplicability,
} from '../diff-validator';
const execAsync = promisify(exec);

const MAX_DEBUG_ITERATIONS = parseInt(process.env.MAX_DEBUG_ITERATIONS || '3', 10);

const DEBUG_SYSTEM = `You are a build-error repair engine.
You receive the full repository context and an error log.
Output ONLY a valid unified diff (git diff format) that fixes the errors.
Rules:
- Fix ONLY errors shown in the log — no refactoring, no new features
- Do NOT add unrelated features or change logic unrelated to the failures
- The diff must be directly applicable via: git apply --index
- Paths in the diff must be relative to the repo root
- If you cannot fix the errors, output exactly: CANNOT_FIX`;

const BUILD_COMMAND = process.env.BUILD_COMMAND || 'npm run build';

// ── Debug Agent ────────────────────────────────────────────
export interface DebugAgentResult {
  success: boolean;
  cannotFix?: boolean;
  buildOutput: string;
  summary: string;
  iterations: number;
}

export async function runDebugAgent(
  taskId: string,
  repoPath: string,
  errorLog: string
): Promise<DebugAgentResult> {
  await storage.logEvent(taskId, '[DEBUG] Starting debug agent', 'info');
  await storage.logEvent(taskId, `[DEBUG] Max iterations: ${MAX_DEBUG_ITERATIONS}`, 'info');

  let currentErrorLog = errorLog;
  let iteration = 0;

  while (iteration < MAX_DEBUG_ITERATIONS) {
    iteration++;
    await storage.logEvent(taskId, `[DEBUG] Iteration ${iteration}/${MAX_DEBUG_ITERATIONS}`, 'info');

    // Rebuild context each iteration to pick up prior fixes
    const contextResult = await buildContext(repoPath, 'Fix build and test errors');
    const context = formatContext(contextResult.files);
    const enrichedContext = `${context}\n\n---\n\nBUILD/TEST ERROR LOG:\n${currentErrorLog.slice(0, 5000)}`;

    const prompt = `The project build or tests failed. Analyze the error log and generate a fix.
Iteration ${iteration} of ${MAX_DEBUG_ITERATIONS}. Previous fixes may already be applied — focus only on remaining errors.`;

    await storage.logEvent(taskId, '[DEBUG] Calling LLM for fix...', 'info');

    let fixDiff: string;
    let llmSummary = '';
    try {
      const result = await generateDiff(prompt, enrichedContext, { model: 'claude', taskId, systemPrompt: DEBUG_SYSTEM });
      fixDiff = result.diff;
      llmSummary = result.summary || '';
      await storage.logEvent(taskId, `[DEBUG] LLM fix diff (${fixDiff.length} chars)`, 'info');
    } catch (err: any) {
      await storage.logEvent(taskId, `[DEBUG] LLM call failed: ${err.message}`, 'error');
      return { success: false, buildOutput: `LLM error: ${err.message}`, summary: `Debug agent LLM call failed: ${err.message}`, iterations: iteration };
    }

    // CANNOT_FIX signal — agent has given up, surface reason to user
    if (fixDiff.startsWith('CANNOT_FIX:') || fixDiff === 'NO_CHANGES') {
      const reason = fixDiff.startsWith('CANNOT_FIX:')
        ? fixDiff.slice(11).trim()
        : 'No further changes identified.';
      await storage.logEvent(taskId, `[DEBUG] Agent cannot fix: ${reason}`, 'warning');
      return { success: false, buildOutput: currentErrorLog.slice(0, 2000), summary: reason, iterations: iteration };
    }

    // Validate
    const sanitized = sanitizeUnifiedDiff(fixDiff);
    if (!sanitized) {
      await storage.logEvent(taskId, '[DEBUG] Diff failed sanitization — skipping', 'error');
      continue;
    }

    const diff = extractDiff(sanitized);
    const validation = validateUnifiedDiffEnhanced(diff);
    if (!validation.ok) {
      await storage.logEvent(taskId, `[DEBUG] Diff validation failed: ${validation.errors.join('; ')}`, 'error');
      continue;
    }

    const applicability = validateDiffApplicability(diff, repoPath);
    if (!applicability.valid) {
      await storage.logEvent(taskId, `[DEBUG] Diff not applicable: ${applicability.error}`, 'error');
      continue;
    }

    // Snapshot HEAD for rollback
    const git = simpleGit(repoPath);
    const headSha = (await git.revparse(['HEAD'])).trim();

    // Apply patch
    const patchPath = path.join(repoPath, '.vibe-debug.patch');
    try {
      fs.writeFileSync(patchPath, diff, 'utf-8');
      await git.raw(['apply', '--verbose', '.vibe-debug.patch']);
      await storage.logEvent(taskId, `[DEBUG] Patch applied (iteration ${iteration})`, 'success');
    } catch (err: any) {
      await storage.logEvent(taskId, `[DEBUG] Patch failed — rolling back to ${headSha}: ${err.message}`, 'error');
      try { await git.raw(['checkout', headSha, '--', '.']); } catch { /* best effort */ }
      continue;
    } finally {
      try { if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath); } catch { /* ignore */ }
    }

    // Verify with build
    await storage.logEvent(taskId, `[DEBUG] Verifying build: ${BUILD_COMMAND}`, 'info');
    try {
      const { stdout, stderr } = await execAsync(BUILD_COMMAND, {
        cwd: repoPath,
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024,
      });
      const output = ((stdout || '') + (stderr || '')).slice(0, 2000);
      await storage.logEvent(taskId, `[DEBUG] Build passed on iteration ${iteration}:\n${output}`, 'success');
      return {
        success: true,
        buildOutput: output,
        summary: llmSummary || `Build fixed on iteration ${iteration}.`,
        iterations: iteration,
      };
    } catch (err: any) {
      const output = ((err.stdout || '') + (err.stderr || '')).slice(0, 2000);
      await storage.logEvent(taskId, `[DEBUG] Still failing after iteration ${iteration}:\n${output}`, 'warning');
      currentErrorLog = output; // Feed updated error into next iteration
    }
  }

  // Iterations exhausted
  const exhaustedMsg = `Debug agent exhausted ${MAX_DEBUG_ITERATIONS} iterations without resolving the build. Manual review required. Last error: ${currentErrorLog.slice(0, 500)}`;
  await storage.logEvent(taskId, `[DEBUG] ${exhaustedMsg}`, 'error');
  return {
    success: false,
    buildOutput: currentErrorLog.slice(0, 2000),
    summary: exhaustedMsg,
    iterations: MAX_DEBUG_ITERATIONS,
  };
}
