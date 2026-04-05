import { Controller, Post, Body, Logger, BadRequestException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('advance-step4')
  async advanceStep4(@Body() body: { sessionId: string }) {
    if (!body?.sessionId) throw new BadRequestException('Missing sessionId');
    return this.onboardingService.advanceToStep4(body.sessionId);
  }
}
