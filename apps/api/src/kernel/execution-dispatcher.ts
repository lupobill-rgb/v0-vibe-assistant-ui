import { getPlatformSupabaseClient } from '../supabase/client';
import { resolveKernelContext } from './context-injector';
import { generateDiff, DiffResult } from '../edge-function';

interface PendingExecution {
  id: string;
  organization_id: string;
  team_id: string;
  skill_id: string;
  trigger_source: string;
  trigger_event: string;
  trigger_payload: unknown;
}

interface SkillRecord {
  id: string;
  skill_name: string;
  description: string | null;
  content: string;
  team_function: string;
}

/**
 * Dispatches all pending autonomous_executions.
 *
 * For each pending row:
 *  1. Marks status → running
 *  2. Resolves the skill from skill_registry
 *  3. Builds kernel context via context-injector
 *  4. Calls the Edge Function (generate-diff) with the skill prompt + context
 *  5. Updates status → complete or failed
 */
export async function dispatchPendingExecutions(): Promise<number> {
  const sb = getPlatformSupabaseClient();

  // 1. Fetch pending executions
  const { data: pending, error: fetchErr } = await sb
    .from('autonomous_executions')
    .select('id, organization_id, team_id, skill_id, trigger_source, trigger_event, trigger_payload')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20);

  if (fetchErr) {
    console.error('[dispatcher] Failed to fetch pending executions:', fetchErr.message);
    return 0;
  }

  if (!pending || pending.length === 0) return 0;

  console.log(`[dispatcher] Found ${pending.length} pending execution(s)`);
  let completed = 0;

  for (const exec of pending as PendingExecution[]) {
    try {
      await runExecution(sb, exec);
      completed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[dispatcher] Execution ${exec.id} failed fatally:`, msg);
    }
  }

  console.log(`[dispatcher] Dispatched ${completed}/${pending.length} execution(s)`);
  return completed;
}

async function runExecution(
  sb: ReturnType<typeof getPlatformSupabaseClient>,
  exec: PendingExecution,
): Promise<void> {
  const { id, organization_id, team_id, skill_id, trigger_source, trigger_event, trigger_payload } = exec;

  // Mark as running
  const { error: updateErr } = await sb
    .from('autonomous_executions')
    .update({ status: 'running' })
    .eq('id', id);

  if (updateErr) {
    console.error(`[dispatcher] Failed to mark execution ${id} as running:`, updateErr.message);
    return;
  }

  // Resolve skill from skill_registry
  const { data: skill, error: skillErr } = await sb
    .from('skill_registry')
    .select('id, skill_name, description, content, team_function')
    .eq('id', skill_id)
    .single();

  if (skillErr || !skill) {
    await failExecution(sb, id, `Skill ${skill_id} not found: ${skillErr?.message ?? 'no data'}`);
    return;
  }

  const typedSkill = skill as SkillRecord;
  console.log(`[dispatcher] Running execution ${id} — skill=${typedSkill.skill_name}, trigger=${trigger_source}:${trigger_event}`);

  // Build prompt from skill content + trigger payload
  const triggerSummary = typeof trigger_payload === 'object' && trigger_payload !== null
    ? JSON.stringify(trigger_payload).slice(0, 2000)
    : String(trigger_payload ?? '');

  const prompt = [
    `[Autonomous execution triggered by ${trigger_source}:${trigger_event}]`,
    `Skill: ${typedSkill.skill_name}`,
    typedSkill.description ? `Description: ${typedSkill.description}` : '',
    `\nTrigger payload:\n${triggerSummary}`,
    `\nSkill instructions:\n${typedSkill.content}`,
  ].filter(Boolean).join('\n');

  // Resolve kernel context (team, org, brand, connectors, etc.)
  let context = '';
  try {
    // Use a system user ID for autonomous executions (no real user session)
    const kernelResult = await resolveKernelContext(
      '00000000-0000-0000-0000-000000000000', // system user placeholder
      organization_id,
      team_id,
      prompt,
    );
    context = kernelResult.context;
  } catch (ctxErr) {
    console.warn(`[dispatcher] Context resolution failed for execution ${id}, proceeding without context:`, ctxErr);
  }

  // Call the Edge Function
  let result: DiffResult;
  try {
    result = await generateDiff(prompt, context, 'claude', typedSkill.team_function, team_id);
  } catch (llmErr) {
    const msg = llmErr instanceof Error ? llmErr.message : 'LLM call failed';
    await failExecution(sb, id, msg);
    return;
  }

  // Mark as complete
  const { error: completeErr } = await sb
    .from('autonomous_executions')
    .update({
      status: 'complete',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (completeErr) {
    console.error(`[dispatcher] Failed to mark execution ${id} as complete:`, completeErr.message);
  }

  console.log(`[dispatcher] Execution ${id} complete — tokens=${result.usage?.total_tokens ?? 'n/a'}`);
}

async function failExecution(
  sb: ReturnType<typeof getPlatformSupabaseClient>,
  executionId: string,
  errorMessage: string,
): Promise<void> {
  console.error(`[dispatcher] Execution ${executionId} failed: ${errorMessage}`);
  const { error } = await sb
    .from('autonomous_executions')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', executionId);

  if (error) {
    console.error(`[dispatcher] Failed to mark execution ${executionId} as failed:`, error.message);
  }
}
