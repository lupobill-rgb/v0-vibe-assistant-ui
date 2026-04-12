import {
  Controller, Post, Body, Headers, HttpCode, HttpException, Logger,
} from '@nestjs/common';
import { PlannerService, Plan } from './planner.service';
import { WorkerService, WorkerOutput } from './worker.service';

interface RunBody { user_prompt: string; team_id: string }

export interface OrchestratorResult {
  ok: boolean;
  team_id: string;
  plan: Plan;
  output: WorkerOutput;
  stats: { plannerFallback: boolean; workerFallback: boolean };
}

@Controller('internal/orchestrator')
export class OrchestratorController {
  private readonly logger = new Logger(OrchestratorController.name);

  constructor(
    private readonly planner: PlannerService,
    private readonly worker: WorkerService,
  ) {}

  @Post('run')
  @HttpCode(200)
  async run(
    @Headers('x-internal-secret') secret: string | undefined,
    @Body() body: RunBody,
  ): Promise<OrchestratorResult> {
    // Auth pattern mirrors apps/api/src/reactive-kernel/webhook.controller.ts
    const expected = process.env.INTERNAL_ORCHESTRATOR_SECRET;
    if (!expected || !secret || secret !== expected) {
      throw new HttpException('Unauthorized', 401);
    }
    if (!body?.user_prompt || !body?.team_id) {
      throw new HttpException({ error: 'missing_field' }, 400);
    }
    try {
      const plan = await this.planner.plan(body.user_prompt, body.team_id);
      const output = await this.worker.run(plan, body.team_id);
      return {
        ok: true, team_id: body.team_id, plan, output,
        stats: { plannerFallback: plan.usedFallback, workerFallback: output.usedFallback },
      };
    } catch (err) {
      this.logger.error(`orchestrator run failed: ${(err as Error).message}`);
      throw new HttpException(
        { error: 'orchestrator_failed', message: (err as Error).message }, 500,
      );
    }
  }
}
