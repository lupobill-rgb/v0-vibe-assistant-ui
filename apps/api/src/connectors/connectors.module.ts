import { Module } from '@nestjs/common';
import { NangoService } from './nango.service';

@Module({
  providers: [NangoService],
  exports: [NangoService],
})
export class ConnectorsModule {}
