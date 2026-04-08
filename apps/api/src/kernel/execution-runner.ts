import { getPlatformSupabaseClient } from '../supabase/client';
import { resolveKernelContext } from './context-injector';
import { generateDiff } from '../edge-function';

const POLL_INTERVAL_MS = 5_000;
const CLAIM_BATCH_SIZE = 1;
const EXECUTE_TIMEOUT_MS = 180_000; // 3 min — must exceed Edge Function wall time
const MAX_DRAIN_ITERATIONS = 5; // prevent unbounded while-loop from starving event loop

interface AutonomousExecution {
  id: string;
  organization_id: string;
  team_id: string;
  skill_id: string;
  trigger_source: string;
  trigger_event: string;
  trigger_payload: Record<string, unknown> | null;
}

interface SkillRow {
  id: string;
  plugin_name: string;
  skill_name: string;
  team_function: string;
  description: string;
  content: string;
}

/**
 * Claims a single pending execution by atomically setting status=running.
 * Uses an update with a WHERE filter to avoid race conditions between workers.
 */
async function claimPendingExecution(): Promise<AutonomousExecution | null> {
  const sb = getPlatformSupabaseClient();

  // Fetch oldest pending row
  const { data: pending, error: fetchErr } = await sb
    .from('autonomous_executions')
    .select('id, organization_id, team_id, skill_id, trigger_source, trigger_event, trigger_payload')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(CLAIM_BATCH_SIZE)
    .single();

  if (fetchErr || !pending) return null;

  // Attempt atomic claim: only succeeds if still pending
  const { data: claimed, error: claimErr } = await sb
    .from('autonomous_executions')
    .update({ status: 'running' })
    .eq('id', pending.id)
    .eq('status', 'pending')
    .select('id, organization_id, team_id, skill_id, trigger_source, trigger_event, trigger_payload')
    .single();

  if (claimErr || !claimed) {
    // Another worker claimed it
    return null;
  }

  return claimed as AutonomousExecution;
}

/**
 * Resolves the skill definition from skill_registry by id.
 */
async function resolveSkill(skillId: string): Promise<SkillRow | null> {
  const sb = getPlatformSupabaseClient();
  const { data, error } = await sb
    .from('skill_registry')
    .select('id, plugin_name, skill_name, team_function, description, content')
    .eq('id', skillId)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data as SkillRow;
}

/**
 * Resolves the team name for a given team ID.
 */
async function resolveTeamName(teamId: string): Promise<string> {
  const sb = getPlatformSupabaseClient();
  const { data } = await sb
    .from('teams')
    .select('name')
    .eq('id', teamId)
    .single();
  return data?.name ?? 'unknown';
}

/**
 * Marks an execution as complete with a result payload.
 */
async function markComplete(executionId: string, _result: Record<string, unknown>): Promise<void> {
  const sb = getPlatformSupabaseClient();
  const { error } = await sb
    .from('autonomous_executions')
    .update({
      status: 'complete',
      completed_at: new Date().toISOString(),
    })
    .eq('id', executionId);

  if (error) {
    console.error(`[execution-runner] Failed to mark ${executionId} complete:`, error.message);
  }
}

/**
 * Marks an execution as failed with an error message.
 */
async function markFailed(executionId: string, errorMsg: string): Promise<void> {
  const sb = getPlatformSupabaseClient();
  console.error(`[execution-runner] Marking ${executionId} failed: ${errorMsg}`);
  const { error } = await sb
    .from('autonomous_executions')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', executionId);

  if (error) {
    console.error(`[execution-runner] Failed to mark ${executionId} failed:`, error.message);
  }
}

/**
 * Wraps a promise with a timeout. Rejects with a timeout error if the
 * promise doesn't resolve within the given duration.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}: timeout after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/**
 * Executes a single autonomous execution:
 * 1. Resolve skill from skill_registry
 * 2. Build kernel context via context-injector
 * 3. Call the edge function with the skill + trigger payload (20s timeout)
 * 4. Update status to complete or failed
 *
 * The entire body is wrapped in try/catch — any unhandled error marks the
 * execution as failed instead of leaving it stuck in 'running'.
 */
