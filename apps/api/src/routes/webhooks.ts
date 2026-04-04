import express, { Request, Response } from 'express';
import { getPlatformSupabaseClient } from '../supabase/client';
import { dispatchPendingExecutions } from '../kernel/execution-dispatcher';
import { ConnectorType } from '../connectors/nango.service';

const router = express.Router();

const WEBHOOK_SECRET = process.env.VIBE_WEBHOOK_SECRET;

/** Whitelist of valid provider slugs to prevent wildcard injection in LIKE queries. */
const VALID_PROVIDERS = new Set<string>(Object.values(ConnectorType));

/**
 * POST /api/webhooks/:provider
 *
 * Receives an incoming webhook from an external provider (e.g. hubspot, stripe, slack).
 * Looks up skills in skill_registry whose trigger_on matches the provider,
 * then inserts a pending autonomous_execution for each matched skill.
 *
 * trigger_on values use the format "provider:model" (e.g. "hubspot:deals").
 * The model is extracted from the webhook payload body.model field (Nango sync events).
 * If a model is present, we match "provider:model" exactly; otherwise we match
 * any trigger_on starting with "provider:".
 */
router.post('/:provider', async (req: Request, res: Response) => {
  try {
    // Auth: require shared secret header (if configured)
    if (WEBHOOK_SECRET) {
      const provided = req.headers['x-vibe-webhook-secret'] as string | undefined;
      if (provided !== WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'Invalid or missing webhook secret' });
      }
    }

    const payload = req.body ?? {};
    // Prefer providerConfigKey from Nango webhook payload over URL route param
    const provider: string =
      (typeof payload.providerConfigKey === 'string' && payload.providerConfigKey) ||
      req.params.provider;
    if (!provider) {
      return res.status(400).json({ error: 'Missing provider parameter' });
    }

    // Validate provider against known enum to prevent wildcard injection in LIKE queries
    if (!VALID_PROVIDERS.has(provider.toLowerCase())) {
      return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }
    const sb = getPlatformSupabaseClient();

    // Extract model from Nango sync webhook payload (e.g. "deals", "contacts")
    const model: string | undefined =
      typeof payload.model === 'string' ? payload.model.toLowerCase() :
      typeof payload.syncType === 'string' ? payload.syncType.toLowerCase() :
      undefined;

    // 1. Find skills triggered by this provider.
    //    trigger_on stores "provider:model" (e.g. "hubspot:deals").
    //    If a model is present in the payload, match exactly; otherwise match all
    //    skills for the provider using a prefix filter.
    let skillQuery = sb
      .from('skill_registry')
      .select('id, plugin_name, skill_name, team_function')
      .eq('is_active', true);

    if (model) {
      skillQuery = skillQuery.eq('trigger_on', `${provider}:${model}`);
    } else {
      skillQuery = skillQuery.like('trigger_on', `${provider}:%`);
    }

    const { data: skills, error: skillError } = await skillQuery;

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

    // Resolve org/team from Nango connectionId via team_integrations
    const connectionId: string | undefined =
      typeof payload.connectionId === 'string' ? payload.connectionId : undefined;

    let resolvedOrgId: string | undefined = orgIdHeader;
    let resolvedTeamId: string | undefined = teamIdHeader;

    if ((!resolvedOrgId || !resolvedTeamId) && connectionId) {
      const { data: integration } = await sb
        .from('team_integrations')
        .select('team_id, teams!inner(org_id)')
        .eq('nango_connection_id', connectionId)
        .limit(1)
        .single();

      if (integration) {
        const teamsData = integration.teams as unknown as { org_id: string };
        resolvedTeamId = resolvedTeamId ?? integration.team_id;
        resolvedOrgId = resolvedOrgId ?? teamsData.org_id;
        console.log(`[webhook] Resolved org=${resolvedOrgId} team=${resolvedTeamId} from connectionId=${connectionId}`);
      } else {
        console.warn(`[webhook] No team_integrations row for connectionId=${connectionId}`);
      }
    }

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
      let orgId = resolvedOrgId;
      let teamId = resolvedTeamId;

      // Fallback: resolve from teams table by team_function if still missing
      if (!orgId || !teamId) {
        const { data: team } = await sb
          .from('teams')
          .select('id, org_id')
          .eq('team_function', skill.team_function)
          .limit(1)
          .single();

        if (!team) {
          console.warn(`[webhook] No team found for team_function=${skill.team_function}, skipping skill ${skill.id}`);
          continue;
        }
        orgId = orgId ?? team.org_id;
        teamId = teamId ?? team.id;
      }

      executions.push({
        organization_id: orgId!,
        team_id: teamId!,
        skill_id: skill.id,
        trigger_source: model ? `${provider}:${model}` : provider,
        trigger_event: typeof payload.event === 'string' ? payload.event : (model ? `${provider}:${model}` : provider),
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

    // Fire dispatcher asynchronously — don't block the webhook response
    dispatchPendingExecutions().catch((err) => {
      console.error('[webhook] dispatchPendingExecutions error:', err);
    });

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
