import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import { storage } from '../storage';
import { generateDiff, callEdgeFunction } from '../llm-router';
import { buildContext, formatContext } from '../context-builder';
import {
  sanitizeUnifiedDiff,
  extractDiff,
  validateUnifiedDiffEnhanced,
  validateDiffApplicability,
} from '../diff-validator';

export interface UxAgentResult {
  passed: string[];
  failed: string[];
  fixed: string[];
  cannotFix: string[];
}

const UX_CHECK_SYSTEM = `You are a UX code reviewer. Analyze the provided codebase context and evaluate these four areas:

1. Responsive breakpoints — Are mobile/tablet/desktop breakpoints properly implemented using media queries or responsive utility classes?
2. Empty states — Are empty states handled with appropriate UI (messages, placeholders, or illustrations) for lists and async data?
3. Loading states — Are loading/skeleton/spinner states implemented for async operations and data fetches?
4. Consistent spacing — Is spacing consistent, using a design system, CSS variables, or utility classes (e.g., Tailwind)?

Respond ONLY with a JSON object — no markdown, no prose, no code fences:
{"passed": ["description of each passing check"], "failed": ["description of each failing check"]}`;

const UX_FIX_SYSTEM = `You are a UX fix engine.
Given a specific UX issue and the relevant code context, output ONLY a valid unified diff that fixes the issue.
Rules:
- Fix ONLY the specific issue described — no other changes
- Do NOT refactor, rename, or restructure unrelated code
- The diff must be directly applicable via: git apply --index
- Paths in the diff must be relative to the repo root
- If you cannot fix the issue, output exactly: CANNOT_FIX`;

export async function runUxAgent(taskId: string, repoPath: string): Promise<UxAgentResult> {
  await storage.logEvent(taskId, '[UX] Starting UX agent', 'info');

  const contextResult = await buildContext(repoPath, 'UX review: responsive breakpoints, empty states, loading states, consistent spacing');
  const context = formatContext(contextResult.files);

  // Structured JSON check via Edge Function
  let report: { passed: string[]; failed: string[] };
  try {
    const data = await callEdgeFunction({
      prompt: context,
      model: 'claude',
      system: UX_CHECK_SYSTEM,
      max_tokens: 1024,
    });
    const text = data.diff || '';
    report = JSON.parse(text);
    if (!Array.isArray(report.passed) || !Array.isArray(report.failed)) {
      throw new Error('Unexpected JSON shape from LLM');
    }
  } catch (err: any) {
    await storage.logEvent(taskId, `[UX] LLM check failed: ${err.message}`, 'error');
    return { passed: [], failed: [], fixed: [], cannotFix: [] };
  }

  await storage.logEvent(taskId, `[UX] Report: ${report.passed.length} passed, ${report.failed.length} failed`, 'info');
  for (const p of report.passed) {
    await storage.logEvent(taskId, `[UX] PASS: ${p}`, 'success');
  }
  for (const f of report.failed) {
    await storage.logEvent(taskId, `[UX] FAIL: ${f}`, 'warning');
  }

  if (report.failed.length === 0) {
    await storage.logEvent(taskId, '[UX] All UX checks passed', 'success');
    return { passed: report.passed, failed: [], fixed: [], cannotFix: [] };
  }

  // Per-issue fix loop
  const git = simpleGit(repoPath);
  const fixed: string[] = [];
  const cannotFix: string[] = [];

  for (const issue of report.failed) {
    await storage.logEvent(taskId, `[UX] Attempting fix: ${issue.slice(0, 80)}`, 'info');

    // Rebuild context for each fix (repo may have changed from previous fixes)
    const fixContext = formatContext((await buildContext(repoPath, `Fix UX issue: ${issue}`)).files);
    const fixPrompt = `Fix this specific UX issue:\n${issue}\n\nGenerate a unified diff that addresses this issue.`;

    let fixDiff: string;
    try {
      const result = await generateDiff(fixPrompt, fixContext, { model: 'claude', taskId });
      fixDiff = result.diff;
    } catch (err: any) {
      await storage.logEvent(taskId, `[UX] Fix LLM call failed: ${err.message}`, 'error');
      cannotFix.push(issue);
      continue;
    }

    // Check for CANNOT_FIX signal
    if (!fixDiff || fixDiff === 'NO_CHANGES' || fixDiff.trim() === 'CANNOT_FIX') {
      await storage.logEvent(taskId, `[UX] LLM signalled CANNOT_FIX for issue`, 'warning');
      cannotFix.push(issue);
      continue;
    }

    // Validate fix diff
    const sanitized = sanitizeUnifiedDiff(fixDiff);
    if (!sanitized) {
      await storage.logEvent(taskId, '[UX] Fix diff failed sanitization', 'warning');
      cannotFix.push(issue);
      continue;
    }

    const diff = extractDiff(sanitized);
    const validation = validateUnifiedDiffEnhanced(diff);
    if (!validation.ok) {
      await storage.logEvent(taskId, `[UX] Fix diff validation failed: ${validation.errors.join('; ')}`, 'warning');
      cannotFix.push(issue);
      continue;
    }

    const applicability = validateDiffApplicability(diff, repoPath);
    if (!applicability.valid) {
      await storage.logEvent(taskId, `[UX] Fix diff not applicable: ${applicability.error}`, 'warning');
      cannotFix.push(issue);
      continue;
    }

    // Apply fix diff
    const patchPath = path.join(repoPath, '.vibe-ux.patch');
    try {
      fs.writeFileSync(patchPath, diff, 'utf-8');
      await git.raw(['apply', '--verbose', '.vibe-ux.patch']);
      await storage.logEvent(taskId, `[UX] Fix applied: ${issue.slice(0, 60)}`, 'success');
      fixed.push(issue);
    } catch (err: any) {
      await storage.logEvent(taskId, `[UX] Failed to apply fix, rolling back: ${err.message}`, 'warning');
      // Git rollback on failed application
      try {
        await git.checkout(['--', '.']);
      } catch { /* ignore rollback errors */ }
      cannotFix.push(issue);
    } finally {
      try { if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath); } catch { /* ignore */ }
    }
  }

  if (cannotFix.length > 0) {
    await storage.logEvent(taskId, `[UX] CANNOT_FIX: ${cannotFix.length} issue(s) could not be auto-fixed`, 'warning');
  }
  if (fixed.length > 0) {
    await storage.logEvent(taskId, `[UX] Fixed ${fixed.length}/${report.failed.length} issue(s)`, 'success');
  }

  const stillFailed = report.failed.filter((f) => !fixed.includes(f) && !cannotFix.includes(f));
  return { passed: report.passed, failed: stillFailed, fixed, cannotFix };
}
