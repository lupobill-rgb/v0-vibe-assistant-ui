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
const MAX_HEAL_ITERATIONS = parseInt(process.env.MAX_HEAL_ITERATIONS || '3', 10);

const DEBUG_SYSTEM = `You are a build-error repair engine.
You receive the full repository context and an error log.
Output ONLY a valid unified diff (git diff format) that fixes the errors.
Rules:
- Fix ONLY errors shown in the log — no refactoring, no new features
- Do NOT add unrelated features or change logic unrelated to the failures
- The diff must be directly applicable via: git apply --index
- Paths in the diff must be relative to the repo root
- If you cannot fix the errors, output exactly: CANNOT_FIX`;

const HEAL_SYSTEM = `You are VIBE's self-healing component repair engine.
You receive the full repository context and a list of broken interactive components.
Output ONLY a valid unified diff (git diff format) that fixes the issues.

Rules:
- Fix exactly ONE issue per diff — the first issue in the list.
- For buttons/links with no onClick handler: add a working handler that performs the action implied by the button label (e.g. a "Filter" button should toggle a filter state).
- For empty chart sections (canvas with no data): wire up Chart.js with sample/placeholder data using the existing chart pattern in the codebase.
- For filters/configurators with no state: add useState hooks and wire onChange handlers.
- Preserve existing styling, class names, and component structure.
- The diff must be directly applicable via: git apply --index
- Paths in the diff must be relative to the repo root
- If you cannot fix the issue, output exactly: CANNOT_FIX: <reason>`;

const BUILD_COMMAND = process.env.BUILD_COMMAND || 'npm run build';

// ── Component Health Scanner ───────────────────────────────
export interface ComponentIssue {
  file: string;
  line: number;
  type: 'dead_button' | 'empty_chart' | 'dead_filter' | 'dead_input';
  description: string;
}

function scanComponentHealth(repoPath: string): ComponentIssue[] {
  const issues: ComponentIssue[] = [];
  const extensions = ['.tsx', '.jsx'];

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(fullPath); continue; }
      if (!extensions.some(ext => entry.name.endsWith(ext))) continue;

      let content: string;
      try { content = fs.readFileSync(fullPath, 'utf-8'); } catch { continue; }
      const lines = content.split('\n');
      const relPath = path.relative(repoPath, fullPath);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Dead buttons: <button without onClick (not type="submit" inside a form)
        if (/<button\b/.test(line) && !line.includes('onClick') && !line.includes('type="submit"')) {
          // Check next 3 lines for onClick (multi-line JSX)
          const chunk = lines.slice(i, i + 4).join(' ');
          if (!chunk.includes('onClick') && !chunk.includes('onSubmit') && !chunk.includes('type="submit"')) {
            issues.push({ file: relPath, line: lineNum, type: 'dead_button', description: `Button without onClick handler: ${line.trim().slice(0, 80)}` });
          }
        }

        // Dead filters: <select or <input type="range" without onChange
        if ((/<select\b/.test(line) || /input.*type=["']range["']/.test(line)) && !line.includes('onChange')) {
          const chunk = lines.slice(i, i + 4).join(' ');
          if (!chunk.includes('onChange') && !chunk.includes('onInput')) {
            const elType = /<select/.test(line) ? 'dead_filter' : 'dead_input';
            issues.push({ file: relPath, line: lineNum, type: elType, description: `Interactive element without onChange handler: ${line.trim().slice(0, 80)}` });
          }
        }

        // Empty chart: <canvas with no data setup nearby
        if (/<canvas\b/.test(line)) {
          // Check surrounding 20 lines for Chart.js initialization
          const surrounding = lines.slice(Math.max(0, i - 10), i + 10).join('\n');
          if (!surrounding.includes('new Chart') && !surrounding.includes('useEffect') && !surrounding.includes('chartRef')) {
            issues.push({ file: relPath, line: lineNum, type: 'empty_chart', description: `Canvas element with no Chart.js initialization nearby: ${line.trim().slice(0, 80)}` });
          }
        }
      }
    }
  }

  walk(repoPath);
  return issues;
}

// ── Debug Agent ────────────────────────────────────────────
export interface DebugAgentResult {
  success: boolean;
  cannotFix?: boolean;
  buildOutput: string;
  summary: string;
  iterations: number;
  healedIssues?: number;
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

      // Build passed — now run self-healing scan
      const healResult = await runSelfHealingScan(taskId, repoPath);