async function executeOne(exec: AutonomousExecution): Promise<void> {
  const logPrefix = `[execution-runner][${exec.id}]`;
  const sbJob = getPlatformSupabaseClient();
  let job: { id: string } | null = null;

  try {
    console.log(`${logPrefix} Starting — skill=${exec.skill_id} trigger=${exec.trigger_source}/${exec.trigger_event}`);

    // 1. Resolve skill
    const skill = await resolveSkill(exec.skill_id);
    if (!skill) {
      await markFailed(exec.id, `Skill ${exec.skill_id} not found or inactive`);
      return;
    }

    console.log(`${logPrefix} Resolved skill: ${skill.plugin_name}/${skill.skill_name}`);

    // 1b. Create a job record for this autonomous execution
    const { data: jobRow } = await sbJob
      .from('jobs')
      .insert({
        org_id: exec.organization_id,
        team_id: exec.team_id,
        user_prompt: `[Auto] ${skill.skill_name} triggered by ${exec.trigger_source}`,
        execution_state: 'building',
        initiated_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    job = jobRow;

    if (job) {
      await sbJob.from('autonomous_executions')
        .update({ job_id: job.id })
        .eq('id', exec.id);
    }

    // 2. Build kernel context via context-injector
    const systemUserId = '00000000-0000-0000-0000-000000000000';
    const teamName = await resolveTeamName(exec.team_id);

    const { context } = await resolveKernelContext(
      systemUserId,
      exec.organization_id,
      exec.team_id,
    );

    // 3. Build prompt from skill content + trigger payload
    const triggerSummary = exec.trigger_payload
      ? JSON.stringify(exec.trigger_payload, null, 2)
      : 'No payload';

    const prompt = [
      `AUTONOMOUS EXECUTION — Skill: ${skill.skill_name}`,
      `Trigger: ${exec.trigger_source} / ${exec.trigger_event}`,
      '',
      '--- SKILL INSTRUCTIONS ---',
      skill.content,
      '',
      '--- TRIGGER PAYLOAD ---',
      triggerSummary,
    ].join('\n');

    // 4. Call edge function with timeout
    const result = await withTimeout(
      generateDiff(prompt, context, 'claude', teamName, exec.team_id),
      EXECUTE_TIMEOUT_MS,
      `generateDiff for ${exec.id}`,
    );

    console.log(
      `${logPrefix} Complete — tokens=${result.usage?.total_tokens ?? 'unknown'} mode=${result.mode ?? 'unknown'}`,
    );

    await markComplete(exec.id, {
      diff: result.diff,
      mode: result.mode,
      usage: result.usage,
    });

    if (job) {
      await sbJob.from('jobs')
        .update({ execution_state: 'completed' })
        .eq('id', job.id);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} Failed:`, message);
    await markFailed(exec.id, message);

    if (job) {
      await sbJob.from('jobs')
        .update({ execution_state: 'failed' })
        .eq('id', job.id);
    }
  }
}

/**
 * Single poll iteration: claim and execute one pending row.
 * Returns true if work was found, false if idle.
 */
async function pollOnce(): Promise<boolean> {
  try {
    const exec = await claimPendingExecution();
    if (!exec) return false;
    await executeOne(exec);
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[execution-runner] Poll error:', message);
    return false;
  }
}

let _intervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Starts the execution runner on a polling interval.
 * Safe to call multiple times — only one interval runs.
 */
export function startExecutionRunner(intervalMs: number = POLL_INTERVAL_MS): void {
  if (_intervalHandle) {
    console.log('[execution-runner] Already running, skipping duplicate start');
    return;
  }

  console.log(`[execution-runner] Starting with ${intervalMs}ms poll interval`);

  // Run immediately on start, then on interval
  pollOnce();

  _intervalHandle = setInterval(async () => {
    const didWork = await pollOnce();
    if (didWork) {
      // If we found work, check for more but cap iterations to avoid blocking event loop
      let remaining = MAX_DRAIN_ITERATIONS;
      let more = true;
      while (more && remaining-- > 0) {
        more = await pollOnce();
      }
    }
  }, intervalMs);
}

/**
 * Stops the execution runner.
 */
export function stopExecutionRunner(): void {
  if (_intervalHandle) {
    clearInterval(_intervalHandle);
    _intervalHandle = null;
    console.log('[execution-runner] Stopped');
  }
}
