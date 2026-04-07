import { Controller, Post, Get, Delete, Body, Param, Query, Logger, BadRequestException, InternalServerErrorException, HttpCode } from '@nestjs/common';
import { NangoService, ConnectorType } from './nango.service';
import { getPlatformSupabaseClient } from '../supabase/client';
import { WebhookService } from './webhook.service';

interface ConnectDto {
  teamId: string;
  connectorType: ConnectorType;
  redirectUri: string;
}

@Controller('connectors')
export class ConnectorsController {
  private readonly logger = new Logger(ConnectorsController.name);

  constructor(
    private readonly nangoService: NangoService,
    private readonly webhookService: WebhookService,
  ) {}

  /**
   * GET /connectors/catalog
   * Proxies Nango's integration catalog server-side to avoid CORS/auth issues.
   * Must be defined before parameterized routes (:teamId) to avoid shadowing.
   */
  @Get('catalog')
  async getCatalog(): Promise<{ integrations: any[] }> {
    const secretKey = process.env.NANGO_SECRET_KEY;
    if (!secretKey) {
      this.logger.warn('NANGO_SECRET_KEY not set — returning empty catalog');
      return { integrations: [] };
    }
    try {
      // /providers returns the full catalog (700+), /integrations only returns configured ones
      const res = await fetch('https://api.nango.dev/providers', {
        headers: {
          'Authorization': `Bearer ${secretKey}`,
        },
      });
      if (!res.ok) {
        this.logger.warn(`Nango catalog fetch failed: ${res.status}`);
        return { integrations: [] };
      }
      const data: any = await res.json();
      const items = data?.data ?? data?.providers ?? data?.integrations ?? [];
      return {
        integrations: items.map((item: any) => ({
          id: item.name ?? item.unique_key ?? item.id ?? '',
          name: item.display_name ?? item.name ?? '',
          category: item.categories?.[0] ?? item.category ?? 'other',
          description: item.description ?? `Connect ${item.display_name ?? item.name} to VIBE.`,
          logo: item.logo_url ?? item.logo ?? '',
        })),
      };
    } catch (err) {
      this.logger.error(`Nango catalog error: ${(err as Error).message}`);
      return { integrations: [] };
    }
  }

  /**
   * POST /connectors/webhook/nango
   * Receives Nango sync events and queues autonomous skill executions.
   * No auth — Nango calls this directly. Validate via trigger_on matching.
   */
  @Post('webhook/nango')
  @HttpCode(200)
  async nangoWebhook(@Body() body: any): Promise<{ queued: number }> {
    if (!body?.connectionId || !body?.providerConfigKey || !body?.model) {
      // Return 200 always — Nango retries on non-2xx
      this.logger.warn('Nango webhook missing required fields', body);
      return { queued: 0 };
    }
    return this.webhookService.handleNangoEvent(body);
  }

  @Post('store-connection')
  async storeConnection(
    @Body() body: { teamId: string; connectorType: string; connectionId: string },
  ): Promise<{ ok: boolean }> {
    if (!body?.teamId || !body?.connectorType || !body?.connectionId) {
      throw new BadRequestException('Missing required fields: teamId, connectorType, connectionId');
    }
    this.logger.log(
      `Store connection — team=${body.teamId} connector=${body.connectorType} connectionId=${body.connectionId}`,
    );
    try {
      const sb = getPlatformSupabaseClient();
      await sb
        .from('team_integrations')
        .upsert(
          {
            team_id: body.teamId,
            provider: body.connectorType,
            connection_id: body.connectionId,
          },
          { onConflict: 'team_id,provider' },
        );
    } catch (err) {
      this.logger.warn(`Failed to store connection_id: ${(err as Error).message}`);
    }
    return { ok: true };
  }

  /**
   * POST /connectors/connect
   * Initiates OAuth flow — returns a connect URL the frontend opens.
   */
  @Post('connect')
  async connect(@Body() body: ConnectDto): Promise<{ sessionToken: string; connectionId: string }> {
    if (!body?.teamId || !body?.connectorType) {
      throw new BadRequestException('Missing required fields: teamId, connectorType');
    }
    this.logger.log(
      `Connect request — team=${body.teamId} connector=${body.connectorType}`,
    );
    const { sessionToken, connectionId } = await this.nangoService.getConnectUrl(
      body.teamId,
      body.connectorType,
      body.redirectUri,
    );

    // Upsert team_integrations so webhook handler can resolve org/team from connectionId
    try {
      const sb = getPlatformSupabaseClient();
      await sb
        .from('team_integrations')
        .upsert(
          {
            team_id: body.teamId,
            provider: body.connectorType,
            nango_connection_id: connectionId,
          },
          { onConflict: 'team_id,provider' },
        );
    } catch (err) {
      this.logger.warn(`Failed to upsert team_integrations: ${(err as Error).message}`);
    }

    return { sessionToken, connectionId };
  }

  /**
   * GET /connectors/hubspot/deals
   * Fetches HubSpot deals via Nango proxy.
   */
  @Get('hubspot/deals')
  async getHubSpotDeals(@Query('teamId') teamId: string) {
    if (!teamId) throw new BadRequestException('Missing required query param: teamId');
    this.logger.log(`HubSpot deals request — team=${teamId}`);
    const deals = await this.nangoService.fetchHubSpotDeals(teamId);
    return { deals };
  }

