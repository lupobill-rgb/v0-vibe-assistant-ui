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
const MAX_QA_RETRIES = 3;

export interface QaAgentResult {
  success: boolean;
  cannotFix: boolean;
  testOutput: string;
  fixes: string[];
}

const QA_SYSTEM = `You are a test generation engine.
Given changed source files and codebase context, generate test files using ONLY the Node.js built-in test runner.
Output ONLY a valid unified diff creating or updating test files.
Rules:
- Import: import { describe, it, before, after } from 'node:test'
- Import: import assert from 'node:assert'
- Do NOT use Jest, Mocha, or any third-party test framework
- Place test files alongside the source with a .test.ts extension
- The diff must be directly applicable via: git apply --index
- Paths in the diff must be relative to the repo root
- If no tests are needed, output exactly: NO_CHANGES`;

const QA_FIX_SYSTEM = `You are a test repair engine.
Given failing test output and codebase context, fix the test failures.
Output ONLY a valid unified diff that fixes the failing tests.
Rules:
- Fix ONLY the test failures shown in the error log — no refactoring
- Do NOT change application source code — only modify test files
- The diff must be directly applicable via: git apply --index
- Paths in the diff must be relative to the repo root
- If you cannot fix the tests, output exactly: CANNOT_FIX`;

export async function runQaAgent(taskId: string, repoPath: string): Promise<QaAgentResult> {
  await storage.logEvent(taskId, '[QA] Starting QA agent', 'info');

  const git = simpleGit(repoPath);
  const fixes: string[] = [];

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
    return { success: true, cannotFix: false, testOutput: 'No changed source files', fixes };
  }

  // Build context focused on changed files
  const contextResult = await buildContext(repoPath, `Generate tests for changed files: ${changedFiles.join(', ')}`);
  const context = formatContext(contextResult.files);

  const prompt = `Generate a test file for the following changed source files: ${changedFiles.join(', ')}.
Place the test file alongside the first changed source file with a .test.ts extension.`;

  await storage.logEvent(taskId, '[QA] Calling LLM to generate test diff...', 'info');

  let testDiff: string;
  try {
    const result = await generateDiff(prompt, context, { model: 'claude', taskId });
    testDiff = result.diff;
    await storage.logEvent(taskId, `[QA] LLM generated test diff (${testDiff.length} chars)`, 'info');
  } catch (err: any) {
    await storage.logEvent(taskId, `[QA] LLM call failed: ${err.message}`, 'error');
    return { success: false, cannotFix: false, testOutput: `LLM error: ${err.message}`, fixes };
  }

  if (!testDiff || testDiff === 'NO_CHANGES') {
    await storage.logEvent(taskId, '[QA] LLM produced no test diff, skipping', 'warning');
    return { success: true, cannotFix: false, testOutput: 'LLM indicated no test changes needed', fixes };
  }

  // Validate and apply initial test diff
  const applyResult = await applyTestDiff(taskId, testDiff, repoPath, git);
  if (!applyResult.ok) {
    await storage.logEvent(taskId, `[QA] Initial test diff failed: ${applyResult.error}`, 'warning');
    return { success: true, cannotFix: false, testOutput: `Test diff failed: ${applyResult.error}`, fixes };
  }

  // Run tests — if they pass, we're done
  const initialRun = await runTests(repoPath);
  if (initialRun.ok) {
    await storage.logEvent(taskId, `[QA] Tests passed on first attempt`, 'success');
    return { success: true, cannotFix: false, testOutput: initialRun.output, fixes };
  }

  await storage.logEvent(taskId, '[QA] Tests failed, entering fix loop', 'warning');

  // Test-fix retry loop
  let lastError = initialRun.output;
  for (let attempt = 1; attempt <= MAX_QA_RETRIES; attempt++) {
    await storage.logEvent(taskId, `[QA] Fix attempt ${attempt}/${MAX_QA_RETRIES}`, 'info');

    // Rollback before retry
    try {
      await git.checkout(['--', '.']);
      await storage.logEvent(taskId, '[QA] Rolled back working tree', 'info');
    } catch (err: any) {
      await storage.logEvent(taskId, `[QA] Rollback warning: ${err.message}`, 'warning');
    }

    // Rebuild context with error output
    const fixContext = formatContext((await buildContext(repoPath, 'Fix failing tests')).files);
    const enriched = `${fixContext}\n\n---\n\nTEST ERROR OUTPUT:\n${lastError.slice(0, 5000)}`;

    const fixPrompt = `The generated tests are failing. Analyze the test error output and generate a unified diff that fixes the test failures.`;

    let fixDiff: string;
    try {
      const result = await generateDiff(fixPrompt, enriched, { model: 'claude', taskId });
      fixDiff = result.diff;
    } catch (err: any) {
      await storage.logEvent(taskId, `[QA] Fix LLM call failed: ${err.message}`, 'error');
      lastError = `LLM error: ${err.message}`;
      continue;
    }

    // Check for CANNOT_FIX signal
    if (!fixDiff || fixDiff === 'NO_CHANGES' || fixDiff.trim() === 'CANNOT_FIX') {
      await storage.logEvent(taskId, '[QA] LLM signalled CANNOT_FIX', 'warning');
      return { success: false, cannotFix: true, testOutput: lastError, fixes };
    }

    const applyResult = await applyTestDiff(taskId, fixDiff, repoPath, git);
    if (!applyResult.ok) {
      await storage.logEvent(taskId, `[QA] Fix diff failed: ${applyResult.error}`, 'warning');
      lastError = `Fix diff failed: ${applyResult.error}`;
      continue;
    }

    const testRun = await runTests(repoPath);
    if (testRun.ok) {
      fixes.push(`Attempt ${attempt}: fixed test failures`);
      await storage.logEvent(taskId, `[QA] Tests passed after fix attempt ${attempt}`, 'success');
      return { success: true, cannotFix: false, testOutput: testRun.output, fixes };
    }

    lastError = testRun.output;
    await storage.logEvent(taskId, `[QA] Tests still failing after attempt ${attempt}`, 'error');
  }

  await storage.logEvent(taskId, `[QA] Exhausted ${MAX_QA_RETRIES} retries — CANNOT_FIX`, 'error');

  // Final rollback
  try {
    await git.checkout(['--', '.']);
  } catch { /* ignore */ }

  return { success: false, cannotFix: true, testOutput: lastError, fixes };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function applyTestDiff(
  taskId: string, rawDiff: string, repoPath: string, git: ReturnType<typeof simpleGit>
): Promise<{ ok: boolean; error?: string }> {
  const sanitized = sanitizeUnifiedDiff(rawDiff);
  if (!sanitized) return { ok: false, error: 'Diff failed sanitization' };

  const diff = extractDiff(sanitized);
  const validation = validateUnifiedDiffEnhanced(diff);
  if (!validation.ok) return { ok: false, error: `Validation: ${validation.errors.join('; ')}` };

  const applicability = validateDiffApplicability(diff, repoPath);
  if (!applicability.valid) return { ok: false, error: `Not applicable: ${applicability.error}` };

  const patchPath = path.join(repoPath, '.vibe-qa.patch');
  try {
    fs.writeFileSync(patchPath, diff, 'utf-8');
    await git.raw(['apply', '--verbose', '.vibe-qa.patch']);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
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
    return { ok: true, output: ((stdout || '') + (stderr || '')).slice(0, 3000) };
  } catch (err: any) {
    return { ok: false, output: ((err.stdout || '') + (err.stderr || '')).slice(0, 3000) };
  }
}
