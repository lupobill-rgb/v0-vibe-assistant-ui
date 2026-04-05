import { Controller, Post, Param } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post(':sessionId/advance-step-4')
  advanceToStep4(@Param('sessionId') sessionId: string) {
    return this.onboardingService.advanceToStep4(sessionId);
  }
}
