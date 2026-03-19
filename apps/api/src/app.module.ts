import { Module } from '@nestjs/common';
import { JobsModule } from './jobs';
import { ConnectorsModule } from './connectors/connectors.module';

@Module({
  imports: [JobsModule, ConnectorsModule],
})
export class AppModule {}

