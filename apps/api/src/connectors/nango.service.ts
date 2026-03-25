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
}

export interface NangoConnection {
  connectionId: string;
  providerConfigKey: ConnectorType;
  credentials?: Record<string, unknown>;
}

@Injectable()
export class NangoService {
  private readonly logger = new Logger(NangoService.name);
  private readonly nango: any;

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

  async getConnectUrl(teamId: string, connectorType: ConnectorType, redirectUri: string): Promise<{ sessionToken: string; connectionId: string }> {
    this.ensureConfigured();
    const connectionId = `${teamId}__${connectorType}`;
    this.logger.log(`Initiating connect session team=${teamId} connector=${connectorType}`);
    const session = await this.nango.createConnectSession({
      tags: { end_user_id: teamId },
      allowed_integrations: [connectorType],
      ...(redirectUri ? { redirect_url: redirectUri } : {}),
    });
    const token = (session as { data: { token: string } }).data.token;
    return { sessionToken: token, connectionId };
  }

  async getConnection(teamId: string, connectorType: ConnectorType): Promise<NangoConnection | null> {
    this.ensureConfigured();
    const connectionId = `${teamId}__${connectorType}`;
    try {
      const connection = await this.nango.getConnection(connectorType, connectionId);
      return {
        connectionId,
        providerConfigKey: connectorType,
        credentials: connection.credentials as Record<string, unknown>,
      };
    } catch (err) {
      this.logger.warn(`No active connection team=${teamId} connector=${connectorType}: ${(err as Error).message}`);
      return null;
    }
  }

  async deleteConnection(teamId: string, connectorType: ConnectorType): Promise<void> {
    this.ensureConfigured();
    const connectionId = `${teamId}__${connectorType}`;
    await this.nango.deleteConnection(connectorType, connectionId);
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
}