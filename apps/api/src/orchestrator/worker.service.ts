import { Injectable, Logger } from '@nestjs/common';
import { anthropicWithGpt4Breaker } from './planner.service';
import type { Plan } from './planner.service';

export interface WorkerOutput {
  artifact: string;
  model: string;
  usedFallback: boolean;
}

@Injectable()
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);

  async run(plan: Plan, teamId: string): Promise<WorkerOutput> {
    const system =
      'You are a worker. Execute the plan and return the final artifact.';
    const prompt = `Team ${teamId}\nPlan:\n${plan.steps
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n')}`;
    const result = await anthropicWithGpt4Breaker(prompt, system);
    if (result.usedFallback) {
      this.logger.warn(`worker used gpt-4 fallback (team=${teamId})`);
    }
    return {
      artifact: result.text,
      model: result.model,
      usedFallback: result.usedFallback,
    };
  }
}
