/**
 * Pure pipeline utility functions extracted for testability.
 * These are used by PipelineTracker to build steps and extract fixes.
 */

export type StepStatus = "done" | "active" | "pending" | "error"

export interface PipelineStep {
  id: string
  label: string
  description: string
  status: StepStatus
  agentSummary?: string
}

export interface TaskLike {
  execution_state?: string
  agent_results?: any[]
}

const STATE_ORDER = ["queued", "planning", "building", "validating", "testing", "pr", "completed"]

const STEP_DEFS = [
  { id: "1", key: "queued",     label: "Queued",        description: "Waiting for executor" },
  { id: "2", key: "planning",   label: "Planning",      description: "Decomposing prompt into tasks" },
  { id: "3", key: "building",   label: "Building",      description: "Generating and applying diffs" },
  { id: "4", key: "validating", label: "Validating",    description: "Running build, lint, and tests" },
  { id: "5", key: "testing",    label: "Security Scan",  description: "Running security analysis" },
  { id: "6", key: "pr",         label: "Pull Request",  description: "Creating GitHub PR" },
  { id: "7", key: "completed",  label: "Complete",      description: "Job finished successfully" },
]

/**
 * Normalize intermediate execution states to canonical pipeline states.
 */
export function normalizeState(state: string): string {
  if (state === "cloning" || state === "building_context") return "queued"
  if (state === "calling_llm" || state === "applying_diff") return "building"
  if (state === "running_preflight") return "validating"
  if (state === "creating_pr") return "pr"
  return state
}

/**
 * Build pipeline steps from a task's execution state.
 * Returns an array of steps with correct statuses.
 */
export function buildStepsFromTask(task: TaskLike | null): PipelineStep[] {
  const state = task?.execution_state ?? "queued"
  const normalizedState = normalizeState(state)
  const stateIdx = STATE_ORDER.indexOf(normalizedState)

  return STEP_DEFS.map((def) => {
    const idx = STATE_ORDER.indexOf(def.key)
    let status: StepStatus = "pending"

    if (state === "failed") {
      if (idx < stateIdx) status = "done"
      else if (idx === stateIdx) status = "error"
    } else {
      if (idx < stateIdx) status = "done"
      else if (idx === stateIdx) status = "active"
    }

    return { ...def, status }
  })
}

/**
 * Extract all fixes from a task's agent_results.
 * Each agent result may have a `fixes` array; this flattens them all.
 */
export function extractFixes(task: TaskLike | null): any[] {
  return (task?.agent_results ?? []).flatMap((r: any) => r.fixes ?? [])
}
