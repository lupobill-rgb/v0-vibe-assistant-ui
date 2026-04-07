import { Injectable, Logger } from '@nestjs/common';
import { getPlatformSupabaseClient } from '../supabase/client';

const COOLDOWN_MINUTES = 15;
const MAX_CASCADE_DEPTH = 5;

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private get sb() {
    return getPlatformSupabaseClient();
  }

  async handleNangoEvent(payload: {
    connectionId: string;
    providerConfigKey: string;
    syncName: string;
    model: string;
    responseResults: { added: number; updated: number; deleted: number };
    syncType: string;
    modifiedAfter?: string;
  }): Promise<{ queued: number }> {
    // Derive trigger source: e.g. "hubspot:deals"
    const triggerSource = `${payload.providerConfigKey}:${payload.model}`;
    this.logger.log(`Nango event received: ${triggerSource} (conn: ${payload.connectionId})`);

    // Resolve org + team from connectionId (format: teamId__connectorType)
    const [teamId] = payload.connectionId.split('__');
    if (!teamId) {
      this.logger.warn(`Could not parse teamId from connectionId: ${payload.connectionId}`);
      return { queued: 0 };
    }

    const { data: team, error: teamErr } = await this.sb
      .from('teams')
      .select('id, org_id')
      .eq('id', teamId)
      .single();

    if (teamErr || !team) {
      this.logger.warn(`Team not found for id: ${teamId}`);
      return { queued: 0 };
    }

    // Find matching skills with trigger_on containing this triggerSource
    const { data: skills, error: skillErr } = await this.sb
      .from('skill_registry')
      .select('id, skill_name')
      .eq('is_active', true)
      .contains('trigger_on', JSON.stringify([triggerSource]));

    if (skillErr || !skills?.length) {
      this.logger.log(`No skills matched trigger: ${triggerSource}`);
      return { queued: 0 };
    }

    let queued = 0;

    for (const skill of skills) {
      // Cooldown check: skip if this skill fired for this org in last 15 min
      const cooldownCutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString();
      const { data: recent } = await this.sb
        .from('autonomous_executions')
        .select('id')
        .eq('organization_id', team.org_id)
        .eq('skill_id', skill.id)
        .gte('created_at', cooldownCutoff)
        .limit(1);

      if (recent?.length) {
        this.logger.log(`Cooldown active for skill ${skill.skill_name}, skipping`);
        continue;
      }

      // Queue execution
      const { error: insertErr } = await this.sb
        .from('autonomous_executions')
        .insert({
          organization_id: team.org_id,
          team_id: team.id,
          skill_id: skill.id,
          trigger_source: triggerSource,
          trigger_event: payload.syncName,
          trigger_payload: {
            connectionId: payload.connectionId,
            model: payload.model,
            responseResults: payload.responseResults,
            modifiedAfter: payload.modifiedAfter,
          },
          status: 'queued',
          cascade_depth: 0,
        });

      if (insertErr) {
        this.logger.error(`Failed to queue skill ${skill.skill_name}: ${insertErr.message}`);
      } else {
        this.logger.log(`Queued autonomous execution: skill=${skill.skill_name} org=${team.org_id}`);
        queued++;
      }
    }

    return { queued };
  }

  async getGuardrailStatus(orgId: string): Promise<{ autonomousEnabled: boolean }> {
    const { data } = await this.sb
      .from('org_feature_flags')
      .select('autonomous_enabled')
      .eq('org_id', orgId)
      .single();
    return { autonomousEnabled: data?.autonomous_enabled ?? false };
  }
}
