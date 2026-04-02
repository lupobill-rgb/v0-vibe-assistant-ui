import { Controller, Post, Get, Delete, Body, Param, Query, Logger, BadRequestException } from '@nestjs/common';
import { NangoService, ConnectorType } from './nango.service';

interface ConnectDto {
  teamId: string;
  connectorType: ConnectorType;
  redirectUri: string;
}

@Controller('connectors')
export class ConnectorsController {
  private readonly logger = new Logger(ConnectorsController.name);

  constructor(private readonly nangoService: NangoService) {}

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
    const surveys = await this.nangoService.fetchDecipherSurveys(teamId);
    return { surveys };
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
  }

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
