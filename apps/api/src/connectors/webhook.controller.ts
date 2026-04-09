import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { getPlatformSupabaseClient } from '../supabase/client';
import { AutonomousProcessorService } from './autonomous-processor.service';

/**
 * Autonomous webhook controller — receives Nango sync events and creates
 * autonomous_executions for skills with matching trigger_on config.
 * No auth guard: Nango calls this externally. Always returns 200.
 */
@Controller('connectors')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  constructor(private readonly autonomousProcessor: AutonomousProcessorService) {}
  private get sb() { return getPlatformSupabaseClient(); }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() body: any): Promise<{ ok: true; queued: number }> {
    try {
      const { connectionId, providerConfigKey, syncName, model, queryTimeStamp } = body ?? {};
      this.logger.log(`Webhook raw body: ${JSON.stringify(body)}`);
      if (!connectionId || !providerConfigKey || !syncName) {
        this.logger.warn('Webhook missing required fields', { connectionId, providerConfigKey, syncName });
        return { ok: true, queued: 0 };
      }

      const resolved = await this.resolveOrgAndTeam(connectionId);
      if (!resolved) {
        this.logger.warn(`Unknown connection: ${connectionId}`);
        return { ok: true, queued: 0 };
      }

      const skills = await this.resolveMatchingSkills(resolved.orgId, resolved.teamId, providerConfigKey, syncName, model);
      if (!skills.length) {
        this.logger.log(`No matching skills for ${providerConfigKey}:${syncName}`);
        return { ok: true, queued: 0 };
      }

      const payload = { connectionId, providerConfigKey, syncName, model, queryTimeStamp };
      let queued = 0;
      for (const skill of skills) {
        this.createAutonomousJob(skill, resolved.orgId, resolved.teamId, providerConfigKey, payload)
          .then(created => {
            if (created) {
              queued++;
              setImmediate(() => this.autonomousProcessor.processQueuedExecutions().catch(e => this.logger.error(e)));
            }
          })
          .catch(err => this.logger.error(`Job creation failed: ${err.message}`));
      }

      return { ok: true, queued };
    } catch (err) {
      this.logger.error(`Webhook handler error: ${(err as Error).message}`);
      return { ok: true, queued: 0 };
    }
  }

  private async resolveOrgAndTeam(connectionId: string): Promise<{ orgId: string; teamId: string } | null> {
    const { data, error } = await this.sb
      .from('team_integrations')
      .select('team_id, teams!inner(organization_id)')
      .eq('nango_connection_id', connectionId)
      .limit(1)
      .single();
    if (error || !data) return null;
    return { orgId: (data as any).teams.organization_id, teamId: data.team_id };
  }

  private async resolveMatchingSkills(
    _orgId: string, _teamId: string, provider: string, syncName: string, model?: string,
  ): Promise<any[]> {
    const { data, error } = await this.sb
      .from('skill_registry')
      .select('*')
      .eq('autonomous_enabled', true)
      .not('trigger_on', 'is', null);
    if (error || !data) return [];
    return data.filter((s: any) => {
      const t = s.trigger_on;
      return t?.provider === provider && (t?.sync === syncName || (model && t?.sync === model));
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
        organization_id: orgId,
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
