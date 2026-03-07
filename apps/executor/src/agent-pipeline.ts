import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import { storage, AgentResultSummary } from './storage';
import { VIBE_SYSTEM_RULES } from './llm';
import { generateDiff, callEdgeFunction } from './llm-router';
import { buildContext, formatContext } from './context-builder';
import { sanitizeUnifiedDiff, extractDiff, validateUnifiedDiffEnhanced, validateDiffApplicability } from './diff-validator';
import { runSecurityAgent } from './agents/security-agent';
import { runDebugAgent, runSelfHealingScan } from './agents/debug-agent';
import { runQaAgent } from './agents/qa-agent';
import { runUxAgent } from './agents/ux-agent';
import { runBuilderAgent } from './agents/builder-agent';
import { DESIGN_PHASE, DesignPhaseKey } from './agent-prompts';

const execAsync = promisify(exec);

export type AgentType = 'planner' | 'builder' | 'qa' | 'debug' | 'security' | 'ux' | 'self-healing';

export interface AgentResult {
  agent: AgentType;
  status: 'passed' | 'failed' | 'needs_fix' | 'cannot_fix';
  output: string;
  summary?: string;
  fixes?: string[] | { category: string; description: string; diff: string }[];
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
  await storage.logEvent(taskId, `[PIPELINE] LLM: ${res.usage.input_tokens}+${res.usage.output_tokens} tokens`, 'info');
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

/** Map pipeline AgentResult[] → AgentResultSummary[] for DB persistence. */
function toAgentResultSummaries(results: AgentResult[]): AgentResultSummary[] {
  return results.map((r) => ({
    agent: r.agent,
    status: r.status === 'needs_fix' ? 'needs_fix' : r.status,
    summary: r.output,
    duration_ms: r.duration_ms,
    fixes: r.fixes?.map((f) => typeof f === 'string' ? { category: 'general', description: f } : { category: f.category, description: f.description }),
  }));
}

/** Persist agent results — fire and forget, never block pipeline return. */
async function persistAgentResults(jobId: string, results: AgentResult[]): Promise<void> {
  try {
    await storage.updateTaskAgentResults(jobId, toAgentResultSummaries(results));
  } catch (err: any) {
    storage.logEvent(jobId, `[PIPELINE] Failed to persist agent results: ${err.message}`, 'warning');
  }
}

/**
 * Orchestrates the full agent pipeline: Security → Planner → Builder → QA → Security → UX.
 * Uses llm-router.ts for all LLM calls.
 * Reports state transitions for SSE log streaming.
 *
 * Does NOT set 'completed' or 'creating_pr' — the caller handles PR creation and final state.
 */
export async function runPipeline(
  jobId: string, prompt: string, context: string, config: RouterConfig,
  worktreeDir: string, projectId?: string,
): Promise<PipelineState> {
  const state: PipelineState = {
    job_id: jobId, current_agent: 'planner', results: [], retry_count: 0, max_retries: 3,
    success: false,
  };

  // ── SECURITY (PRE-BUILD — blocks pipeline on critical pre-existing findings) ──
  state.current_agent = 'security';
  storage.updateTaskState(jobId, 'security');
  storage.logEvent(jobId, '[PIPELINE] Phase: Security — scanning before build', 'info');
  const preSecResult = await callAgent('security', jobId, async () => {
    const scan = await runSecurityAgent(jobId, worktreeDir);
    const summary = `${scan.criticalCount} critical, ${scan.warnCount} warnings`;
    if (scan.blocked) {
      return {
        status: 'failed' as const,
        output: summary,
        summary,
        fixes: scan.fixes,
        errors: [summary],
      };
    }
    return {
      status: 'passed' as const,
      output: `Security clean (${scan.warnCount} warnings)`,
      summary: `Security clean (${scan.warnCount} warnings)`,
      fixes: scan.fixes,
    };
  });
  state.results.push(preSecResult);
  if (preSecResult.status === 'failed') {
    await persistAgentResults(jobId, state.results);
    await storage.updateTaskState(jobId, 'failed'); return state;
  }

  // ── PLANNER ───────────────────────────────────────────────────────────────
  storage.updateTaskState(jobId, 'planning');
  storage.logEvent(jobId, '[PIPELINE] Phase: Planning — decomposing prompt into tasks', 'info');
  const planResult = await callAgent('planner', jobId, async () => {
    const msg = `${context}\n\n---\nAnalyze this request and return ONLY a JSON object with keys: tasks (string[]), files (string[]), acceptance_criteria (string[]). No markdown.\n\nRequest: ${prompt}`;
    const raw = await callLLM(`${VIBE_SYSTEM_RULES}\n\nYou are a planning assistant. Return ONLY valid JSON, no markdown.`, msg, jobId, config.model);
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
    await persistAgentResults(jobId, state.results);
    await storage.updateTaskState(jobId, 'failed'); return state;
  }

  // ── BUILDER ───────────────────────────────────────────────────────────────
  state.current_agent = 'builder';
  storage.updateTaskState(jobId, 'building');
  storage.logEvent(jobId, `[PIPELINE] Phase: Building — executing ${state.plan.tasks.length} tasks`, 'info');
  const builderResult = await callAgent('builder', jobId, async () => {
    const result = await runBuilderAgent(jobId, worktreeDir, state.plan!.tasks, projectId);
    if (!result.success) {
      return {
        status: 'needs_fix' as const,
        output: result.summary,
        summary: result.summary,
        errors: result.failedTask ? [result.failedTask] : undefined,
      };
    }
    return {
      status: 'passed' as const,
      output: result.summary,
      summary: result.summary,
    };
  });
  state.results.push(builderResult);
  if (builderResult.status === 'needs_fix') {
    if (!await runDebugLoop(state, 'builder', builderResult.errors?.[0] || '', worktreeDir, jobId)) {
      await persistAgentResults(jobId, state.results);
      await storage.updateTaskState(jobId, 'failed'); return state;
    }
  } else if (builderResult.status === 'failed') {
    await persistAgentResults(jobId, state.results);
    await storage.updateTaskState(jobId, 'failed'); return state;
  }

  // ── QA ───────────────────────────────────────────────────────────────────
  state.current_agent = 'qa';
  storage.updateTaskState(jobId, 'validating');
  storage.logEvent(jobId, '[PIPELINE] Phase: QA — generating and running tests', 'info');
  const qaResult = await callAgent('qa', jobId, async () => {
    const result = await runQaAgent(jobId, worktreeDir);
    for (const c of state.plan?.acceptance_criteria || [])
      await storage.logEvent(jobId, `[QA] Criteria: ${c}`, 'info');
    if (!result.success) {
      return {
        status: 'needs_fix' as const,
        output: result.testOutput.slice(0, 500),
        summary: result.summary,
        errors: [result.testOutput.slice(0, 500)],
      };
    }
    return { status: 'passed' as const, output: 'All QA checks passed', summary: result.summary };
  });
  state.results.push(qaResult);
  if (qaResult.status === 'needs_fix') {
    if (!await runDebugLoop(state, 'qa', qaResult.errors?.[0] || '', worktreeDir, jobId)) {
      await persistAgentResults(jobId, state.results);
      await storage.updateTaskState(jobId, 'failed'); return state;
    }
  } else if (qaResult.status === 'failed') {
    await persistAgentResults(jobId, state.results);
    await storage.updateTaskState(jobId, 'failed'); return state;
  }

  // ── SECURITY (POST-BUILD — catches new issues introduced by changes) ────
  state.current_agent = 'security';
  storage.updateTaskState(jobId, 'testing');
  storage.logEvent(jobId, '[PIPELINE] Phase: Security — post-build scan', 'info');
  const postSecResult = await callAgent('security', jobId, async () => {
    const scan = await runSecurityAgent(jobId, worktreeDir);
    const summary = `${scan.criticalCount} critical, ${scan.warnCount} warnings`;
    if (scan.blocked) {
      return {
        status: 'failed' as const,
        output: summary,
        summary,
        fixes: scan.fixes,
        errors: [summary],
      };
    }
    return {
      status: 'passed' as const,
      output: `Security clean (${scan.warnCount} warnings)`,
      summary: `Security passed: ${scan.warnCount} warnings${scan.fixes.length > 0 ? `, ${scan.fixes.length} auto-fixed` : ''}`,
      fixes: scan.fixes,
    };
  });
  state.results.push(postSecResult);
  if (postSecResult.status === 'failed') {
    await persistAgentResults(jobId, state.results);
    await storage.updateTaskState(jobId, 'failed'); return state;
  }

  // ── UX ────────────────────────────────────────────────────────────────────
  state.current_agent = 'ux';
  storage.updateTaskState(jobId, 'ux');
  storage.logEvent(jobId, '[PIPELINE] Phase: UX — checking and fixing design consistency', 'info');
  const uxResult = await callAgent('ux', jobId, async () => {
    const result = await runUxAgent(jobId, worktreeDir);
    const summary = `${result.passed.length} passed, ${result.failed.length} failed, ${result.fixed.length} fixed`;
    const status = result.failed.length === 0 ? 'passed' : 'needs_fix';
    return {
      status: status as 'passed' | 'needs_fix',
      output: summary,
      summary,
      errors: result.failed.length > 0 ? result.failed : undefined,
    };
  });
  state.results.push(uxResult);
  // UX failures are non-blocking — logged but pipeline continues
  if (uxResult.status === 'needs_fix') {
    await storage.logEvent(jobId, `[PIPELINE] UX issues remain after auto-fix — continuing: ${uxResult.errors?.join('; ')}`, 'warning');
  }

  // ── SELF-HEALING SCAN ────────────────────────────────────────────────────
  state.current_agent = 'self-healing';
  storage.updateTaskState(jobId, 'self-healing');
  storage.logEvent(jobId, '[PIPELINE] Phase: Self-Healing — scanning for broken interactive components', 'info');
  const healStart = Date.now();
  const healResult = await runSelfHealingScan(jobId, worktreeDir);
  const healDurationMs = Date.now() - healStart;
  if (healResult.healed > 0) {
    storage.logEvent(jobId, `[PIPELINE] Self-healing fixed ${healResult.healed} component issue(s)`, 'success');
  }
  if (healResult.remaining.length > 0) {
    storage.logEvent(jobId, `[PIPELINE] ${healResult.remaining.length} component issue(s) remain — non-blocking`, 'warning');
  }
  const issuesFound = healResult.healed + healResult.remaining.length;
  const healStatus: AgentResult['status'] = issuesFound === 0 ? 'passed' : healResult.remaining.length === 0 ? 'passed' : 'needs_fix';
  state.results.push({
    agent: 'self-healing',
    status: healStatus,
    output: `${issuesFound} issues found, ${healResult.healed} fixed`,
    summary: `${issuesFound} issues found, ${healResult.healed} fixed`,
    fixes: [],
    errors: healResult.remaining.length > 0 ? healResult.remaining.map(r => `${r.file}:${r.line} — ${r.description}`) : [],
    duration_ms: healDurationMs,
  });

  // Pipeline succeeded — caller handles PR creation and final 'completed' state
  state.success = true;
  await persistAgentResults(jobId, state.results);
  storage.logEvent(jobId, '[PIPELINE] All agents passed — ready for PR creation', 'success');
  return state;
}

export async function runDesignPhase(phase: DesignPhaseKey): Promise<string> {
  const prompt = DESIGN_PHASE[phase];
  const result = await generateDiff(prompt, '', { model: 'claude', taskId: 'design-phase' });
  return result.diff;
}

async function runDebugLoop(
  state: PipelineState, failedAgent: AgentType, errorLog: string,
  worktreeDir: string, jobId: string,
): Promise<boolean> {
  state.current_agent = 'debug';
  storage.logEvent(jobId, `[PIPELINE] Debug triggered for ${failedAgent}`, 'warning');
  const result = await callAgent('debug', jobId, async () => {
    const debugResult = await runDebugAgent(jobId, worktreeDir, errorLog);
    if (debugResult.success) {
      return {
        status: 'passed' as const,
        output: 'Debug fix applied and verified',
        summary: debugResult.summary,
      };
    }
    return {
      status: 'failed' as const,
      output: debugResult.buildOutput.slice(0, 500),
      summary: debugResult.summary,
      errors: [debugResult.buildOutput.slice(0, 500)],
    };
  });
  state.results.push(result);
  if (result.status === 'passed') {
    await storage.logEvent(jobId, `[PIPELINE] Debug resolved ${failedAgent}`, 'success');
    return true;
  }
  await storage.logEvent(jobId, `[PIPELINE] Debug could not resolve ${failedAgent}: ${result.output}`, 'error');
  return false;
}
