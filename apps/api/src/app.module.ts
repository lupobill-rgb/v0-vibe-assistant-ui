import { Module } from '@nestjs/common';
import { JobsModule } from './jobs';
import { ConnectorsModule } from './connectors/connectors.module';
import { OnboardingModule } from './onboarding';
import { AssetsModule } from './assets/assets.module';
import { ReactiveKernelModule } from './reactive-kernel/reactive-kernel.module';

@Module({
  imports: [JobsModule, ConnectorsModule, OnboardingModule, AssetsModule, ReactiveKernelModule],
})
export class AppModule {}

