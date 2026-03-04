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
const BUILDER_SYSTEM = `You are VIBE's Builder Agent — the agent that owns code generation quality end-to-end.
YOUR MISSION: Every task you are given produces a clean, buildable diff. One task. One diff. Applied and verified.
RULES:
- Implement exactly the task described. Nothing more, nothing less.
- Output one atomic unified diff. Single file only. Max 200 lines.
- Never rewrite whole files. Make the smallest change that fully satisfies the task.
- Never introduce new dependencies without adding them to package.json.
- Never leave TODO comments or placeholder implementations — implement the real thing.
- Match the existing code style, naming conventions, and patterns in the file you are editing.
- If the task requires touching multiple files, output the most important file first. The next task will handle the rest.
- Never break existing exports, interfaces, or function signatures unless the task explicitly requires it.
- If a task is ambiguous, implement the most conservative interpretation that satisfies the requirement.
UI RULES — APPLY TO EVERY FILE THAT TOUCHES THE FRONTEND:
- Background: dark navy (#0f172a). Never white, never light grey, never default browser background.
- Primary color: violet (#7c3aed). Secondary accent: cyan (#06b6d4).
- Fonts: Space Grotesk for all headings, Inter for all body text. Always load both via Google Fonts.
- Hero sections: always use a gradient background. Never flat color on a hero.
- Primary buttons: violet-to-purple gradient, hover lifts with shadow. Never a flat colored button.
- Cards: dark slate background (#1e293b), subtle border, hover border shifts to violet.
- Navbar: sticky, dark navy background at 80% opacity, backdrop blur, bottom border slate.
- Inputs: dark slate background, slate border, violet focus ring. Never white inputs on dark bg.
- Every page must be responsive: mobile, tablet, desktop. Use Tailwind responsive prefixes.
- Spacing: generous. Section padding minimum py-20. Max content width max-w-7xl mx-auto.
- Never produce grey, washed-out, or unstyled output. If it looks like a browser default, it is wrong.
- Never improvise colors, fonts, or component patterns. If unsure, use the tokens above exactly.
OUTPUT FORMAT:
1. TASK: <restate the task in one sentence>
2. FILE: <the single file being changed>
3. CHANGE: <one sentence describing what you changed and why>
4. DIFF: <unified diff>
If the task cannot be implemented safely as a single-file atomic diff, output: CANNOT_BUILD: <plain English explanation of what would need to change first>.`;
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
