/**
 * Orchestrator Interfaces
 *
 * Contracts for the three orchestration roles:
 *   - IPlanner  : turns a job prompt + skill registry into an ExecutionPlan
 *   - IWorker   : executes a single PlanStep and returns a WorkerResult
 *   - IOrchestrator : runs an ExecutionPlan end-to-end
 *
 * Implementations live elsewhere. This file is types only.
 */

import type {
  ExecutionPlan,
  OrchestratorResult,
  PlanStep,
  SkillRegistryRow,
  WorkerResult,
} from './orchestrator.types';

/**
 * Input passed to a planner for a single job.
 */
export interface PlannerInput {
  job_id: string;
  team_id: string;
  prompt: string;
  available_skills: SkillRegistryRow[];
  context: Record<string, unknown>;
}

/**
 * Planner — produces an ExecutionPlan from a prompt and skill catalog.
 */
export interface IPlanner {
  plan(input: PlannerInput): Promise<ExecutionPlan>;
}

/**
 * Runtime context passed to a worker when executing a step.
 */
export interface WorkerContext {
  job_id: string;
  team_id: string;
  plan_id: string;
  upstream_results: Record<string, WorkerResult>;
}

/**
 * Worker — executes exactly one plan step.
 */
export interface IWorker {
  readonly skill_name: string;
  execute(step: PlanStep, context: WorkerContext): Promise<WorkerResult>;
}

/**
 * Orchestrator — drives an ExecutionPlan to completion, honoring
 * step dependencies and aggregating worker results.
 */
export interface IOrchestrator {
  run(plan: ExecutionPlan): Promise<OrchestratorResult>;
}
