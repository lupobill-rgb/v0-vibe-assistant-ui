import { Module } from '@nestjs/common';
import { ConnectorsController, ConnectorsTeamController } from './connectors.controller';
import { NangoService } from './nango.service';
import { WebhookService } from './webhook.service';

@Module({
  controllers: [ConnectorsController, ConnectorsTeamController],
  providers: [NangoService, WebhookService],
  exports: [NangoService, WebhookService],
})
export class ConnectorsModule {}
