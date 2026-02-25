import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import { storage } from './storage';
import { generateDiff } from './llm-router';
import { buildContext, formatContext } from './context-builder';
import { sanitizeUnifiedDiff, extractDiff, validateUnifiedDiffEnhanced, validateDiffApplicability } from './diff-validator';
import { runSecurityAgent } from './agents/security-agent';

const execAsync = promisify(exec);

export type AgentType = 'planner' | 'builder' | 'qa' | 'debug' | 'security';

export interface AgentResult {
  agent: AgentType;
  status: 'passed' | 'failed' | 'needs_fix';
  output: string;
  diffs?: string[];
  errors?: string[];
  duration_ms: number;
}

export interface PipelineState {
  job_id: string;
  current_agent: AgentType;
  results: AgentResult[];
  plan?: { tasks: string[]; files: string[]; acceptance_criteria: string[] };
  retry_count: number;
  max_retries: number;
}

export interface RouterConfig { model: 'claude' | 'gpt' }

async function callAgent(
  name: AgentType, taskId: string, fn: () => Promise<Omit<AgentResult, 'agent' | 'duration_ms'>>,
): Promise<AgentResult> {
  storage.logEvent(taskId, `[PIPELINE] Starting ${name} agent`, 'info');
  const start = Date.now();
  const partial = await fn();
  const result: AgentResult = { agent: name, duration_ms: Date.now() - start, ...partial };
  storage.logEvent(taskId, `[PIPELINE] ${name} finished: ${result.status} (${result.duration_ms}ms)`,
    result.status === 'failed' ? 'error' : 'info');
  return result;
}

