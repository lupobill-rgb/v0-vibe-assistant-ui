/**
 * Orchestrator Types
 *
 * Type definitions for the VIBE orchestrator pipeline:
 * planner -> workers -> result aggregation.
 *
 * No runtime imports. Types only.
 */

export type SkillMode = 'build' | 'runtime' | 'hybrid';

/**
 * Golden template match result returned by kernel/context-injector
 * resolveGoldenTemplateMatch() and consumed by the orchestrator and
 * dashboard/planner/fast-path handlers. When matched is false, all
 * other fields are empty/null.
 */
export interface GoldenMatch {
  matched: boolean;
  skillName: string;
  content: string;
  htmlSkeleton: string | null;
  sampleData: Record<string, unknown> | null;
}

/**
 * Row shape from the skill_registry table used by the orchestrator.
 * Columns beyond orchestration concerns are omitted.
 */
export interface SkillRegistryRow {
  skill_name: string;
  plugin_name: string | null;
  team_function: string | null;
  mode: SkillMode;
  html_skeleton: string | null;
  connector_required: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * A single unit of work in an execution plan.
 * Steps may depend on zero or more prior steps by id.
 */
export interface PlanStep {
  id: string;
  skill_name: string;
  mode: SkillMode;
  prompt: string;
  depends_on: string[];
  inputs: Record<string, unknown>;
  timeout_ms: number;
}

/**
 * A planned DAG of steps produced by the planner.
 */
export interface ExecutionPlan {
  plan_id: string;
  job_id: string;
  team_id: string;
  created_at: string;
  steps: PlanStep[];
  metadata: Record<string, unknown>;
}

/**
 * Status outcomes for a worker execution.
 */
export type WorkerStatus = 'success' | 'failure' | 'skipped' | 'timeout';

/**
 * Result returned by a single worker for a single plan step.
 */
export interface WorkerResult {
  step_id: string;
  skill_name: string;
  status: WorkerStatus;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  tokens_used: number;
}

/**
 * Aggregated result of an orchestrator run over one ExecutionPlan.
 */
export interface OrchestratorResult {
  plan_id: string;
  job_id: string;
  status: 'completed' | 'failed' | 'partial';
  results: WorkerResult[];
  total_tokens: number;
  total_duration_ms: number;
  error: string | null;
}
