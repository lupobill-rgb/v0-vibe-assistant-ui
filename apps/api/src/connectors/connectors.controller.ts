import { Controller, Post, Get, Delete, Body, Param, Logger } from '@nestjs/common';
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
  async connect(@Body() body: ConnectDto): Promise<{ url: string }> {
    this.logger.log(
      `Connect request — team=${body.teamId} connector=${body.connectorType}`,
    );
    const url = await this.nangoService.getConnectUrl(
      body.teamId,
      body.connectorType,
      body.redirectUri,
    );
    return { url };
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
