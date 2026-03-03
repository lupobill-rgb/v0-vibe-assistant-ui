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
import { DESIGN_PHASE } from '../templates/design-phases';

export interface UxAgentResult {
  passed: string[];
  failed: string[];
  fixed: string[];
  summary: string;
}

const UX_CHECK_SYSTEM = `You are a UX code reviewer. Analyze the provided codebase context and evaluate these four areas:

1. Responsive breakpoints — Are mobile/tablet/desktop breakpoints properly implemented using media queries or responsive utility classes?
2. Empty states — Are empty states handled with appropriate UI (messages, placeholders, or illustrations) for lists and async data?
3. Loading states — Are loading/skeleton/spinner states implemented for async operations and data fetches?
4. Consistent spacing — Is spacing consistent, using a design system, CSS variables, or utility classes (e.g., Tailwind)?

Respond ONLY with a JSON object — no markdown, no prose, no code fences:
{"passed": ["description of each passing check"], "failed": ["description of each failing check"]}
${DESIGN_PHASE.VISUAL_SYSTEM}`;

const UX_FIX_SYSTEM = `You are VIBE's UX Agent — the agent that owns visual consistency and user experience quality end-to-end.

YOUR MISSION: Every UX issue you are given must be resolved. One issue. One diff. Completely fixed.

RULES:
- Fix exactly the one UX issue described. Nothing more.
- Output one atomic unified diff. Single file only. Max 200 lines.
- Never rewrite whole files. Never change logic unrelated to the UX issue.
- For responsive issues: add the missing breakpoints using the project's existing CSS approach (Tailwind, CSS modules, or media queries — match what's already used).
- For empty states: add a visible, on-brand placeholder — not a hidden div, not a console.log.
- For loading states: add a spinner or skeleton that matches the project's existing component patterns.
- For spacing issues: align to the existing spacing scale — do not introduce new values.

OUTPUT FORMAT:
1. ISSUE: <restate the issue in one sentence>
2. FIX: <one sentence describing what you changed>
3. DIFF: <unified diff>

If you cannot fix the issue without a larger refactor, output: CANNOT_FIX: <plain English explanation>.`;

const MAX_FIX_ATTEMPTS = 2;

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
    return { passed: [], failed: [], fixed: [], summary: `UX check failed: ${err.message}` };
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
    return {
      passed: report.passed,
      failed: [],
      fixed: [],
      summary: `All ${report.passed.length} UX check(s) passed.`,
    };
  }

  // Fix each failed issue individually — one diff per issue, up to MAX_FIX_ATTEMPTS each
  const fixed: string[] = [];
  const git = simpleGit(repoPath);

  for (const issue of report.failed) {
    await storage.logEvent(taskId, `[UX] Attempting fix for: ${issue}`, 'info');
    let fixApplied = false;

    for (let attempt = 1; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
      await storage.logEvent(taskId, `[UX] Fix attempt ${attempt}/${MAX_FIX_ATTEMPTS} for: ${issue}`, 'info');

      let fixDiff: string;
      try {
        const result = await generateDiff(
          `Fix this UX issue: ${issue}`,
          context,
          { model: 'claude', taskId, systemPrompt: UX_FIX_SYSTEM }
        );
        fixDiff = result.diff;
      } catch (err: any) {
        await storage.logEvent(taskId, `[UX] LLM call failed for issue: ${err.message}`, 'error');
        break;
      }

      if (!fixDiff || fixDiff === 'NO_CHANGES' || fixDiff.startsWith('CANNOT_FIX:')) {
        const reason = fixDiff?.startsWith('CANNOT_FIX:') ? fixDiff.slice(11).trim() : 'No changes generated.';
        await storage.logEvent(taskId, `[UX] Cannot fix: ${reason}`, 'warning');
        break;
      }

      const sanitized = sanitizeUnifiedDiff(fixDiff);
      if (!sanitized) {
        await storage.logEvent(taskId, `[UX] Diff sanitization failed (attempt ${attempt})`, 'warning');
        continue;
      }

      const diff = extractDiff(sanitized);
      const validation = validateUnifiedDiffEnhanced(diff);
      if (!validation.ok) {
        await storage.logEvent(taskId, `[UX] Diff validation failed (attempt ${attempt}): ${validation.errors.join('; ')}`, 'warning');
        continue;
      }

      const applicability = validateDiffApplicability(diff, repoPath);
      if (!applicability.valid) {
        await storage.logEvent(taskId, `[UX] Diff not applicable (attempt ${attempt}): ${applicability.error}`, 'warning');
        continue;
      }

      // Snapshot HEAD for rollback
      const headSha = (await git.revparse(['HEAD'])).trim();
      const patchPath = path.join(repoPath, '.vibe-ux.patch');
      try {
        fs.writeFileSync(patchPath, diff, 'utf-8');
        await git.raw(['apply', '--verbose', '.vibe-ux.patch']);
        await storage.logEvent(taskId, `[UX] Fixed: ${issue}`, 'success');
        fixed.push(issue);
        fixApplied = true;
        break;
      } catch (err: any) {
        await storage.logEvent(taskId, `[UX] Patch failed (attempt ${attempt}) — rolling back: ${err.message}`, 'warning');
        try { await git.raw(['checkout', headSha, '--', '.']); } catch { /* best effort */ }
      } finally {
        try { if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath); } catch { /* ignore */ }
      }
    }

    if (!fixApplied) {
      await storage.logEvent(taskId, `[UX] Could not fix: ${issue}`, 'warning');
    }
  }

  const stillFailed = report.failed.filter((f) => !fixed.includes(f));

  const summary = fixed.length === report.failed.length
    ? `All ${report.failed.length} UX issue(s) fixed automatically.`
    : `${fixed.length} of ${report.failed.length} UX issue(s) fixed. ${stillFailed.length} require manual attention: ${stillFailed.join('; ')}`;

  return { passed: report.passed, failed: stillFailed, fixed, summary };
}
