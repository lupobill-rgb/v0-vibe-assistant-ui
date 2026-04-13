import { Injectable, Logger } from '@nestjs/common';

export enum ConnectorType {
  SALESFORCE       = 'salesforce',
  REVOS_CRM        = 'revos-crm',
  HUBSPOT          = 'hubspot',
  SLACK            = 'slack',
  GOOGLE_ANALYTICS = 'google-analytics-4',
  MIXPANEL         = 'mixpanel',
  AIRTABLE         = 'airtable',
  SNOWFLAKE        = 'snowflake',
  POSTGRES         = 'postgres',
  BIGQUERY         = 'google-bigquery',
  S3               = 'aws-s3',
  DECIPHER         = 'decipher',
}

export interface NangoConnection {
  connectionId: string;
  providerConfigKey: ConnectorType;
  credentials?: Record<string, unknown>;
}

export interface HubSpotDeal {
  id: string;
  name: string;
  stage: string;
  amount: number | null;
  close_date: string | null;
  owner: string | null;
  company: string | null;
}

export interface HubSpotContact {
  id: string;
  name: string;
  email: string;
  company: string | null;
  last_activity: string | null;
}

export interface DecipherSurvey {
  path: string;
  title: string;
  state: string;
  created: string | null;
}

export interface DecipherResponse {
  respondent_id: string;
  response_data: Record<string, unknown>;
  completed_at: string | null;
}

@Injectable()
export class NangoService {
  private readonly logger = new Logger(NangoService.name);
  private readonly nango: any;
  private connectionCache = new Map<string, { result: NangoConnection | null; timestamp: number }>();
  private static readonly CACHE_TTL_MS = 300_000; // 5 minutes

  constructor() {
    const secretKey = process.env.NANGO_SECRET_KEY;
    if (!secretKey) {
      this.logger.warn('NANGO_SECRET_KEY is not configured — connector features disabled');
      this.nango = null;
      return;
    }
    const { Nango } = require('@nangohq/node');
    this.nango = new Nango({ secretKey });
    this.logger.log('NangoService initialized');
  }

  private ensureConfigured(): void {
    if (!this.nango) {
      throw new Error('NangoService is not configured — set NANGO_SECRET_KEY to enable connectors');
    }
  }

  async getConnectSession(teamId: string, connectorType: ConnectorType, redirectUri?: string): Promise<{ sessionToken: string }> {
    this.ensureConfigured();
    this.logger.log(`Initiating connect session team=${teamId} connector=${connectorType}`);
    const session = await this.nango.createConnectSession({
      tags: { end_user_id: teamId },
      allowed_integrations: [connectorType],
      ...(redirectUri ? { redirect_url: redirectUri } : {}),
    });
    const token = (session as { data: { token: string } }).data.token;
    return { sessionToken: token };
  }

  async getConnection(teamId: string, connectorType: ConnectorType): Promise<NangoConnection | null> {
    this.ensureConfigured();
    const cacheKey = `${teamId}:${connectorType}`;
    const cached = this.connectionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < NangoService.CACHE_TTL_MS) {
      return cached.result;
    }

    const connectionId = `${teamId}__${connectorType}`;
    try {
      const connection = await this.nango.getConnection(connectorType, connectionId);
      const result: NangoConnection = {
        connectionId,
        providerConfigKey: connectorType,
        credentials: connection.credentials as Record<string, unknown>,
      };
      this.connectionCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (err) {
      this.logger.warn(`No active connection team=${teamId} connector=${connectorType}: ${(err as Error).message}`);
      this.connectionCache.set(cacheKey, { result: null, timestamp: Date.now() });
      return null;
    }
  }

  async deleteConnection(teamId: string, connectorType: ConnectorType): Promise<void> {
    this.ensureConfigured();
    const connectionId = `${teamId}__${connectorType}`;
    await this.nango.deleteConnection(connectorType, connectionId);
    this.connectionCache.delete(`${teamId}:${connectorType}`);
    this.logger.log(`Connection deleted team=${teamId} connector=${connectorType}`);
  }

  async listActiveConnections(teamId: string): Promise<ConnectorType[]> {
    this.ensureConfigured();
    const checks = await Promise.allSettled(
      Object.values(ConnectorType).map((ct) => this.getConnection(teamId, ct)),
    );
    return Object.values(ConnectorType).filter(
      (_, i) =>
        checks[i].status === 'fulfilled' &&
        (checks[i] as PromiseFulfilledResult<NangoConnection | null>).value !== null,
    );
  }

