import { Module } from '@nestjs/common';
import { ConnectorsController, ConnectorsTeamController } from './connectors.controller';
import { WebhookController } from './webhook.controller';
import { NangoService } from './nango.service';
import { WebhookService } from './webhook.service';

@Module({
  controllers: [ConnectorsController, WebhookController, ConnectorsTeamController],
  providers: [NangoService, WebhookService],
  exports: [NangoService, WebhookService],
})
export class ConnectorsModule {}
