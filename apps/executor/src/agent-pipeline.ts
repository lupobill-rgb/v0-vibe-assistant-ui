import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import { storage } from './storage';
import { generateDiff, callEdgeFunction } from './llm-router';
import { buildContext, formatContext } from './context-builder';
import { sanitizeUnifiedDiff, extractDiff, validateUnifiedDiffEnhanced, validateDiffApplicability } from './diff-validator';
import { runSecurityAgent } from './agents/security-agent';
import { runUxAgent } from './agents/ux-agent';
import { runQaAgent } from './agents/qa-agent';
import { runDebugAgent } from './agents/debug-agent';

const execAsync = promisify(exec);

export type AgentType = 'planner' | 'builder' | 'qa' | 'debug' | 'security' | 'ux';

export interface AgentResult {
  agent: AgentType;
  status: 'passed' | 'failed' | 'needs_fix' | 'cannot_fix';
  output: string;
  summary?: string;
  fixes?: string[];
  diffs?: string[];
  errors?: string[];
  duration_ms: number;
}
export interface PipelineState {
  job_id: string; current_agent: AgentType; results: AgentResult[];
  plan?: { tasks: string[]; files: string[]; acceptance_criteria: string[] };
  retry_count: number; max_retries: number;
  success: boolean;
}

export interface RouterConfig { model: 'claude' | 'gpt' }

/** LLM call via the edge function router — used by planner for JSON output. */
async function callLLM(system: string, userMsg: string, taskId: string, model: 'claude' | 'gpt' = 'claude'): Promise<string> {
  const res = await callEdgeFunction({
    prompt: `${system}\n\n${userMsg}`,
    model,
    system,
    max_tokens: 4096,
  });
  storage.logEvent(taskId, `[PIPELINE] LLM: ${res.usage.input_tokens}+${res.usage.output_tokens} tokens`, 'info');
  return res.diff.trim();
}

async function callAgent(
  name: AgentType, taskId: string, fn: () => Promise<Omit<AgentResult, 'agent' | 'duration_ms'>>,
): Promise<AgentResult> {
  await storage.logEvent(taskId, `[PIPELINE] Starting ${name} agent`, 'info');
  const start = Date.now();
  const partial = await fn();
  const result: AgentResult = { ...partial, agent: name, duration_ms: Date.now() - start };
  await storage.logEvent(taskId, `[PIPELINE] ${name} finished: ${result.status} (${result.duration_ms}ms)`,
    result.status === 'failed' || result.status === 'cannot_fix' ? 'error' : 'info');
  return result;
}

async function applyDiffToRepo(diff: string, repoPath: string): Promise<{ ok: boolean; error?: string }> {
  const sanitized = sanitizeUnifiedDiff(diff);
  if (!sanitized) return { ok: false, error: 'Diff failed sanitization' };
  const extracted = extractDiff(sanitized);
  const v = validateUnifiedDiffEnhanced(extracted);
  if (!v.ok) return { ok: false, error: v.errors.join('; ') };
  const a = validateDiffApplicability(extracted, repoPath);
  if (!a.valid) return { ok: false, error: a.error || 'Diff not applicable' };
  const patchPath = path.join(repoPath, '.vibe-pipeline.patch');
  try {
    fs.writeFileSync(patchPath, extracted, 'utf-8');
    await simpleGit(repoPath).raw(['apply', '--verbose', '.vibe-pipeline.patch']);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  } finally {
    if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath);
  }
}

async function runCmd(cmd: string, cwd: string): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd, timeout: 300_000, maxBuffer: 10 * 1024 * 1024 });
    return { ok: true, output: (stdout + stderr).slice(0, 3000) };
  } catch (err: any) {
    return { ok: false, output: ((err.stdout || '') + (err.stderr || '')).slice(0, 3000) };
  }
}

const BUILD = () => process.env.BUILD_COMMAND || 'npm run build';

