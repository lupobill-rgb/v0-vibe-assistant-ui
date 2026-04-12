import { Controller, Post, Body, Get, Query, BadRequestException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('advance-step4')
  async advanceStep4(@Body() body: { sessionId: string }) {
    if (!body?.sessionId) throw new BadRequestException('Missing sessionId');
    return this.onboardingService.advanceToStep4(body.sessionId);
  }

  @Post('initialize-trial')
  async initializeTrial(@Body() body: { orgId: string }) {
    if (!body?.orgId) throw new BadRequestException('Missing orgId');
    return this.onboardingService.initializeTrial(body.orgId);
  }

  @Get('check-trial')
  async checkTrial(@Query('orgId') orgId: string) {
    if (!orgId) throw new BadRequestException('Missing orgId query parameter');
    return this.onboardingService.checkTrialExpiry(orgId);
  }
}