  /**
   * GET /connectors/hubspot/contacts
   * Fetches HubSpot contacts via Nango proxy.
   */
  @Get('hubspot/contacts')
  async getHubSpotContacts(@Query('teamId') teamId: string) {
    if (!teamId) throw new BadRequestException('Missing required query param: teamId');
    this.logger.log(`HubSpot contacts request — team=${teamId}`);
    const contacts = await this.nangoService.fetchHubSpotContacts(teamId);
    return { contacts };
  }

  /* ── Decipher (Forsta) endpoints ── */

  /**
   * GET /connectors/decipher/surveys
   * Fetches Decipher survey list via Nango proxy.
   */
  @Get('decipher/surveys')
  async getDecipherSurveys(@Query('teamId') teamId: string) {
    if (!teamId) throw new BadRequestException('Missing required query param: teamId');
    this.logger.log(`Decipher surveys request — team=${teamId}`);
    try {
      const surveys = await this.nangoService.fetchDecipherSurveys(teamId);
      return { surveys };
    } catch (err) {
      const msg = (err as Error).message ?? 'Unknown error';
      const stack = (err as Error).stack ?? '';
      this.logger.error(`Decipher surveys failed: ${msg}\n${stack}`);
      throw new InternalServerErrorException(`Decipher surveys failed: ${msg}`);
    }
  }

  /**
   * GET /connectors/decipher/surveys/:surveyPath/data
   * Fetches Decipher survey response data and stores to Supabase.
   */
  @Get('decipher/surveys/:surveyPath/data')
  async getDecipherSurveyData(
    @Param('surveyPath') surveyPath: string,
    @Query('teamId') teamId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
  ) {
    if (!teamId) throw new BadRequestException('Missing required query param: teamId');
    this.logger.log(`Decipher survey data request — team=${teamId} survey=${surveyPath}`);
    try {
      const responses = await this.nangoService.fetchDecipherSurveyData(teamId, surveyPath, { start, end, limit });

      // Store to Supabase decipher_responses table
      if (responses.length > 0) {
        try {
          const { createClient } = require('@supabase/supabase-js');
          const sb = createClient(
            process.env.SUPABASE_URL ?? '',
            process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
          );
          const rows = responses.map((r) => ({
            survey_path: surveyPath,
            respondent_id: r.respondent_id,
            response_data: r.response_data,
            completed_at: r.completed_at,
            team_id: teamId,
          }));
          const { error } = await sb.from('decipher_responses').upsert(rows, {
            onConflict: 'survey_path,respondent_id',
            ignoreDuplicates: true,
          });
          if (error) this.logger.warn(`Failed to store Decipher responses: ${error.message}`);
          else this.logger.log(`Stored ${rows.length} Decipher responses for survey=${surveyPath}`);
        } catch (err) {
          this.logger.warn(`Decipher storage error: ${(err as Error).message}`);
        }
      }

      return { responses, count: responses.length };
    } catch (err) {
      const msg = (err as Error).message ?? 'Unknown error';
      const stack = (err as Error).stack ?? '';
      this.logger.error(`Decipher survey data failed: ${msg}\n${stack}`);
      throw new InternalServerErrorException(`Decipher survey data failed: ${msg}`);
    }
  }

}

/**
 * Separate controller for parameterized /connectors/:teamId routes.
 * Must be registered AFTER ConnectorsController in the module so that
 * static routes (catalog, hubspot/*, decipher/*) take priority.
 * This avoids esbuild/tsx stripping decorator metadata and making
 * route registration order unpredictable within a single controller.
 */
@Controller('connectors')
export class ConnectorsTeamController {
  private readonly logger = new Logger(ConnectorsTeamController.name);

  constructor(private readonly nangoService: NangoService) {}

  /**
   * GET /connectors/:teamId/:connectorType
   * Returns the active connection or 404-style null.
   */
  @Get(':teamId/:connectorType')
  async getConnection(
    @Param('teamId') teamId: string,
    @Param('connectorType') connectorType: ConnectorType,
  ) {
    this.logger.log(
      `Get connection — team=${teamId} connector=${connectorType}`,
    );
    const connection = await this.nangoService.getConnection(teamId, connectorType);
    return { connection };
  }

  /**
   * DELETE /connectors/:teamId/:connectorType
   * Disconnects an integration.
   */
  @Delete(':teamId/:connectorType')
  async deleteConnection(
    @Param('teamId') teamId: string,
    @Param('connectorType') connectorType: ConnectorType,
  ) {
    this.logger.log(
      `Delete connection — team=${teamId} connector=${connectorType}`,
    );
    await this.nangoService.deleteConnection(teamId, connectorType);

    // Remove team_integrations row so stale connectionIds don't resolve
    try {
      const sb = getPlatformSupabaseClient();
      await sb
        .from('team_integrations')
        .delete()
        .eq('team_id', teamId)
        .eq('provider', connectorType);
    } catch (err) {
      this.logger.warn(`Failed to delete team_integrations row: ${(err as Error).message}`);
    }

    return { deleted: true };
  }

  /**
   * GET /connectors/:teamId
   * Lists all active connector types for a team.
   */
  @Get(':teamId')
  async listActive(@Param('teamId') teamId: string) {
    this.logger.log(`List active connectors — team=${teamId}`);
    const connectors = await this.nangoService.listActiveConnections(teamId);
    return { connectors };
  }
}