      return {
        success: true,
        buildOutput: output,
        summary: llmSummary || `Build fixed on iteration ${iteration}.${healResult.healed > 0 ? ` ${healResult.healed} component issue(s) auto-healed.` : ''}`,
        iterations: iteration,
        healedIssues: healResult.healed,
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

// ── Self-Healing Scan ──────────────────────────────────────
// Runs after build passes. Detects and repairs broken interactive components.

async function applyHealPatch(
  taskId: string, rawDiff: string, repoPath: string, git: ReturnType<typeof simpleGit>,
): Promise<boolean> {
  const sanitized = sanitizeUnifiedDiff(rawDiff);
  if (!sanitized) { await storage.logEvent(taskId, '[HEAL] Diff sanitization failed', 'warning'); return false; }
  const diff = extractDiff(sanitized);
  const v = validateUnifiedDiffEnhanced(diff);
  if (!v.ok) { await storage.logEvent(taskId, `[HEAL] Diff validation failed: ${v.errors.join('; ')}`, 'warning'); return false; }
  const a = validateDiffApplicability(diff, repoPath);
  if (!a.valid) { await storage.logEvent(taskId, `[HEAL] Diff not applicable: ${a.error}`, 'warning'); return false; }

  const headSha = (await git.revparse(['HEAD'])).trim();
  const patchPath = path.join(repoPath, '.vibe-heal.patch');
  try {
    fs.writeFileSync(patchPath, diff, 'utf-8');
    await git.raw(['apply', '--verbose', '.vibe-heal.patch']);
    return true;
  } catch (err: any) {
    await storage.logEvent(taskId, `[HEAL] Patch apply failed — rolling back: ${err.message}`, 'warning');
    try { await git.raw(['checkout', headSha, '--', '.']); } catch { /* best effort */ }
    return false;
  } finally {
    try { if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath); } catch { /* ignore */ }
  }
}

async function runSelfHealingScan(
  taskId: string,
  repoPath: string,
): Promise<{ healed: number; remaining: ComponentIssue[] }> {
  await storage.logEvent(taskId, '[HEAL] Running component health scan...', 'info');
  const issues = scanComponentHealth(repoPath);

  if (issues.length === 0) {
    await storage.logEvent(taskId, '[HEAL] No broken components detected', 'success');
    return { healed: 0, remaining: [] };
  }

  await storage.logEvent(taskId, `[HEAL] Found ${issues.length} issue(s): ${issues.map(i => i.type).join(', ')}`, 'warning');
  for (const issue of issues) {
    await storage.logEvent(taskId, `[HEAL]   ${issue.file}:${issue.line} — ${issue.description}`, 'warning');
  }

  const git = simpleGit(repoPath);
  let healed = 0;
  const remaining: ComponentIssue[] = [];

  for (const issue of issues.slice(0, MAX_HEAL_ITERATIONS)) {
    await storage.logEvent(taskId, `[HEAL] Healing: ${issue.file}:${issue.line} (${issue.type})`, 'info');

    const contextResult = await buildContext(repoPath, `Fix broken component in ${issue.file}`);
    const context = formatContext(contextResult.files);
    const issueDesc = `FILE: ${issue.file}\nLINE: ${issue.line}\nTYPE: ${issue.type}\nDESCRIPTION: ${issue.description}`;

    let fixDiff: string;
    try {
      const result = await generateDiff(
        `Fix this broken interactive component:\n${issueDesc}`,
        context,
        { model: 'claude', taskId, systemPrompt: HEAL_SYSTEM },
      );
      fixDiff = result.diff;
    } catch (err: any) {
      await storage.logEvent(taskId, `[HEAL] LLM call failed for ${issue.file}: ${err.message}`, 'error');
      remaining.push(issue);
      continue;
    }

    if (!fixDiff || fixDiff === 'NO_CHANGES' || fixDiff.startsWith('CANNOT_FIX:')) {
      const reason = fixDiff?.startsWith('CANNOT_FIX:') ? fixDiff.slice(11).trim() : 'No fix generated.';
      await storage.logEvent(taskId, `[HEAL] Cannot fix ${issue.file}:${issue.line}: ${reason}`, 'warning');
      remaining.push(issue);
      continue;
    }

    const applied = await applyHealPatch(taskId, fixDiff, repoPath, git);
    if (applied) {
      // Verify the fix didn't break the build
      try {
        await execAsync(BUILD_COMMAND, { cwd: repoPath, timeout: 300000, maxBuffer: 10 * 1024 * 1024 });
        await storage.logEvent(taskId, `[HEAL] Fixed and verified: ${issue.file}:${issue.line}`, 'success');
        healed++;
      } catch (err: any) {
        await storage.logEvent(taskId, `[HEAL] Fix broke the build — rolling back: ${issue.file}:${issue.line}`, 'warning');
        const headSha = (await git.revparse(['HEAD'])).trim();
        try { await git.raw(['checkout', headSha, '--', '.']); } catch { /* best effort */ }
        remaining.push(issue);
      }
    } else {
      remaining.push(issue);
    }
  }

  // Report any issues beyond MAX_HEAL_ITERATIONS as remaining
  if (issues.length > MAX_HEAL_ITERATIONS) {
    remaining.push(...issues.slice(MAX_HEAL_ITERATIONS));
  }

  const summary = healed > 0
    ? `${healed} of ${issues.length} component issue(s) auto-healed.`
    : `${issues.length} component issue(s) detected but could not be auto-healed.`;
  await storage.logEvent(taskId, `[HEAL] ${summary}`, healed > 0 ? 'success' : 'warning');

  return { healed, remaining };
}

// Export for standalone use (e.g., from pipeline)
export { scanComponentHealth, runSelfHealingScan };
