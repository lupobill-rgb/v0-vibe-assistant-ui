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
const MAX_QA_FIX_ITERATIONS = parseInt(process.env.MAX_QA_FIX_ITERATIONS || '2', 10);

const QA_SYSTEM = `You are VIBE's QA Agent — the agent that owns test coverage and test quality end-to-end.

YOUR MISSION: Every changed file ships with passing tests. You write them. You fix them. Autonomously.

RULES:
- Use ONLY the Node.js built-in test runner (node:test module).
- Import: import { describe, it, before, after } from 'node:test'
- Import: import assert from 'node:assert'
- Do NOT use Jest, Mocha, Vitest, or any third-party test framework.
- Test the actual behavior of the changed code — not implementation details.
- Each test must have a clear, descriptive name that states what it verifies.
- Cover: happy path, edge cases, and error conditions for every exported function.
- Do not mock what you can test directly. Only mock external I/O (DB, HTTP, filesystem).
- Place test file alongside the source file with .test.ts extension.
- Output one atomic unified diff. Single file only. Max 200 lines.

OUTPUT FORMAT:
1. COVERAGE: <one sentence describing what is being tested>
2. DIFF: <unified diff>

If tests cannot be generated without a larger refactor, output: CANNOT_TEST: <plain English explanation>.`;

const QA_FIX_SYSTEM = `You are VIBE's QA Agent fixing failing tests.

YOUR MISSION: The tests you generated are failing. Fix them. The source code is correct — fix the tests.

RULES:
- Analyze the test failure output carefully. Fix only what is failing.
- Do not change source files. Only fix the test file.
- Do not change test assertions to make them trivially pass — fix the test logic.
- Output one atomic unified diff targeting only the test file.

OUTPUT FORMAT:
1. FAILURE REASON: <one sentence>
2. FIX: <one sentence>
3. DIFF: <unified diff>`;

export interface QaAgentResult {
  success: boolean;
  cannotFix?: boolean;
  testOutput: string;
  summary: string;
}

