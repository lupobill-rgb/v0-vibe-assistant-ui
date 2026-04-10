import { Injectable, Logger } from '@nestjs/common';
import { getPlatformSupabaseClient } from '../supabase/client';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private get sb() { return getPlatformSupabaseClient(); }

  async handleNangoEvent(payload: {
    connectionId: string; providerConfigKey: string; syncName: string;
    model: string; responseResults: { added: number; updated: number; deleted: number };
    syncType: string; modifiedAfter?: string;
  }): Promise<{ queued: number }> {
    const triggerSource = `${payload.providerConfigKey}:${payload.model}`;
    this.logger.log(`Nango event received: ${triggerSource} (conn: ${payload.connectionId})`);

    const { data: integration, error: intErr } = await this.sb
      .from('team_integrations')
      .select('team_id, teams!inner(id, org_id)')
      .eq('connection_id', payload.connectionId)
      .limit(1)
      .single();
    if (intErr || !integration) {
      this.logger.warn(`Team not found: ${payload.connectionId}`);
      return { queued: 0 };
    }
    const teamsData = integration.teams as unknown as { id: string; org_id: string };
    const team = { id: teamsData.id, org_id: teamsData.org_id };

    // Upsert existing projects for matching skills instead of creating duplicates
    this.upsertSkillProjects(team.id, payload.providerConfigKey, payload.model).catch(err =>
      this.logger.error('Skill project upsert failed (non-blocking):', err.message));

    // Always sync data (free — just DB writes)
    this.syncNangoRecords(payload, team.id, team.org_id).catch(err =>
      this.logger.error('Sync failed (non-blocking):', err.message));

    // Only run LLM recommendations if kill switch is OFF
    const { data: org } = await this.sb
      .from('organizations')
      .select('autonomous_kill_switch')
      .eq('id', team.org_id)
      .single();
    if (org?.autonomous_kill_switch !== false) {
      this.logger.log(`Autonomous kill switch active for org ${team.org_id} — data synced, skipping recommendations`);
      return { queued: 0 };
    }
    this.generateRecommendations(team.org_id, team.id, payload.providerConfigKey, payload.model)
      .then(async (count) => {
        await this.sb.from('team_integrations').update({
          config: {
            last_sync_at: new Date().toISOString(),
            last_recommendation_count: count,
            last_sync_model: payload.model,
          },
        }).eq('connection_id', payload.connectionId);
      })
      .catch(err => this.logger.error('Recommendations failed (non-blocking):', err.message));
    return { queued: 0 };
  }

  async syncNangoRecords(
    payload: { model: string; connectionId: string; providerConfigKey: string },
    teamId: string, orgId: string,
  ): Promise<void> {
    const url = `https://api.nango.dev/sync/records?model=${payload.model}&connection_id=${payload.connectionId}&provider_config_key=${payload.providerConfigKey}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.NANGO_SECRET_KEY}` } }).catch(() => null);
    if (!res?.ok) { this.logger.warn(`Nango fetch failed: ${payload.model} ${res?.status ?? 'network'}`); return; }
    const { records } = await res.json() as any;
    if (!records?.length) return;

    const isDeal = ['deals', 'opportunities'].includes(payload.model);
    const isFinance = ['transactions', 'invoices', 'bills'].includes(payload.model);
    if (!isDeal && !isFinance) { this.logger.log(`Skipping unrouted model: ${payload.model}`); return; }

    const prov = payload.providerConfigKey.toLowerCase();
    for (const r of records) {
      try {
        if (isDeal) {
          const m = prov.includes('hubspot')
            ? { name: r.dealname, value: r.amount, stage: r.dealstage, expected_close_date: r.closedate, probability: r.hs_deal_stage_probability }
            : prov.includes('salesforce')
              ? { name: r.Name, value: r.Amount, stage: r.StageName, expected_close_date: r.CloseDate, probability: r.Probability }
              : { name: r.name || r.title || r.deal_name, value: r.amount || r.value, stage: r.stage || r.status };
          await this.sb.from('gtm_deals').upsert(
            { ...m, organization_id: orgId, team_id: teamId, source: payload.providerConfigKey, external_id: r.id || r.external_id },
            { onConflict: 'external_id,organization_id', ignoreDuplicates: true });
        } else {
          const m = prov.includes('quickbooks')
            ? { spend_date: r.TxnDate, amount: r.TotalAmt, vendor: r.VendorRef?.name }
            : prov.includes('xero')
              ? { spend_date: r.Date, amount: r.Total, vendor: r.Contact?.Name }
              : { spend_date: r.date || r.spend_date, amount: r.amount || r.total, vendor: r.vendor || r.supplier };
          await this.sb.from('team_spend').upsert(
            { ...m, organization_id: orgId, team_id: teamId, source: payload.providerConfigKey, external_id: r.id || r.external_id },
            { onConflict: 'external_id,organization_id', ignoreDuplicates: true });
        }
      } catch (e: any) { this.logger.warn(`Record upsert failed: ${e.message}`); }
    }
    this.logger.log(`Synced ${records.length} ${payload.model} records for team ${teamId}`);
  }

  async generateRecommendations(orgId: string, teamId: string, _provider: string, model: string): Promise<number> {
    const { data: deals } = await this.sb.from('gtm_deals').select('stage, value, probability, expected_close_date')
      .eq('organization_id', orgId).neq('stage', 'closed_lost').limit(50);
    const { data: spend } = await this.sb.from('team_spend').select('category, amount, vendor')
      .eq('team_id', teamId).order('spend_date', { ascending: false }).limit(20);
    const ago30d = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: usage } = await this.sb.from('metering_calls').select('model, cost_estimate')
      .eq('team_id', teamId).gte('created_at', ago30d);

    const prompt = `You are an AI business advisor. Based on this org data, generate 1-3 actionable recommendations for the ${model} team. Be specific and quantitative. Return ONLY a JSON array, no markdown:\n[{"title":string,"rationale":string,"proposed_action":string,"estimated_impact":string,"priority":"high"|"medium"|"low","team_function":string}]\n\nData: ${JSON.stringify({ deals, spend, usage })}`;
    let recs: any[];
    // Use DeepSeek as primary (cheapest), fall back to OpenAI
    const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
    }).catch(() => null);

    if (deepseekRes?.ok) {
      try { recs = JSON.parse(((await deepseekRes.json()) as any).choices[0].message.content); } catch { recs = []; }
    } else {
      this.logger.warn(`[LLM-FALLBACK] DeepSeek failed (${deepseekRes?.status ?? 'network'}), falling back to OpenAI`);
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
      }).catch(() => null);
      if (!openaiRes?.ok) { this.logger.warn(`OpenAI also failed (${openaiRes?.status ?? 'network'})`); return 0; }
      try { recs = JSON.parse(((await openaiRes.json()) as any).choices[0].message.content); } catch { this.logger.warn('Bad recommendations JSON from OpenAI'); return 0; }
    }
    if (!Array.isArray(recs)) return 0;

    let count = 0;
    for (const rec of recs) {
      const { data: mt } = await this.sb.from('teams').select('id')
        .eq('org_id', orgId).ilike('name', rec.team_function || '').limit(1).single();
      const tid = mt?.id || teamId;
      const { data: dup } = await this.sb.from('skill_recommendations').select('id')
        .eq('team_id', tid).eq('title', rec.title).eq('status', 'pending').limit(1);
      if (dup?.length) continue;
      const { error } = await this.sb.from('skill_recommendations').insert({
        org_id: orgId, team_id: tid, title: rec.title, rationale: rec.rationale,
        proposed_action: rec.proposed_action, estimated_impact: rec.estimated_impact,
        priority: rec.priority || 'medium', status: 'pending', recommended_by: 'vibe-ai',
      });
      if (!error) count++;
    }
    this.logger.log(`Generated ${count} recommendations for org ${orgId}`);
    return count;
  }

  /**
   * Upsert logic: find skills matching this trigger source, then for each skill
   * check if a project already exists for team_id + skill name. If found, update
   * its last_synced timestamp. If not found, skip (let autonomous processor create it).
   * This prevents duplicate dashboards from repeated webhook events.
   */
  async upsertSkillProjects(teamId: string, provider: string, model: string): Promise<void> {
    const triggerOn = `${provider}:${model}`;
    const { data: skills } = await this.sb
      .from('skill_registry')
      .select('id, skill_name')
      .eq('trigger_on', triggerOn)
      .eq('is_active', true);

    if (!skills?.length) return;

    for (const skill of skills) {
      const projectName = `[Auto] ${skill.skill_name}`;
      const { data: existing } = await this.sb
        .from('projects')
        .select('id')
        .eq('team_id', teamId)
        .eq('name', projectName)
        .maybeSingle();

      if (existing) {
        await this.sb.from('projects')
          .update({ last_synced: new Date().toISOString() })
          .eq('id', existing.id);
        this.logger.log(`Updated project ${existing.id} for skill ${skill.skill_name}`);
      }
    }
  }

  async getGuardrailStatus(orgId: string): Promise<{ autonomousEnabled: boolean }> {
    const { data } = await this.sb.from('organizations')
      .select('autonomous_kill_switch').eq('id', orgId).single();
    return { autonomousEnabled: data?.autonomous_kill_switch === false };
  }
}