  async fetchHubSpotDeals(teamId: string): Promise<HubSpotDeal[]> {
    this.ensureConfigured();
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    );
    const { data: integration } = await sb
      .from('team_integrations')
      .select('nango_connection_id')
      .eq('team_id', teamId)
      .eq('provider', 'hubspot')
      .single();
    if (!integration?.nango_connection_id) {
      throw new Error(`No HubSpot connection for team ${teamId}`);
    }
    const connectionId = integration.nango_connection_id as string;
    this.logger.log(`Fetching HubSpot deals connection=${connectionId}`);
    const resp = await this.nango.proxy({
      method: 'GET',
      endpoint: '/crm/v3/objects/deals',
      providerConfigKey: ConnectorType.HUBSPOT,
      connectionId,
      params: {
        limit: '100',
        properties: 'dealname,dealstage,amount,closedate,hubspot_owner_id,hs_lastmodifieddate',
        associations: 'companies',
      },
    });
    const results = resp?.data?.results ?? [];
    return results.map((d: any) => ({
      id: d.id,
      name: d.properties?.dealname ?? '',
      stage: d.properties?.dealstage ?? '',
      amount: d.properties?.amount ? Number(d.properties.amount) : null,
      close_date: d.properties?.closedate ?? null,
      owner: d.properties?.hubspot_owner_id ?? null,
      company: d.associations?.companies?.results?.[0]?.id ?? null,
    }));
  }

  async fetchHubSpotContacts(teamId: string): Promise<HubSpotContact[]> {
    this.ensureConfigured();
    const connectionId = `${teamId}__${ConnectorType.HUBSPOT}`;
    this.logger.log(`Fetching HubSpot contacts connection=${connectionId}`);
    const resp = await this.nango.proxy({
      method: 'GET',
      endpoint: '/crm/v3/objects/contacts',
      providerConfigKey: ConnectorType.HUBSPOT,
      connectionId,
      params: {
        limit: '100',
        properties: 'firstname,lastname,email,company,notes_last_updated',
        associations: 'companies',
      },
    });
    const results = resp?.data?.results ?? [];
    return results.map((c: any) => ({
      id: c.id,
      name: [c.properties?.firstname, c.properties?.lastname].filter(Boolean).join(' '),
      email: c.properties?.email ?? '',
      company: c.properties?.company ?? null,
      last_activity: c.properties?.notes_last_updated ?? null,
    }));
  }
  /* ── Decipher (Forsta) — uses team_integrations, not Nango ── */

  private async getDecipherApiKey(teamId: string): Promise<string> {
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    );
    const { data, error } = await sb
      .from('team_integrations')
      .select('api_key')
      .eq('team_id', teamId)
      .eq('provider', 'decipher')
      .single();
    if (error || !data?.api_key) {
      throw new Error(`No Decipher API key found for team=${teamId}`);
    }
    return data.api_key;
  }

  async fetchDecipherSurveys(teamId: string): Promise<DecipherSurvey[]> {
    const apiKey = await this.getDecipherApiKey(teamId);
    this.logger.log(`Fetching Decipher surveys team=${teamId}`);
    const resp = await fetch('https://selfserve.decipherinc.com/api/v1/surveys', {
      headers: { 'x-apikey': apiKey, 'Accept': 'application/json' },
    });
    if (!resp.ok) throw new Error(`Decipher API error: ${resp.status} ${resp.statusText}`);
    const surveys = await resp.json();
    return (Array.isArray(surveys) ? surveys : []).map((s: any) => ({
      path: s.path ?? s.survey_path ?? '',
      title: s.title ?? s.name ?? '',
      state: s.state ?? 'unknown',
      created: s.created ?? s.date_created ?? null,
    }));
  }

  async fetchDecipherSurveyData(
    teamId: string,
    surveyPath: string,
    params: { start?: string; end?: string; limit?: string },
  ): Promise<DecipherResponse[]> {
    const apiKey = await this.getDecipherApiKey(teamId);
    this.logger.log(`Fetching Decipher survey data team=${teamId} survey=${surveyPath}`);
    const url = new URL(`https://selfserve.decipherinc.com/api/v1/surveys/${surveyPath}/data`);
    url.searchParams.set('format', 'json');
    if (params.start) url.searchParams.set('start', params.start);
    if (params.end) url.searchParams.set('end', params.end);
    if (params.limit) url.searchParams.set('limit', params.limit);

    const resp = await fetch(url.toString(), {
      headers: { 'x-apikey': apiKey, 'Accept': 'application/json' },
    });
    if (!resp.ok) throw new Error(`Decipher API error: ${resp.status} ${resp.statusText}`);
    const rows = await resp.json();
    return (Array.isArray(rows) ? rows : []).map((r: any) => ({
      respondent_id: String(r.uuid ?? r.respondent_id ?? r.id ?? ''),
      response_data: r,
      completed_at: r.date ?? r.completed_at ?? null,
    }));
  }
}

/**
 * Standalone NangoService instance for non-DI contexts (e.g. context-injector).
 */
let _standalone: NangoService | null = null;
export function getNangoService(): NangoService {
  if (!_standalone) _standalone = new NangoService();
  return _standalone;
}
