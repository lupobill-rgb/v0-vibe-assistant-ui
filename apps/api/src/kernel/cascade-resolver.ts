import { SupabaseClient } from '@supabase/supabase-js';
import { getPlatformSupabaseClient } from '../supabase/client';

/**
 * Cascade Resolver — fires after an autonomous_execution reaches status=complete.
 *
 * Flow:
 *  1. Look up the completed execution's skill + team
 *  2. Find published_assets owned by that team
 *  3. Find active feed_subscriptions on those assets (downstream teams)
 *  4. For each subscriber team, find active skills in skill_registry
 *  5. Insert a pending autonomous_execution per downstream skill
 *  6. Insert a cascade_edge linking source → target execution
 */

export interface CascadeResult {
  dispatched: number;
  edges: string[];
  errors: string[];
}

/** Maximum cascade depth to prevent infinite loops between cross-subscribed teams. */
const MAX_CASCADE_DEPTH = 5;

export async function resolveCascade(
  executionId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseOverride?: SupabaseClient<any, any, any>,
): Promise<CascadeResult> {
  const supabase = supabaseOverride ?? getPlatformSupabaseClient();
  const result: CascadeResult = { dispatched: 0, edges: [], errors: [] };

  // Guard against infinite cascade loops by counting ancestor depth via cascade_edges
  const { count: depth } = await supabase
    .from('cascade_edges')
    .select('id', { count: 'exact', head: true })
    .eq('target_execution_id', executionId);

  if ((depth ?? 0) >= MAX_CASCADE_DEPTH) {
    result.errors.push(`Cascade depth limit (${MAX_CASCADE_DEPTH}) reached for execution ${executionId}`);
    return result;
  }

  // 1. Fetch the completed execution
  const { data: execution, error: execErr } = await supabase
    .from('autonomous_executions')
    .select('id, skill_id, team_id, organization_id, status')
    .eq('id', executionId)
    .single();

  if (execErr || !execution) {
    result.errors.push(`Execution not found: ${executionId}`);
    return result;
  }

  if (execution.status !== 'complete') {
    result.errors.push(
      `Execution ${executionId} status is '${execution.status}', not 'complete'`,
    );
    return result;
  }

  // 2. Find published_assets owned by the execution's team
  const { data: assets, error: assetErr } = await supabase
    .from('published_assets')
    .select('id')
    .eq('team_id', execution.team_id);

  if (assetErr) {
    result.errors.push(`Failed to query published_assets: ${assetErr.message}`);
    return result;
  }

  if (!assets || assets.length === 0) {
    return result; // no published assets — nothing to cascade
  }

  const assetIds = assets.map((a: { id: string }) => a.id);

  // 3. Find active feed_subscriptions on those assets
  const { data: subs, error: subErr } = await supabase
    .from('feed_subscriptions')
    .select('id, subscriber_team_id')
    .in('asset_id', assetIds)
    .eq('status', 'active');

  if (subErr) {
    result.errors.push(
      `Failed to query feed_subscriptions: ${subErr.message}`,
    );
    return result;
  }

  if (!subs || subs.length === 0) {
    return result; // no subscribers — nothing to cascade
  }

  // Deduplicate subscriber teams
  const subscriberTeamIds = [
    ...new Set(subs.map((s: { subscriber_team_id: string }) => s.subscriber_team_id)),
  ];

  // Build a map of subscription IDs per subscriber team (for traceability)
  const subIdByTeam = new Map<string, string>();
  for (const s of subs) {
    if (!subIdByTeam.has(s.subscriber_team_id)) {
      subIdByTeam.set(s.subscriber_team_id, s.id);
    }
  }

  // 4. For each subscriber team, find active skills
  const { data: skills, error: skillErr } = await supabase
    .from('skill_registry')
    .select('id, team_function')
    .eq('is_active', true);

  if (skillErr) {
    result.errors.push(`Failed to query skill_registry: ${skillErr.message}`);
    return result;
  }

  if (!skills || skills.length === 0) {
    return result;
  }

  // Resolve each subscriber team's department to find matching skills.
  // We query the teams table for team_function mapping.
  const { data: teams, error: teamErr } = await supabase
    .from('teams')
    .select('id, slug')
    .in('id', subscriberTeamIds);

  if (teamErr) {
    result.errors.push(`Failed to query teams: ${teamErr.message}`);
    return result;
  }

  if (!teams || teams.length === 0) {
    return result;
  }

  // 5 & 6. For each subscriber team, match skills and dispatch
  for (const team of teams) {
    // Match skills by team_function = team.slug (e.g. 'sales', 'marketing')
    const matchingSkills = skills.filter(
      (sk: { id: string; team_function: string }) =>
        sk.team_function === team.slug,
    );

    for (const skill of matchingSkills) {
      // Skip self-referential cascades
      if (skill.id === execution.skill_id && team.id === execution.team_id) {
        continue;
      }

      // Insert pending autonomous_execution for downstream skill
      const { data: newExec, error: insertErr } = await supabase
        .from('autonomous_executions')
        .insert({
          organization_id: execution.organization_id,
          team_id: team.id,
          skill_id: skill.id,
          trigger_source: 'cascade',
          trigger_event: 'upstream_complete',
          trigger_payload: {
            source_execution_id: execution.id,
            source_skill_id: execution.skill_id,
          },
          status: 'pending',
        })
        .select('id')
        .single();

      if (insertErr || !newExec) {
        result.errors.push(
          `Failed to insert autonomous_execution for skill ${skill.id}: ${insertErr?.message}`,
        );
        continue;
      }

      // Insert cascade_edge linking source → target
      const { error: edgeErr } = await supabase
        .from('cascade_edges')
        .insert({
          organization_id: execution.organization_id,
          source_execution_id: execution.id,
          target_execution_id: newExec.id,
          source_skill_id: execution.skill_id,
          target_skill_id: skill.id,
          feed_subscription_id: subIdByTeam.get(team.id) ?? null,
        });

      if (edgeErr) {
        result.errors.push(
          `Failed to insert cascade_edge: ${edgeErr.message}`,
        );
        continue;
      }

      result.edges.push(newExec.id);
      result.dispatched++;
    }
  }

  return result;
}
