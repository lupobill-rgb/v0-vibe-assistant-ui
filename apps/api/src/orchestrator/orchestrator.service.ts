import { ConflictException, Injectable } from '@nestjs/common';
import { ClaudePlanner, ExecutionPlan, ExecutionStep } from './planner.service';
import {
  ClaudeWorker,
  PlanStep,
  StepMode,
  WorkerResult,
} from './worker.service';

export interface StepResult {
  step_id: string;
  ok: boolean;
  output?: unknown;
  error?: string;
}

export interface OrchestratorRunInput {
  team_id: string;
  prompt: string;
  context?: Record<string, unknown>;
}

export interface OrchestratorRunResult {
  team_id: string;
  ok: boolean;
  steps: StepResult[];
}

export interface IOrchestrator {
  run(input: OrchestratorRunInput): Promise<OrchestratorRunResult>;
}

@Injectable()
export class OrchestratorService implements IOrchestrator {
  // Per-team serial flag — matches the _isExecuting pattern in
  // apps/api/src/kernel/execution-runner.ts, scoped per team_id.
  private readonly _isExecuting = new Map<string, boolean>();

  constructor(
    private readonly planner: ClaudePlanner,
    private readonly worker: ClaudeWorker,
  ) {}

  async run(input: OrchestratorRunInput): Promise<OrchestratorRunResult> {
    const team_id = input?.team_id;
    if (!team_id) {
      throw new Error('OrchestratorService.run: team_id is required');
    }
    if (this._isExecuting.get(team_id)) {
      throw new ConflictException(
        `Orchestrator already running for team ${team_id}`,
      );
    }
    this._isExecuting.set(team_id, true);
    try {
      const plan: ExecutionPlan = await this.planner.plan(
        input.prompt,
        { team_id, ...(input.context ?? {}) },
      );

      const results: StepResult[] = [];
      for (let i = 0; i < plan.steps.length; i++) {
        const planStep: ExecutionStep = plan.steps[i];
        const step: PlanStep = {
          id: `step-${i}`,
          skill_id: planStep.skill_slug,
          mode: (planStep.mode as StepMode) ?? 'build',
          prompt: planStep.rationale ?? input.prompt,
          context: planStep.inputs,
          team_id,
        };
        const wr: WorkerResult = await this.worker.executeStep(step);
        results.push({
          step_id: wr.step_id,
          ok: wr.ok,
          output: wr.output,
          error: wr.error,
        });
      }

      return {
        team_id,
        ok: results.length > 0 && results.every((r) => r.ok),
        steps: results,
      };
    } finally {
      this._isExecuting.delete(team_id);
    }
  }
}
