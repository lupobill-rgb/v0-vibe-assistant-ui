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
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
const BUILD_COMMAND = process.env.BUILD_COMMAND || 'npm run build';
const BUILDER_SYSTEM = `You are VIBE's Builder Agent. You own code generation quality end-to-end — both engineering correctness AND visual excellence.  ENGINEERING RULES: - Output one atomic unified diff. Single file only. Max 200 lines. - Never rewrite whole files. Smallest change that fully satisfies the task. - Never introduce new dependencies without adding them to package.json. - Never leave TODO comments or placeholder implementations. - Match existing code style, naming conventions, and patterns. - Never break existing exports, interfaces, or function signatures unless explicitly required. - If ambiguous, implement the most conservative interpretation that satisfies the requirement.  UI RULES — MANDATORY FOR EVERY FILE THAT TOUCHES THE FRONTEND: - Background: #020617 base, #0f172a for surfaces. Never white. Never light grey. Never browser default. - Primary: violet #7c3aed. Accent: cyan #06b6d4. These are the only brand colors. - Headings: Space Grotesk always. Body: Inter always. Load both via Google Fonts on every page. - Heroes: gradient background always — from-slate-950 via-violet-950/30 to-slate-950. Never flat. - Primary buttons: gradient from-violet-600 to-purple-600, hover lifts with violet shadow. Never flat. - Cards: bg-slate-900 border border-slate-800 hover:border-violet-500/50 rounded-2xl. - Navbar: sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50. - Inputs: bg-slate-900 border-slate-700 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl. - Layout: max-w-7xl mx-auto always. Section padding py-24 minimum. - Responsive: every component mobile-first with sm: md: lg: prefixes throughout. - Landing pages must include: navbar, hero, trust bar, features, social proof, stats, CTA, footer. - Dashboards must include: sidebar, topbar, stat cards, main content area, empty states. - If the output looks like a browser default or generic template, it is wrong. Fix it before submitting.  OUTPUT FORMAT: 1. TASK: <restate the task in one sentence> 2. FILE: <the single file being changed> 3. CHANGE: <one sentence describing what you changed and why> 4. DIFF: <unified diff>  If the task cannot be implemented safely as a single-file atomic diff, output: CANNOT_BUILD: <plain English explanation of what would need to change first>.`;
export interface BuilderAgentResult {
  success: boolean;
  diffsApplied: number;
  summary: string;
  failedTask?: string;
}
export async function runBuilderAgent(
  taskId: string,
  repoPath: string,
  tasks: string[],
): Promise<BuilderAgentResult> {
  await storage.logEvent(taskId, `[BUILDER] Starting builder agent — ${tasks.length} task(s)`, 'info');
  const git = simpleGit(repoPath);
  const diffsApplied: string[] = [];
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    await storage.logEvent(taskId, `[BUILDER] Task ${i + 1}/${tasks.length}: ${task.slice(0, 80)}`, 'info');
    // Snapshot HEAD before this task — enables per-task rollback
    const headSha = (await git.revparse(['HEAD'])).trim();
    // Build context fresh for each task — picks up prior diffs
    const ctxResult = await buildContext(repoPath, task);
    const context = formatContext(ctxResult.files);
    // Generate diff
    let diff: string;
    try {
      const result = await generateDiff(task, context, {
        model: 'claude',
        taskId,
        systemPrompt: BUILDER_SYSTEM,
      });
      diff = result.diff;
    } catch (err: any) {
      await storage.logEvent(taskId, `[BUILDER] LLM call failed on task ${i + 1}: ${err.message}`, 'error');
      return {
        success: false,
        diffsApplied: diffsApplied.length,
        summary: `LLM call failed on task ${i + 1} of ${tasks.length}: ${err.message}`,
        failedTask: task,
      };
    }
    // CANNOT_BUILD signal — agent cannot safely implement this task
    if (!diff || diff === 'NO_CHANGES') {
      await storage.logEvent(taskId, `[BUILDER] Task ${i + 1} produced no changes — skipping`, 'warning');
      continue;
    }
    if (diff.startsWith('CANNOT_BUILD:')) {
      const reason = diff.slice(13).trim();
      await storage.logEvent(taskId, `[BUILDER] Task ${i + 1} cannot build: ${reason}`, 'warning');
      // Non-fatal — log and continue to next task
      continue;
    }
    // Validate diff
    const sanitized = sanitizeUnifiedDiff(diff);
    if (!sanitized) {
      await storage.logEvent(taskId, `[BUILDER] Task ${i + 1} diff failed sanitization — skipping`, 'warning');
      continue;
    }
    const extracted = extractDiff(sanitized);
    const validation = validateUnifiedDiffEnhanced(extracted);
    if (!validation.ok) {
      await storage.logEvent(taskId, `[BUILDER] Task ${i + 1} diff validation failed: ${validation.errors.join('; ')}`, 'warning');
      continue;
    }
    const applicability = validateDiffApplicability(extracted, repoPath);
    if (!applicability.valid) {
      await storage.logEvent(taskId, `[BUILDER] Task ${i + 1} diff not applicable: ${applicability.error}`, 'warning');
      continue;
    }
    // Apply patch — rollback to headSha on failure
    const patchPath = path.join(repoPath, '.vibe-builder.patch');
    try {
      fs.writeFileSync(patchPath, extracted, 'utf-8');
      await git.raw(['apply', '--verbose', '.vibe-builder.patch']);
      await storage.logEvent(taskId, `[BUILDER] Task ${i + 1} patch applied`, 'success');
    } catch (err: any) {
      await storage.logEvent(taskId, `[BUILDER] Task ${i + 1} patch failed — rolling back to ${headSha}: ${err.message}`, 'error');
      try { await git.raw(['checkout', headSha, '--', '.']); } catch { /* best effort */ }
      return {
        success: false,
        diffsApplied: diffsApplied.length,
        summary: `Patch apply failed on task ${i + 1} of ${tasks.length}: ${task.slice(0, 100)}`,
        failedTask: task,
      };
    } finally {
      try { if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath); } catch { /* ignore */ }
    }
    // Build check after every task — catch regressions immediately
    await storage.logEvent(taskId, `[BUILDER] Task ${i + 1} verifying build: ${BUILD_COMMAND}`, 'info');
    try {
      const { stdout, stderr } = await execAsync(BUILD_COMMAND, {
        cwd: repoPath,
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024,
      });
      const output = (stdout + stderr).slice(0, 500);
      await storage.logEvent(taskId, `[BUILDER] Task ${i + 1} build passed:\n${output}`, 'success');
      diffsApplied.push(extracted);
    } catch (err: any) {
      const output = ((err.stdout || '') + (err.stderr || '')).slice(0, 500);
      await storage.logEvent(taskId, `[BUILDER] Task ${i + 1} build failed — rolling back to ${headSha}:\n${output}`, 'error');
      try { await git.raw(['checkout', headSha, '--', '.']); } catch { /* best effort */ }
      return {
        success: false,
        diffsApplied: diffsApplied.length,
        summary: `Build failed after task ${i + 1} of ${tasks.length}: ${task.slice(0, 100)}. Last error: ${output.slice(0, 200)}`,
        failedTask: task,
      };
    }
  }
  const summary = diffsApplied.length === 0
    ? 'No changes applied — all tasks skipped or produced no diff.'
    : `${diffsApplied.length} of ${tasks.length} task(s) applied and verified.`;
  const success = diffsApplied.length > 0;
  await storage.logEvent(taskId, `[BUILDER] Complete: ${summary}`, success ? 'success' : 'warning');
  return {
    success,
    diffsApplied: diffsApplied.length,
    summary,
  };
}
