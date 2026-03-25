import { Module } from '@nestjs/common';
import { ConnectorsController } from './connectors.controller';
import { NangoService } from './nango.service';

@Module({
  controllers: [ConnectorsController],
  providers: [NangoService],
  exports: [NangoService],
})
export class ConnectorsModule {}
