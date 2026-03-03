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
const BUILD_COMMAND = process.env.BUILD_COMMAND || 'npm run build';
const MAX_DEBUG_RETRIES = 3;

export interface DebugAgentResult {
  success: boolean;
  cannotFix: boolean;
  buildOutput: string;
  fixes: string[];
}

const DEBUG_SYSTEM = `You are a build-error repair engine.
You receive the full repository context and an error log.
Output ONLY a valid unified diff (git diff format) that fixes the errors.
Rules:
- Fix ONLY errors shown in the log — no refactoring, no new features
- Do NOT add unrelated features or change logic unrelated to the failures
- The diff must be directly applicable via: git apply --index
- Paths in the diff must be relative to the repo root
- If you cannot fix the errors, output exactly: CANNOT_FIX`;

export async function runDebugAgent(
  taskId: string,
  repoPath: string,
  errorLog: string
): Promise<DebugAgentResult> {
  await storage.logEvent(taskId, '[DEBUG] Starting debug agent', 'info');

  const git = simpleGit(repoPath);
  const fixes: string[] = [];
  let lastError = errorLog;

  for (let attempt = 1; attempt <= MAX_DEBUG_RETRIES; attempt++) {
    await storage.logEvent(taskId, `[DEBUG] Attempt ${attempt}/${MAX_DEBUG_RETRIES}`, 'info');

    // Git rollback before each retry (except first attempt)
    if (attempt > 1) {
      try {
        await git.checkout(['--', '.']);
        await storage.logEvent(taskId, '[DEBUG] Rolled back working tree', 'info');
      } catch (err: any) {
        await storage.logEvent(taskId, `[DEBUG] Rollback warning: ${err.message}`, 'warning');
      }
    }

    // Build context with error log
    const contextResult = await buildContext(repoPath, 'Fix build and test errors');
    const context = formatContext(contextResult.files);
    const enrichedContext = `${context}\n\n---\n\nBUILD/TEST ERROR LOG:\n${lastError.slice(0, 5000)}`;

    const prompt = `The project build or tests failed. Analyze the error log provided in context and generate a unified diff that fixes the failing build or test errors.`;

    await storage.logEvent(taskId, '[DEBUG] Calling LLM to generate fix diff...', 'info');

    let fixDiff: string;
    try {
      const result = await generateDiff(prompt, enrichedContext, { model: 'claude', taskId });
      fixDiff = result.diff;
    } catch (err: any) {
      await storage.logEvent(taskId, `[DEBUG] LLM call failed: ${err.message}`, 'error');
      lastError = `LLM error: ${err.message}`;
      continue;
    }

    // Check for CANNOT_FIX signal
    if (!fixDiff || fixDiff === 'NO_CHANGES' || fixDiff.trim() === 'CANNOT_FIX') {
      await storage.logEvent(taskId, '[DEBUG] LLM signalled CANNOT_FIX', 'warning');
      return { success: false, cannotFix: true, buildOutput: 'LLM indicated it cannot fix the errors', fixes };
    }

    await storage.logEvent(taskId, `[DEBUG] LLM generated fix diff (${fixDiff.length} chars)`, 'info');

    // Validate fix diff
    const sanitized = sanitizeUnifiedDiff(fixDiff);
    if (!sanitized) {
      await storage.logEvent(taskId, '[DEBUG] Fix diff failed sanitization', 'error');
      lastError = 'Fix diff sanitization failed';
      continue;
    }

    const diff = extractDiff(sanitized);
    const validation = validateUnifiedDiffEnhanced(diff);
    if (!validation.ok) {
      await storage.logEvent(taskId, `[DEBUG] Fix diff validation failed: ${validation.errors.join('; ')}`, 'error');
      lastError = `Fix diff validation: ${validation.errors.join('; ')}`;
      continue;
    }

    const applicability = validateDiffApplicability(diff, repoPath);
    if (!applicability.valid) {
      await storage.logEvent(taskId, `[DEBUG] Fix diff not applicable: ${applicability.error}`, 'error');
      lastError = `Fix diff not applicable: ${applicability.error}`;
      continue;
    }

    // Apply fix diff
    const patchPath = path.join(repoPath, '.vibe-debug.patch');
    try {
      fs.writeFileSync(patchPath, diff, 'utf-8');
      await git.raw(['apply', '--verbose', '.vibe-debug.patch']);
      await storage.logEvent(taskId, '[DEBUG] Fix diff applied', 'success');
    } catch (err: any) {
      await storage.logEvent(taskId, `[DEBUG] Failed to apply fix diff: ${err.message}`, 'error');
      lastError = `Failed to apply fix: ${err.message}`;
      continue;
    } finally {
      try { if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath); } catch { /* ignore */ }
    }

    // Re-run build to verify fix
    await storage.logEvent(taskId, `[DEBUG] Re-running build to verify fix: ${BUILD_COMMAND}`, 'info');
    try {
      const { stdout, stderr } = await execAsync(BUILD_COMMAND, {
        cwd: repoPath,
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024,
      });
      const output = ((stdout || '') + (stderr || '')).slice(0, 2000);
      fixes.push(`Attempt ${attempt}: fixed build errors`);
      await storage.logEvent(taskId, `[DEBUG] Build succeeded after fix (attempt ${attempt})`, 'success');
      return { success: true, cannotFix: false, buildOutput: output, fixes };
    } catch (err: any) {
      const output = ((err.stdout || '') + (err.stderr || '')).slice(0, 2000);
      await storage.logEvent(taskId, `[DEBUG] Build still failing after attempt ${attempt}`, 'error');
      lastError = output;
    }
  }

  await storage.logEvent(taskId, `[DEBUG] Exhausted ${MAX_DEBUG_RETRIES} retries — CANNOT_FIX`, 'error');

  // Final rollback
  try {
    await git.checkout(['--', '.']);
  } catch { /* ignore */ }

  return { success: false, cannotFix: true, buildOutput: lastError, fixes };
}
