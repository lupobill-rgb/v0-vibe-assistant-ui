import { Module } from '@nestjs/common';
import { JobsModule } from './jobs';
import { ConnectorsModule } from './connectors/connectors.module';
import { OnboardingModule } from './onboarding';

@Module({
  imports: [JobsModule, ConnectorsModule, OnboardingModule],
})
export class AppModule {}