async function applyDiffToRepo(diff: string, repoPath: string): Promise<{ ok: boolean; error?: string }> {
  const sanitized = sanitizeUnifiedDiff(diff);
  if (!sanitized) return { ok: false, error: 'Diff failed sanitization' };
  const extracted = extractDiff(sanitized);
  const v = validateUnifiedDiffEnhanced(extracted);
  if (!v.ok) return { ok: false, error: v.errors.join('; ') };
  const a = validateDiffApplicability(extracted, repoPath);
  if (!a.valid) return { ok: false, error: a.error };
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

export async function runPipeline(
  jobId: string, prompt: string, context: string, config: RouterConfig, _teamId: string,
): Promise<PipelineState> {
  const worktreeDir = path.join(process.env.WORKTREES_BASE_DIR || '/data/worktrees', jobId);
  const state: PipelineState = {
    job_id: jobId, current_agent: 'planner', results: [], retry_count: 0, max_retries: 3,
  };

  storage.updateTaskState(jobId, 'building_context'); // PLANNER
  const planResult = await callAgent('planner', jobId, async () => {
    const planPrompt = `Analyze this request and return ONLY a JSON object (no markdown):\n` +
      `{"tasks":["..."],"files":["..."],"acceptance_criteria":["..."]}\n\nRequest: ${prompt}`;
    const res = await generateDiff(planPrompt, context, { model: config.model, taskId: jobId });
    try {
      state.plan = JSON.parse(res.diff);
      return { status: 'passed', output: `Plan: ${state.plan!.tasks.length} tasks, ${state.plan!.files.length} files` };
    } catch {
      return { status: 'failed', output: 'Invalid JSON plan', errors: [res.diff.slice(0, 500)] };
    }
  });
  state.results.push(planResult);
  if (planResult.status === 'failed' || !state.plan) {
    storage.updateTaskState(jobId, 'failed'); return state;
  }

  state.current_agent = 'builder'; // BUILDER
  storage.updateTaskState(jobId, 'calling_llm');
  const builderResult = await callAgent('builder', jobId, async () => {
    const diffs: string[] = [];
    for (const task of state.plan!.tasks) {
      const ctxResult = await buildContext(worktreeDir, task);
      const res = await generateDiff(task, formatContext(ctxResult.files), { model: config.model, taskId: jobId });
      if (!res.diff || res.diff === 'NO_CHANGES') continue;
      const apply = await applyDiffToRepo(res.diff, worktreeDir);
      if (!apply.ok) return { status: 'needs_fix' as const, output: `Apply failed: ${task}`, diffs, errors: [apply.error!] };
      diffs.push(res.diff);
      const build = await runCmd(BUILD(), worktreeDir);
      if (!build.ok) return { status: 'needs_fix' as const, output: `Build failed after: ${task}`, diffs, errors: [build.output] };
    }
    return { status: 'passed', output: `Applied ${diffs.length} diffs`, diffs };
  });
  state.results.push(builderResult);
  if (builderResult.status === 'needs_fix') {
    if (!await runDebugLoop(state, 'builder', builderResult.errors?.[0] || '', worktreeDir, config)) {
      storage.updateTaskState(jobId, 'failed'); return state;
    }
  } else if (builderResult.status === 'failed') {
    storage.updateTaskState(jobId, 'failed'); return state;
  }

  state.current_agent = 'qa'; // QA
  storage.updateTaskState(jobId, 'running_preflight');
  const qaResult = await callAgent('qa', jobId, async () => {
    const build = await runCmd(BUILD(), worktreeDir);
    if (!build.ok) return { status: 'needs_fix', output: 'Build failed', errors: [build.output] };
    const lint = await runCmd('npm run lint', worktreeDir);
    if (!lint.ok) return { status: 'needs_fix', output: 'Lint failed', errors: [lint.output] };
    const test = await runCmd('npm test', worktreeDir);
    if (!test.ok) return { status: 'needs_fix', output: 'Tests failed', errors: [test.output] };
    for (const c of state.plan?.acceptance_criteria || [])
      storage.logEvent(jobId, `[QA] Criteria: ${c}`, 'info');
    return { status: 'passed', output: 'All QA checks passed' };
  });
  state.results.push(qaResult);
  if (qaResult.status === 'needs_fix') {
    if (!await runDebugLoop(state, 'qa', qaResult.errors?.[0] || '', worktreeDir, config)) {
      storage.updateTaskState(jobId, 'failed'); return state;
    }
  } else if (qaResult.status === 'failed') {
    storage.updateTaskState(jobId, 'failed'); return state;
  }

  state.current_agent = 'security'; // SECURITY — final gate
  const secResult = await callAgent('security', jobId, async () => {
    const scan = await runSecurityAgent(jobId, worktreeDir);
    if (scan.blocked)
      return { status: 'failed', output: `Blocked: ${scan.criticalCount} critical findings`,
        errors: [`${scan.criticalCount} critical, ${scan.warnCount} warnings`] };
    return { status: 'passed', output: `Security clean (${scan.warnCount} warnings)` };
  });
  state.results.push(secResult);
  if (secResult.status === 'failed') {
    storage.updateTaskState(jobId, 'failed'); return state;
  }

  storage.updateTaskState(jobId, 'completed');
  storage.logEvent(jobId, '[PIPELINE] All agents passed — job complete', 'success');
  return state;
}

// Debug retry loop — resumes from the failing agent, not from scratch
async function runDebugLoop(
  state: PipelineState, failedAgent: AgentType, errorLog: string,
  worktreeDir: string, config: RouterConfig,
): Promise<boolean> {
  const { job_id: jobId } = state;
  while (state.retry_count < state.max_retries) {
    state.retry_count++;
    state.current_agent = 'debug';
    const result = await callAgent('debug', jobId, async () => {
      const ctxResult = await buildContext(worktreeDir, 'Fix errors');
      const enriched = `${formatContext(ctxResult.files)}\n\n---\nERROR LOG:\n${errorLog.slice(0, 5000)}`;
      const res = await generateDiff(
        'Analyze the error log and generate a unified diff to fix the failures. Only fix errors shown.',
        enriched, { model: config.model, taskId: jobId });
      if (!res.diff || res.diff === 'NO_CHANGES') return { status: 'failed' as const, output: 'No fix produced' };
      const apply = await applyDiffToRepo(res.diff, worktreeDir);
      if (!apply.ok) return { status: 'failed' as const, output: `Fix failed: ${apply.error}` };
      const verify = await runCmd(BUILD(), worktreeDir);
      if (!verify.ok) return { status: 'failed' as const, output: 'Still failing', errors: [verify.output] };
      return { status: 'passed', output: 'Fix applied and verified', diffs: [res.diff] };
    });
    state.results.push(result);
    if (result.status === 'passed') {
      storage.logEvent(jobId, `[PIPELINE] Debug fixed ${failedAgent} (retry ${state.retry_count})`, 'success');
      return true;
    }
    errorLog = result.errors?.[0] || result.output;
  }
  storage.logEvent(jobId, `[PIPELINE] Debug exhausted ${state.max_retries} retries for ${failedAgent}`, 'error');
  return false;
}
