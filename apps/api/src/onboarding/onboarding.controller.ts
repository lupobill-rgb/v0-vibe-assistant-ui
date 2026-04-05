import { Controller, Post, Body, Logger, BadRequestException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);
  constructor(private readonly onboardingService: OnboardingService) {}

  /** Initialize (or retrieve) an onboarding session for an organization. */
  @Post('init')
  async init(@Body() body: { organizationId: string }) {
    if (!body?.organizationId) throw new BadRequestException('Missing organizationId');
    return this.onboardingService.initSession(body.organizationId);
  }

  /** Generic step advancement — works for any step transition. */
  @Post('advance')
  async advance(
    @Body()
    body: {
      sessionId: string;
      fromStep: number;
      verdict?: string;
      verdictMessage?: string;
      recommendation?: string;
    },
  ) {
    if (!body?.sessionId) throw new BadRequestException('Missing sessionId');
    if (body?.fromStep == null) throw new BadRequestException('Missing fromStep');
    return this.onboardingService.advanceStep(
      body.sessionId,
      body.fromStep,
      body.verdict,
      body.verdictMessage,
      body.recommendation,
    );
  }

  /** Step 3→4 specialization: resolves project, queues dashboard jobs, advances. */
  @Post('advance-step4')
  async advanceStep4(@Body() body: { sessionId: string }) {
    if (!body?.sessionId) throw new BadRequestException('Missing sessionId');
    return this.onboardingService.advanceToStep4(body.sessionId);
  }
}
