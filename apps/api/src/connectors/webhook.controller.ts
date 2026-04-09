import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { getPlatformSupabaseClient } from '../supabase/client';

/**
 * Autonomous webhook controller — receives Nango sync events and creates
 * autonomous_executions for skills with matching trigger_on config.
 * No auth guard: Nango calls this externally. Always returns 200.
 */
@Controller('connectors')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private get sb() { return getPlatformSupabaseClient(); }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() body: any): Promise<{ ok: true; queued: number }> {
    try {
      const { connectionId, providerConfigKey, syncName, model, queryTimeStamp } = body ?? {};
      if (!connectionId || !providerConfigKey || !syncName || !model || !queryTimeStamp) {
        this.logger.warn('Webhook missing required fields', { connectionId, providerConfigKey, syncName });
        return { ok: true, queued: 0 };
      }

      const resolved = await this.resolveOrgAndTeam(connectionId);
      if (!resolved) {
        this.logger.warn(`Unknown connection: ${connectionId}`);
        return { ok: true, queued: 0 };
      }

      const skills = await this.resolveMatchingSkills(resolved.orgId, resolved.teamId, providerConfigKey, syncName);
      if (!skills.length) {
        this.logger.log(`No matching skills for ${providerConfigKey}:${syncName}`);
        return { ok: true, queued: 0 };
      }

      const payload = { connectionId, providerConfigKey, syncName, model, queryTimeStamp };
      let queued = 0;
      for (const skill of skills) {
        this.createAutonomousJob(skill, resolved.orgId, resolved.teamId, providerConfigKey, payload)
          .then(created => { if (created) queued++; })
          .catch(err => this.logger.error(`Job creation failed: ${err.message}`));
      }

      return { ok: true, queued };
    } catch (err) {
      this.logger.error(`Webhook handler error: ${(err as Error).message}`);
      return { ok: true, queued: 0 };
    }
  }

  private async resolveOrgAndTeam(connectionId: string): Promise<{ orgId: string; teamId: string } | null> {
    const parts = connectionId.split('__');
    if (parts.length < 2) return null;
    const teamId = parts[0];

    const { data, error } = await this.sb
      .from('teams')
      .select('id, org_id')
      .eq('id', teamId)
      .limit(1)
      .single();
    if (error || !data) return null;
    return { orgId: data.org_id, teamId: data.id };
  }

  private async resolveMatchingSkills(
    _orgId: string, _teamId: string, provider: string, syncName: string,
  ): Promise<any[]> {
    const { data, error } = await this.sb
      .from('skill_registry')
      .select('*')
      .eq('autonomous_enabled', true)
      .not('trigger_on', 'is', null);
    if (error || !data) return [];
    return data.filter((s: any) => {
      const t = s.trigger_on;
      return t?.provider === provider && t?.sync === syncName;
    });
  }

  private async createAutonomousJob(
    skill: any, orgId: string, teamId: string, provider: string, payload: any,
  ): Promise<boolean> {
    // Cooldown: skip if same skill+team ran in last 15 min (non-failed)
    const { data: recent } = await this.sb
      .from('autonomous_executions')
      .select('id')
      .eq('skill_id', skill.id)
      .eq('team_id', teamId)
      .neq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .limit(1);

    if (recent?.length) {
      this.logger.log(`Cooldown active for skill=${skill.id} team=${teamId}, skipping`);
      return false;
    }

    const { data, error } = await this.sb
      .from('autonomous_executions')
      .insert({
        skill_id: skill.id,
        org_id: orgId,
        team_id: teamId,
        trigger_source: provider,
        trigger_event: payload,
        status: 'queued',
        cascade_depth: 0,
      })
      .select('id')
      .single();

    if (error) {
      this.logger.error(`Failed to insert autonomous_execution: ${error.message}`);
      return false;
    }
    this.logger.log(`Autonomous execution created: ${data.id} for skill=${skill.id}`);
    return true;
  }
}