/**
 * Orchestrates the full agent pipeline in security-first order:
 *   Planner → Security → Builder → Validating → UX → QA
 *
 * Reports state transitions for SSE log streaming:
 *   planning → security → building → validating → ux → testing
 *
 * Does NOT set 'completed' or 'creating_pr' — the caller handles PR creation and final state.
 */
export async function runPipeline(
  jobId: string, prompt: string, context: string, config: RouterConfig,
  worktreeDir: string,
): Promise<PipelineState> {
  const state: PipelineState = {
    job_id: jobId, current_agent: 'planner', results: [], retry_count: 0, max_retries: 3,
    success: false,
  };

  // ── PLANNER ───────────────────────────────────────────────────────────────
  storage.updateTaskState(jobId, 'planning');
  storage.logEvent(jobId, '[PIPELINE] Phase: Planning — decomposing prompt into tasks', 'info');
  const planResult = await callAgent('planner', jobId, async () => {
    const msg = `${context}\n\n---\nAnalyze this request and return ONLY a JSON object with keys: tasks (string[]), files (string[]), acceptance_criteria (string[]). No markdown.\n\nRequest: ${prompt}`;
    const raw = await callLLM('You are a planning assistant. Return ONLY valid JSON, no markdown.', msg, jobId, config.model);
    try {
      state.plan = JSON.parse(raw);
      return {
        status: 'passed',
        output: `Plan: ${state.plan!.tasks.length} tasks, ${state.plan!.files.length} files`,
        summary: `Planned ${state.plan!.tasks.length} tasks across ${state.plan!.files.length} files`,
      };
    } catch {
      return { status: 'failed', output: 'Invalid JSON plan', errors: [raw.slice(0, 500)] };
    }
  });
  state.results.push(planResult);
  if (planResult.status === 'failed' || !state.plan) {
    await storage.updateTaskState(jobId, 'failed'); return state;
  }

  // ── SECURITY ──────────────────────────────────────────────────────────────
  state.current_agent = 'security';
  storage.updateTaskState(jobId, 'security');
  storage.logEvent(jobId, '[PIPELINE] Phase: Security — RLS coverage and secrets scan', 'info');
  const secResult = await callAgent('security', jobId, async () => {
    const scan = await runSecurityAgent(jobId, worktreeDir);
    if (scan.blocked) {
      return {
        status: 'failed',
        output: `Blocked: ${scan.criticalCount} critical finding(s)`,
        summary: `Security scan blocked: ${scan.criticalCount} critical, ${scan.warnCount} warnings`,
        fixes: scan.fixes,
        errors: [`${scan.criticalCount} critical, ${scan.warnCount} warnings`],
      };
    }
    return {
      status: 'passed',
      output: `Security clean (${scan.warnCount} warnings)`,
      summary: `Security passed: ${scan.warnCount} warnings${scan.fixes.length > 0 ? `, ${scan.fixes.length} auto-fixed` : ''}`,
      fixes: scan.fixes,
    };
  });
  state.results.push(secResult);
  if (secResult.status === 'failed') {
    await storage.updateTaskState(jobId, 'failed'); return state;
  }

  // ── BUILDER ───────────────────────────────────────────────────────────────
  state.current_agent = 'builder';
  storage.updateTaskState(jobId, 'building');
  storage.logEvent(jobId, `[PIPELINE] Phase: Building — executing ${state.plan.tasks.length} tasks`, 'info');
  const builderResult = await callAgent('builder', jobId, async () => {
    const diffs: string[] = [];
    for (const task of state.plan!.tasks) {
      storage.logEvent(jobId, `[PIPELINE] Builder task: ${task.slice(0, 80)}`, 'info');
      const ctxResult = await buildContext(worktreeDir, task);
      const res = await generateDiff(task, formatContext(ctxResult.files), { model: config.model, taskId: jobId });
      if (!res.diff || res.diff === 'NO_CHANGES') continue;
      const apply = await applyDiffToRepo(res.diff, worktreeDir);
      if (!apply.ok) return { status: 'needs_fix' as const, output: `Apply failed: ${task}`, diffs, errors: [apply.error || 'Unknown'] };
      diffs.push(res.diff);
      const build = await runCmd(BUILD(), worktreeDir);
      if (!build.ok) return { status: 'needs_fix' as const, output: `Build failed after: ${task}`, diffs, errors: [build.output] };
    }
    return {
      status: 'passed',
      output: `Applied ${diffs.length} diffs`,
      summary: `Built ${diffs.length} diff(s) across ${state.plan!.tasks.length} tasks`,
      diffs,
    };
  });
  state.results.push(builderResult);
  if (builderResult.status === 'needs_fix') {
    const debugOk = await runDebugLoop(state, 'builder', builderResult.errors?.[0] || '', worktreeDir, config);
    if (!debugOk) {
      await storage.updateTaskState(jobId, 'failed'); return state;
    }
  } else if (builderResult.status === 'failed') {
    await storage.updateTaskState(jobId, 'failed'); return state;
  }

  // ── VALIDATING (build + lint + test) ──────────────────────────────────────
  state.current_agent = 'qa';
  storage.updateTaskState(jobId, 'validating');
  storage.logEvent(jobId, '[PIPELINE] Phase: Validating — running build and tests', 'info');
  const validateResult = await callAgent('qa', jobId, async () => {
    const build = await runCmd(BUILD(), worktreeDir);
    if (!build.ok) return { status: 'needs_fix', output: 'Build failed', errors: [build.output] };
    const lint = await runCmd('npm run lint', worktreeDir);
    if (!lint.ok) return { status: 'needs_fix', output: 'Lint failed', errors: [lint.output] };
    const test = await runCmd('npm test', worktreeDir);
    if (!test.ok) return { status: 'needs_fix', output: 'Tests failed', errors: [test.output] };
    for (const c of state.plan?.acceptance_criteria || [])
      await storage.logEvent(jobId, `[QA] Criteria: ${c}`, 'info');
    return {
      status: 'passed',
      output: 'All validation checks passed',
      summary: 'Build, lint, and tests passed',
    };
  });
  state.results.push(validateResult);
  if (validateResult.status === 'needs_fix') {
    const debugOk = await runDebugLoop(state, 'qa', validateResult.errors?.[0] || '', worktreeDir, config);
    if (!debugOk) {
      await storage.updateTaskState(jobId, 'failed'); return state;
    }
  } else if (validateResult.status === 'failed') {
    await storage.updateTaskState(jobId, 'failed'); return state;
  }

  // ── UX ────────────────────────────────────────────────────────────────────
  state.current_agent = 'ux';
  storage.updateTaskState(jobId, 'ux');
  storage.logEvent(jobId, '[PIPELINE] Phase: UX — design consistency and accessibility', 'info');
  const uxResult = await callAgent('ux', jobId, async () => {
    const ux = await runUxAgent(jobId, worktreeDir);
    const totalIssues = ux.failed.length + ux.fixed.length + ux.cannotFix.length;
    if (ux.cannotFix.length > 0 && ux.fixed.length === 0) {
      return {
        status: 'cannot_fix' as const,
        output: `${ux.cannotFix.length} UX issue(s) could not be fixed`,
        summary: `UX: ${ux.passed.length} passed, ${ux.cannotFix.length} cannot fix`,
        fixes: ux.fixed,
        errors: ux.cannotFix,
      };
    }
    return {
      status: 'passed',
      output: `UX: ${ux.passed.length} passed, ${ux.fixed.length} fixed, ${ux.cannotFix.length} unfixable`,
      summary: `UX: ${ux.passed.length} passed${ux.fixed.length > 0 ? `, ${ux.fixed.length} auto-fixed` : ''}${ux.cannotFix.length > 0 ? `, ${ux.cannotFix.length} unfixable` : ''}`,
      fixes: ux.fixed,
    };
  });
  state.results.push(uxResult);
  // UX is non-blocking — log warnings but don't fail the pipeline
  if (uxResult.status === 'cannot_fix') {
    storage.logEvent(jobId, `[PIPELINE] UX has unfixable issues — continuing`, 'warning');
  }

  // ── QA (TESTING) ──────────────────────────────────────────────────────────
  state.current_agent = 'qa';
  storage.updateTaskState(jobId, 'testing');
  storage.logEvent(jobId, '[PIPELINE] Phase: QA — test generation and verification', 'info');
  const qaResult = await callAgent('qa', jobId, async () => {
    const qa = await runQaAgent(jobId, worktreeDir);
    if (qa.cannotFix) {
      return {
        status: 'cannot_fix' as const,
        output: `QA: tests could not be fixed after retries`,
        summary: 'QA: test generation failed after retries',
        fixes: qa.fixes,
        errors: [qa.testOutput.slice(0, 500)],
      };
    }
    if (!qa.success) {
      return {
        status: 'failed',
        output: `QA: ${qa.testOutput.slice(0, 200)}`,
        summary: 'QA: test generation failed',
        errors: [qa.testOutput.slice(0, 500)],
      };
    }
    return {
      status: 'passed',
      output: 'QA: tests generated and passing',
      summary: `QA passed${qa.fixes.length > 0 ? ` (${qa.fixes.length} fix attempts)` : ''}`,
      fixes: qa.fixes,
    };
  });
  state.results.push(qaResult);
  // QA is non-blocking — log warnings but don't fail the pipeline
  if (qaResult.status === 'cannot_fix' || qaResult.status === 'failed') {
    storage.logEvent(jobId, `[PIPELINE] QA issues detected — continuing`, 'warning');
  }

  // Pipeline succeeded — caller handles PR creation and final 'completed' state
  state.success = true;
  storage.logEvent(jobId, '[PIPELINE] All agents passed — ready for PR creation', 'success');
  return state;
}

