import { ConflictException, Injectable } from '@nestjs/common';
import { ClaudePlanner } from './planner.service';
import { ClaudeWorker, PlanStep as WorkerPlanStep } from './worker.service';

export interface PlanStep {
  id: string;
  depends_on?: string[];
  [key: string]: unknown;
}

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
      const execPlan = await this.planner.plan(
        input.prompt,
        { team_id, ...input.context },
      );
      const plan = execPlan.steps.map((s, i) => ({
        id: String(i),
        ...s,
      })) as PlanStep[];

      const ordered = topoSort(plan);
      const results: StepResult[] = [];
      const failed = new Set<string>();

      for (const step of ordered) {
        const deps = step.depends_on ?? [];
        const blocker = deps.find((d) => failed.has(d));
        if (blocker) {
          results.push({
            step_id: step.id,
            ok: false,
            error: `dependency_failed:${blocker}`,
          });
          failed.add(step.id);
          continue;
        }
        try {
          const workerStep: WorkerPlanStep = {
            id: step.id,
            skill_id: String(step.skill_slug ?? step.id),
            mode: 'build',
            prompt: typeof step.inputs === 'object' ? JSON.stringify(step.inputs) : String(step.inputs ?? ''),
            team_id,
          };
          const result = await this.worker.executeStep(workerStep);
          if (!result.ok) throw new Error(result.error ?? 'step failed');
          const output = result.output;
          results.push({ step_id: step.id, ok: true, output });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          results.push({ step_id: step.id, ok: false, error: message });
          failed.add(step.id);
        }
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

function topoSort(steps: PlanStep[]): PlanStep[] {
  const byId = new Map<string, PlanStep>(steps.map((s) => [s.id, s]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const out: PlanStep[] = [];

  const visit = (s: PlanStep) => {
    if (visited.has(s.id)) return;
    if (visiting.has(s.id)) {
      throw new Error(`Orchestrator plan has a cycle at step ${s.id}`);
    }
    visiting.add(s.id);
    for (const depId of s.depends_on ?? []) {
      const dep = byId.get(depId);
      if (dep) visit(dep);
    }
    visiting.delete(s.id);
    visited.add(s.id);
    out.push(s);
  };

  for (const s of steps) visit(s);
  return out;
}