export async function runQaAgent(taskId: string, repoPath: string): Promise<QaAgentResult> {
  await storage.logEvent(taskId, '[QA] Starting QA agent', 'info');

  const git = simpleGit(repoPath);

  // Discover changed source files from last commit
  let changedFiles: string[] = [];
  try {
    const diffString = await git.diff(['HEAD~1', 'HEAD', '--name-only']);
    changedFiles = diffString
      .split('\n')
      .map((f: string) => f.trim())
      .filter((f: string) => f.length > 0 && !f.match(/\.(test|spec)\.(ts|js)x?$/));
    await storage.logEvent(taskId, `[QA] Changed source files: ${changedFiles.join(', ')}`, 'info');
  } catch (err: any) {
    await storage.logEvent(taskId, `[QA] Could not get changed files: ${err.message}`, 'warning');
  }

  if (changedFiles.length === 0) {
    await storage.logEvent(taskId, '[QA] No changed source files detected, skipping test generation', 'warning');
    return { success: true, testOutput: 'No changed source files', summary: 'No changed source files — test generation skipped.' };
  }

  // Build context focused on changed files
  const contextResult = await buildContext(repoPath, `Generate tests for changed files: ${changedFiles.join(', ')}`);
  const context = formatContext(contextResult.files);

  const prompt = `Generate tests for these changed source files: ${changedFiles.join(', ')}.`;

  await storage.logEvent(taskId, '[QA] Calling LLM to generate test diff...', 'info');

  let testDiff: string;
  try {
    const result = await generateDiff(prompt, context, { model: 'claude', taskId, systemPrompt: QA_SYSTEM });
    testDiff = result.diff;
    await storage.logEvent(taskId, `[QA] LLM generated test diff (${testDiff.length} chars)`, 'info');
  } catch (err: any) {
    await storage.logEvent(taskId, `[QA] LLM call failed: ${err.message}`, 'error');
    return { success: false, testOutput: `LLM error: ${err.message}`, summary: `QA agent LLM call failed: ${err.message}` };
  }

  if (!testDiff || testDiff === 'NO_CHANGES' || testDiff.startsWith('CANNOT_TEST:')) {
    const reason = testDiff?.startsWith('CANNOT_TEST:') ? testDiff.slice(12).trim() : 'No test changes generated.';
    await storage.logEvent(taskId, `[QA] Cannot generate tests: ${reason}`, 'warning');
    return { success: true, testOutput: reason, summary: `Test generation skipped: ${reason}` };
  }

  // Validate and apply test diff
  const applyResult = await applyTestDiff(taskId, testDiff, repoPath, git);
  if (!applyResult.ok) {
    await storage.logEvent(taskId, `[QA] Initial test diff failed: ${applyResult.error}`, 'warning');
    return { success: true, testOutput: `Test diff failed: ${applyResult.error}`, summary: 'Test diff could not be applied — skipped.' };
  }

  // Run tests — retry loop fixes failing tests up to MAX_QA_FIX_ITERATIONS
  let currentTestOutput = '';
  for (let iteration = 1; iteration <= MAX_QA_FIX_ITERATIONS + 1; iteration++) {
    await storage.logEvent(taskId, `[QA] Running npm test (iteration ${iteration})...`, 'info');
    const testRun = await runTests(repoPath);

    if (testRun.ok) {
      await storage.logEvent(taskId, `[QA] Tests passed on iteration ${iteration}:\n${testRun.output}`, 'success');
      return {
        success: true,
        testOutput: testRun.output,
        summary: iteration === 1
          ? 'Tests generated and passed.'
          : `Tests passed after ${iteration - 1} fix iteration(s).`,
      };
    }

    currentTestOutput = testRun.output;
    await storage.logEvent(taskId, `[QA] Tests failed on iteration ${iteration}:\n${currentTestOutput}`, 'warning');

    if (iteration > MAX_QA_FIX_ITERATIONS) break;

    // Feed failure back to LLM to fix the test file
    await storage.logEvent(taskId, `[QA] Attempting test fix (iteration ${iteration})...`, 'info');
    let fixDiff: string;
    try {
      const fixResult = await generateDiff(
        `Fix the failing tests. Failure output:\n${currentTestOutput}`,
        context,
        { model: 'claude', taskId, systemPrompt: QA_FIX_SYSTEM },
      );
      fixDiff = fixResult.diff;
    } catch (fixErr: any) {
      await storage.logEvent(taskId, `[QA] Fix LLM call failed: ${fixErr.message}`, 'error');
      break;
    }

    if (!fixDiff || fixDiff === 'NO_CHANGES' || fixDiff.trim() === 'CANNOT_FIX') {
      await storage.logEvent(taskId, '[QA] No fix diff generated or CANNOT_FIX', 'warning');
      break;
    }

    const fixApply = await applyTestDiff(taskId, fixDiff, repoPath, git);
    if (!fixApply.ok) {
      await storage.logEvent(taskId, `[QA] Fix patch failed: ${fixApply.error}`, 'warning');
      continue;
    }

    await storage.logEvent(taskId, `[QA] Fix patch applied (iteration ${iteration})`, 'success');
  }

  await storage.logEvent(taskId, `[QA] Tests still failing after ${MAX_QA_FIX_ITERATIONS} fix iteration(s)`, 'error');
  return {
    success: false,
    cannotFix: true,
    testOutput: currentTestOutput,
    summary: `Tests generated but still failing after ${MAX_QA_FIX_ITERATIONS} fix attempt(s). Manual review required.`,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function applyTestDiff(
  taskId: string, rawDiff: string, repoPath: string, git: ReturnType<typeof simpleGit>,
): Promise<{ ok: boolean; error?: string }> {
  const sanitized = sanitizeUnifiedDiff(rawDiff);
  if (!sanitized) return { ok: false, error: 'Diff failed sanitization' };

  const diff = extractDiff(sanitized);
  const validation = validateUnifiedDiffEnhanced(diff);
  if (!validation.ok) return { ok: false, error: `Validation failed: ${validation.errors.join('; ')}` };

  const applicability = validateDiffApplicability(diff, repoPath);
  if (!applicability.valid) return { ok: false, error: `Not applicable: ${applicability.error}` };

  const headSha = (await git.revparse(['HEAD'])).trim();
  const patchPath = path.join(repoPath, '.vibe-qa.patch');
  try {
    fs.writeFileSync(patchPath, diff, 'utf-8');
    await git.raw(['apply', '--verbose', '.vibe-qa.patch']);
    await storage.logEvent(taskId, '[QA] Test diff applied successfully', 'success');
    return { ok: true };
  } catch (err: any) {
    await storage.logEvent(taskId, `[QA] Failed to apply test diff — rolling back: ${err.message}`, 'warning');
    try { await git.raw(['checkout', headSha, '--', '.']); } catch { /* best effort */ }
    return { ok: false, error: `Patch apply failed: ${err.message}` };
  } finally {
    try { if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath); } catch { /* ignore */ }
  }
}

async function runTests(repoPath: string): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execAsync('npm test', {
      cwd: repoPath,
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { ok: true, output: (stdout + stderr).slice(0, 3000) };
  } catch (err: any) {
    return { ok: false, output: ((err.stdout || '') + (err.stderr || '')).slice(0, 3000) };
  }
}