async function runDebugLoop( // resumes from the failing agent, not from scratch
  state: PipelineState, failedAgent: AgentType, errorLog: string,
  worktreeDir: string, config: RouterConfig,
): Promise<boolean> {
  const { job_id: jobId } = state;
  while (state.retry_count < state.max_retries) {
    state.retry_count++;
    state.current_agent = 'debug';
    storage.logEvent(jobId, `[PIPELINE] Debug attempt ${state.retry_count}/${state.max_retries} for ${failedAgent}`, 'warning');

    const result = await callAgent('debug', jobId, async () => {
      const debug = await runDebugAgent(jobId, worktreeDir, errorLog);
      if (debug.cannotFix) {
        return {
          status: 'cannot_fix' as const,
          output: 'Debug agent signalled CANNOT_FIX',
          summary: `Debug: cannot fix ${failedAgent} errors after ${debug.fixes.length > 0 ? debug.fixes.length + ' attempts' : 'analysis'}`,
          fixes: debug.fixes,
        };
      }
      if (!debug.success) {
        return {
          status: 'failed' as const,
          output: 'Fix failed',
          errors: [debug.buildOutput],
        };
      }
      return {
        status: 'passed',
        output: 'Fix applied and verified',
        summary: `Debug: fixed ${failedAgent} errors`,
        fixes: debug.fixes,
        diffs: [],
      };
    });
    state.results.push(result);

    if (result.status === 'passed') {
      await storage.logEvent(jobId, `[PIPELINE] Debug fixed ${failedAgent} (retry ${state.retry_count})`, 'success');
      return true;
    }
    if (result.status === 'cannot_fix') {
      await storage.logEvent(jobId, `[PIPELINE] Debug agent gave up on ${failedAgent}`, 'error');
      return false;
    }
    errorLog = result.errors?.[0] || result.output;
  }
  await storage.logEvent(jobId, `[PIPELINE] Debug exhausted ${state.max_retries} retries for ${failedAgent}`, 'error');
  return false;
}
