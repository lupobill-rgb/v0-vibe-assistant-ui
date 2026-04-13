import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  OrchestratorService,
  OrchestratorRunResult,
} from './orchestrator.service';

interface RunBody {
  user_prompt: string;
  team_id: string;
}

@Controller('internal/orchestrator')
export class OrchestratorController {
  private readonly logger = new Logger(OrchestratorController.name);

  constructor(private readonly orchestrator: OrchestratorService) {}

  @Post('run')
  @HttpCode(200)
  async run(
    @Headers('x-internal-secret') secret: string | undefined,
    @Body() body: RunBody,
  ): Promise<OrchestratorRunResult> {
    // Auth pattern mirrors apps/api/src/reactive-kernel/webhook.controller.ts
    const expected = process.env.INTERNAL_ORCHESTRATOR_SECRET;
    if (!expected || !secret || secret !== expected) {
      throw new HttpException('Unauthorized', 401);
    }
    if (!body?.user_prompt || !body?.team_id) {
      throw new HttpException({ error: 'missing_field' }, 400);
    }
    try {
      return await this.orchestrator.run({
        team_id: body.team_id,
        prompt: body.user_prompt,
      });
    } catch (err) {
      this.logger.error(`orchestrator run failed: ${(err as Error).message}`);
      throw new HttpException(
        { error: 'orchestrator_failed', message: (err as Error).message },
        500,
      );
    }
  }
}
