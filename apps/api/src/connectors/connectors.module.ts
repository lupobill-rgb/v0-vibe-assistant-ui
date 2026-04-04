import { Module } from '@nestjs/common';
import { ConnectorsController } from './connectors.controller';
import { NangoService } from './nango.service';
import { WebhookService } from './webhook.service';

@Module({
  controllers: [ConnectorsController],
  providers: [NangoService, WebhookService],
  exports: [NangoService, WebhookService],
})
export class ConnectorsModule {}
