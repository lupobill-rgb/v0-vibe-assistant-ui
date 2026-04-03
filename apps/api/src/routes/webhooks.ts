import express, { Request, Response } from 'express';
import { getPlatformSupabaseClient } from '../supabase/client';

const router = express.Router();

/**
 * POST /api/webhooks/:provider
 *
 * Receives an incoming webhook from an external provider (e.g. hubspot, stripe, slack).
 * Looks up skills in skill_registry whose trigger_on matches the provider,
 * then inserts a pending autonomous_execution for each matched skill.
 */
router.post('/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    if (!provider) {
      return res.status(400).json({ error: 'Missing provider parameter' });
    }

    const payload = req.body ?? {};
    const sb = getPlatformSupabaseClient();

    // 1. Find skills triggered by this provider
    const { data: skills, error: skillError } = await sb
      .from('skill_registry')
      .select('id, plugin_name, skill_name, team_function')
      .eq('trigger_on', provider)
      .eq('is_active', true);

    if (skillError) {
      console.error(`[webhook] skill_registry lookup failed for provider=${provider}:`, skillError.message);
      return res.status(500).json({ error: 'Failed to query skill registry' });
    }

    if (!skills || skills.length === 0) {
      return res.status(200).json({ matched: 0, message: `No skills triggered by provider: ${provider}` });
    }

    // 2. Resolve org_id and team_id from the first matched skill's team_function.
    //    Webhooks carry an optional x-vibe-org-id header; otherwise we look up
    //    the first org that owns a team matching the skill's team_function.
    const orgIdHeader = req.headers['x-vibe-org-id'] as string | undefined;
    const teamIdHeader = req.headers['x-vibe-team-id'] as string | undefined;

    const executions: Array<{
      organization_id: string;
      team_id: string;
      skill_id: string;
      trigger_source: string;
      trigger_event: string;
      trigger_payload: unknown;
      status: string;
    }> = [];

    for (const skill of skills) {
      let orgId = orgIdHeader;
      let teamId = teamIdHeader;

      // If org/team not provided via headers, attempt to resolve from teams table
      if (!orgId || !teamId) {
        const { data: team } = await sb
          .from('teams')
          .select('id, organization_id')
          .eq('team_function', skill.team_function)
          .limit(1)
          .single();

        if (!team) {
          console.warn(`[webhook] No team found for team_function=${skill.team_function}, skipping skill ${skill.id}`);
          continue;
        }
        orgId = orgId ?? team.organization_id;
        teamId = teamId ?? team.id;
      }

      executions.push({
        organization_id: orgId!,
        team_id: teamId!,
        skill_id: skill.id,
        trigger_source: provider,
        trigger_event: typeof payload.event === 'string' ? payload.event : provider,
        trigger_payload: payload,
        status: 'pending',
      });
    }

    if (executions.length === 0) {
      return res.status(200).json({ matched: skills.length, queued: 0, message: 'No resolvable org/team for matched skills' });
    }

    // 3. Batch insert into autonomous_executions
    const { data: inserted, error: insertError } = await sb
      .from('autonomous_executions')
      .insert(executions)
      .select('id');

    if (insertError) {
      console.error(`[webhook] autonomous_executions insert failed:`, insertError.message);
      return res.status(500).json({ error: 'Failed to create execution records' });
    }

    return res.status(201).json({
      matched: skills.length,
      queued: inserted?.length ?? 0,
      execution_ids: inserted?.map((r: { id: string }) => r.id) ?? [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[webhook] unhandled error:', message);
    return res.status(500).json({ error: message });
  }
});

export default router;
