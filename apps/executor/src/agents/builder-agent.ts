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
import { readProjectSchema } from '../schema-reader';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
const BUILD_COMMAND = process.env.BUILD_COMMAND || 'npm run build';
const BUILD_TIMEOUT = parseInt(process.env.BUILD_TIMEOUT_MS || '300000', 10);
const BUILDER_SYSTEM = `You are VIBE's Builder Agent. You own code generation quality end-to-end — both engineering correctness AND visual excellence.

ENGINEERING RULES:
- Output one atomic unified diff. Single file only. Max 200 lines.
- Never rewrite whole files. Smallest change that fully satisfies the task.
- Never introduce new dependencies without adding them to package.json.
- Never leave TODO comments or placeholder implementations.
- Match existing code style, naming conventions, and patterns.
- Never break existing exports, interfaces, or function signatures unless explicitly required.
- If ambiguous, implement the most conservative interpretation that satisfies the requirement.

UI RULES — MANDATORY FOR EVERY FILE THAT TOUCHES THE FRONTEND (UbiVibe brand):
- Background: #0A0E17 (Deep) base, #0F1420 (Surface) for cards/panels. Never white. Never light grey. Never browser default.
- Vibe Core: #00E5A0 (green primary). Signal: #00B4D8 (cyan highlights). Autonomy: #7B61FF (violet accents). Text: #E8ECF4 (Light).
- Headings: Syne always (700-800). Body: Inter always. Load both via Google Fonts on every page.
- Heroes: gradient background always — linear-gradient(135deg, #00E5A0 0%, #00B4D8 50%, #7B61FF 100%). Never flat.
- Primary buttons: gradient from #00E5A0 to #7B61FF, hover lifts with glow shadow. Never flat.
- Cards: bg-[#0F1420] border border-[#1a2030] hover:border-[#00E5A0]/50 rounded-2xl.
- Navbar: sticky top-0 bg-[#0A0E17]/80 backdrop-blur-md border-b border-[#1a2030].
- Inputs: bg-[#0F1420] border-[#1a2030] focus:border-[#00E5A0] focus:ring-[#00E5A0]/20 rounded-xl.
- Layout: max-w-7xl mx-auto always. Section padding py-24 minimum.
- Responsive: every component mobile-first with sm: md: lg: prefixes throughout.
- Landing pages must include: navbar, hero, trust bar, features, social proof, stats, CTA, footer.
- Dashboards must include: sidebar, topbar, stat cards, main content area, empty states.
- If the output looks like a browser default or generic template, it is wrong. Fix it before submitting.
- Every page must include: <nav> element, at least one <h1>, minimum 2 <section> elements, a <title> tag, and a <meta name="description"> tag.
- CTA buttons must use <button> or <a> tags containing one of these words: Start, Get, Contact, Book, Learn.
- Multi-page sites: every page must link to every other page via <a href="pagename.html">.
- Never use lorem ipsum text under any circumstances.

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
  projectId?: string,
): Promise<BuilderAgentResult> {
  await storage.logEvent(taskId, `[BUILDER] Starting builder agent — ${tasks.length} task(s)`, 'info');
  const git = simpleGit(repoPath);
  const diffsApplied: string[] = [];

  // Read existing Supabase schema once (shared across all tasks)
  let schemaBlock = '';
  if (projectId) {
    try {
      const schema = await readProjectSchema(projectId);
      if (schema && schema.formatted) {
        schemaBlock = schema.formatted;
        await storage.logEvent(taskId, `[BUILDER] Schema loaded: ${schema.tables.length} table(s), ${schema.policies.length} RLS policy/policies`, 'info');
      } else {
        await storage.logEvent(taskId, '[BUILDER] No Supabase connection or empty schema — skipping schema context', 'info');
      }
    } catch (err: any) {
      await storage.logEvent(taskId, `[BUILDER] Schema read failed (non-fatal): ${err.message}`, 'warning');
    }
  }

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    await storage.logEvent(taskId, `[BUILDER] Task ${i + 1}/${tasks.length}: ${task.slice(0, 80)}`, 'info');
    // Snapshot HEAD before this task — enables per-task rollback
    const headSha = (await git.revparse(['HEAD'])).trim();
    // Build context fresh for each task — picks up prior diffs
    const ctxResult = await buildContext(repoPath, task);
    let context = formatContext(ctxResult.files);
    // Prepend schema context so the LLM knows existing tables/RLS
    if (schemaBlock) {
      context = schemaBlock + '\n' + context;
    }
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
      diffsApplied.push(extracted);
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
  }
  // Build check once after all tasks — avoids N redundant builds
  if (diffsApplied.length > 0) {
    await storage.logEvent(taskId, `[BUILDER] Verifying build after ${diffsApplied.length} task(s): ${BUILD_COMMAND}`, 'info');
    try {
      const { stdout, stderr } = await execAsync(BUILD_COMMAND, {
        cwd: repoPath,
        timeout: BUILD_TIMEOUT,
        maxBuffer: 10 * 1024 * 1024,
      });
      const output = (stdout + stderr).slice(0, 500);
      await storage.logEvent(taskId, `[BUILDER] Build passed:\n${output}`, 'success');
    } catch (err: any) {
      const output = ((err.stdout || '') + (err.stderr || '')).slice(0, 500);
      await storage.logEvent(taskId, `[BUILDER] Build failed after all tasks:\n${output}`, 'error');
      return {
        success: false,
        diffsApplied: diffsApplied.length,
        summary: `Build failed after applying ${diffsApplied.length} task(s). Last error: ${output.slice(0, 200)}`,
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
