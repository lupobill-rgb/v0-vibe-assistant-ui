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

    // Non-blocking sync + recommendations (no autonomous executions — those fire from user actions only)
    this.syncNangoRecords(payload, team.id, team.org_id).catch(err =>
      this.logger.error('Sync failed (non-blocking):', err.message));
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
    this.generateRecommendations(orgId, teamId, payload.providerConfigKey, payload.model).catch(err =>
      this.logger.error('Recommendations failed (non-blocking):', err.message));
  }

  async generateRecommendations(orgId: string, teamId: string, _provider: string, model: string): Promise<void> {
    const { data: deals } = await this.sb.from('gtm_deals').select('stage, value, probability, expected_close_date')
      .eq('organization_id', orgId).neq('stage', 'closed_lost').limit(50);
    const { data: spend } = await this.sb.from('team_spend').select('category, amount, vendor')
      .eq('team_id', teamId).order('spend_date', { ascending: false }).limit(20);
    const ago30d = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: usage } = await this.sb.from('metering_calls').select('model, cost_estimate')
      .eq('team_id', teamId).gte('created_at', ago30d);

    const prompt = `You are an AI business advisor. Based on this org data, generate 1-3 actionable recommendations for the ${model} team. Be specific and quantitative. Return ONLY a JSON array, no markdown:\n[{"title":string,"rationale":string,"proposed_action":string,"estimated_impact":string,"priority":"high"|"medium"|"low","team_function":string}]\n\nData: ${JSON.stringify({ deals, spend, usage })}`;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) { this.logger.warn(`Anthropic API error: ${res.status}`); return; }

    let recs: any[];
    try { recs = JSON.parse(((await res.json()) as any).content[0].text); } catch { this.logger.warn('Bad recommendations JSON'); return; }
    if (!Array.isArray(recs)) return;

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
  }

  async getGuardrailStatus(orgId: string): Promise<{ autonomousEnabled: boolean }> {
    const { data } = await this.sb.from('org_feature_flags')
      .select('autonomous_enabled').eq('org_id', orgId).single();
    return { autonomousEnabled: data?.autonomous_enabled ?? false };
  }
}
