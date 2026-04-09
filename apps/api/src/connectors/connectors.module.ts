import { Module } from '@nestjs/common';
import { ConnectorsController, ConnectorsTeamController } from './connectors.controller';
import { WebhookController } from './webhook.controller';
import { NangoService } from './nango.service';
import { WebhookService } from './webhook.service';
import { AutonomousProcessorService } from './autonomous-processor.service';
import { AutonomousSchedulerService } from './autonomous-scheduler.service';

@Module({
  controllers: [ConnectorsController, WebhookController, ConnectorsTeamController],
  providers: [NangoService, WebhookService, AutonomousProcessorService, AutonomousSchedulerService],
  exports: [NangoService, WebhookService],
})
export class ConnectorsModule {}
