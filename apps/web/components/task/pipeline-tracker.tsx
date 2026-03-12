"use client"

import { useEffect, useState } from "react"
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Bug,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { fetchJob, subscribeToJobUpdates, createJob, type Task, API_URL } from "@/lib/api"
import type { AgentResultSummary } from "@/lib/api"
import { extractFixes } from "@/lib/pipeline-utils"

export type StepStatus = "done" | "active" | "pending" | "error"

export interface PipelineStep {
  id: string
  label: string
  description: string
  status: StepStatus
  agentSummary?: string
}

function buildStepsFromTask(task: Task | null): PipelineStep[] {
  const state = task?.execution_state ?? "queued"

  // Map legacy/intermediate states to canonical pipeline states
  const normalizedState =
    state === "cloning" || state === "building_context" ? "queued" :
    state === "calling_llm" || state === "applying_diff" ? "building" :
    state === "running_preflight" ? "validating" :
    state === "creating_pr" ? "pr" :
    state

  const stateOrder = ["queued", "planning", "security", "building", "validating", "ux", "testing", "pr", "completed"]
  const stateIdx = stateOrder.indexOf(normalizedState)

  const stepDefs = [
    { id: "1", key: "queued",      label: "Queued",           description: "Waiting for executor" },
    { id: "2", key: "planning",    label: "Planning",         description: "Decomposing prompt into tasks" },
    { id: "3", key: "security",    label: "Security",         description: "RLS coverage and secrets scan" },
    { id: "4", key: "building",    label: "Building",         description: "Generating and applying diffs" },
    { id: "5", key: "validating",  label: "Validating",       description: "Running build and tests" },
    { id: "6", key: "ux",          label: "UX",               description: "Design consistency and accessibility" },
    { id: "7", key: "testing",     label: "QA",               description: "Test generation and verification" },
    { id: "8", key: "completed",   label: "Complete",         description: "Job finished successfully" },
  ]

  // Attach agent summaries from persisted results
  const agentResults: AgentResultSummary[] = task?.agent_results ?? []

  return stepDefs.map((def) => {
    const idx = stateOrder.indexOf(def.key)
    let status: StepStatus = "pending"

    if (state === "failed") {
      if (idx < stateIdx) status = "done"
      else if (idx === stateIdx) status = "error"
    } else if (normalizedState === "completed") {
      status = "done"
    } else {
      if (idx < stateIdx) status = "done"
      else if (idx === stateIdx) status = "active"
    }

    // Match agent result to step by key name
    const agentResult = agentResults.find((r) => r.agent === def.key)

    return {
      ...def,
      status,
      agentSummary: agentResult?.summary,
    }
  })
}

function StatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />
    case "active":
      return <Loader2 className="w-5 h-5 text-[#4F8EFF] animate-spin" />
    case "error":
      return <AlertCircle className="w-5 h-5 text-red-400" />
    default:
      return <Circle className="w-5 h-5 text-muted-foreground/40" />
  }
}

interface PipelineTrackerProps {
  taskId: string
  task?: Task | null
}

export function PipelineTracker({ taskId, task: taskProp }: PipelineTrackerProps) {
  const [internalTask, setInternalTask] = useState<Task | null>(null)
  const task = taskProp ?? internalTask
  const [steps, setSteps] = useState<PipelineStep[]>(buildStepsFromTask(null))
  const [expandedStep, setExpandedStep] = useState<string | null>(null)
  const [applyingFix, setApplyingFix] = useState<number | null>(null)
  const [fixResult, setFixResult] = useState<{ success: boolean; summary: string } | null>(null)
  const [debugLoading, setDebugLoading] = useState(false)
  const router = useRouter()

  // When parent passes task prop, just rebuild steps from it
  useEffect(() => {
    if (taskProp) {
      setSteps(buildStepsFromTask(taskProp))
    }
  }, [taskProp])

  // When no task prop: fetch on mount + realtime + polling fallback
  useEffect(() => {
    if (taskProp) return // parent controls state

    let pollTimer: ReturnType<typeof setInterval> | null = null
    let realtimeFired = false

    fetchJob(taskId).then((t) => {
      if (t) {
        setInternalTask(t)
        setSteps(buildStepsFromTask(t))
      }
    })

    const unsubscribe = subscribeToJobUpdates(taskId, (t) => {
      realtimeFired = true
      setInternalTask(t)
      setSteps(buildStepsFromTask(t))
      // Stop polling once realtime is working
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
    })

    // Polling fallback: start after 5s if realtime hasn't fired
    const fallbackTimeout = setTimeout(() => {
      if (realtimeFired) return
      pollTimer = setInterval(async () => {
        const t = await fetchJob(taskId)
        if (t) {
          setInternalTask(t)
          setSteps(buildStepsFromTask(t))
          if (t.execution_state === 'completed' || t.execution_state === 'failed') {
            if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
          }
        }
      }, 3000)
    }, 5000)

    return () => {
      unsubscribe()
      clearTimeout(fallbackTimeout)
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [taskId, taskProp])

  console.log('[tracker render]', task?.execution_state, steps.length)
  const completedCount = steps.filter((s) => s.status === "done").length
  const totalCount = steps.length
  const progress = (completedCount / totalCount) * 100

  const allFixes = extractFixes(task)

  const isTerminal =
    task?.execution_state === "completed" || task?.execution_state === "failed"

  const applyFix = async (fixIndex: number) => {
    setApplyingFix(fixIndex)
    setFixResult(null)
    try {
      const res = await fetch(`${API_URL}/jobs/${taskId}/diff/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fix_index: fixIndex }),
      })
      const data = await res.json()
      setFixResult({ success: data.success, summary: data.summary })
    } catch (err) {
      setFixResult({ success: false, summary: 'Request failed — check network connection.' })
    } finally {
      setApplyingFix(null)
    }
  }

  const triggerDebug = async () => {
    if (!task?.project_id || !task?.user_prompt) return
    setDebugLoading(true)
    try {
      const result = await createJob({
        prompt: `[DEBUG] The previous job failed. Original prompt: "${task.user_prompt}". Diagnose the failure and generate a corrected version.`,
        project_id: task.project_id,
        base_branch: 'main',
      })
      if (result.task_id) {
        router.push(`/building/${task.project_id}`)
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setDebugLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-border flex-shrink-0">
        <Link
          href="/"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-card-foreground truncate">
            {task?.user_prompt
              ? task.user_prompt.slice(0, 40) + (task.user_prompt.length > 40 ? "…" : "")
              : "Loading…"}
          </h2>
          <p className="text-[10px] text-muted-foreground capitalize">
            {task?.execution_state ?? "queued"}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-5 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-foreground">Progress</span>
          <span className="text-xs text-muted-foreground font-mono">
            {completedCount}/{totalCount} steps
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              task?.execution_state === "failed"
                ? "bg-red-500"
                : "bg-gradient-to-r from-[#4F8EFF] to-[#A855F7]"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Pipeline Steps */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-0">
          {steps.map((step, index) => (
            <div key={step.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <StatusIcon status={step.status} />
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-px flex-1 my-1 min-h-[24px]",
                      step.status === "done" ? "bg-emerald-400/40" : "bg-border"
                    )}
                  />
                )}
              </div>

              <div className="pb-5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      step.status === "done"   ? "text-foreground" :
                      step.status === "active" ? "text-[#4F8EFF]" :
                      step.status === "error"  ? "text-red-400" :
                                                 "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {step.description}
                </p>
                {step.agentSummary && (
                  <p className={cn(
                    "text-[10px] mt-0.5 leading-relaxed font-mono",
                    step.status === "error" ? "text-red-400/80" : "text-emerald-400/70"
                  )}>
                    {step.agentSummary}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border flex items-center gap-2 flex-shrink-0">
        {task?.pull_request_link ? (
          <a
            href={task.pull_request_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Pull Request
          </a>
        ) : isTerminal && task?.execution_state === "failed" ? (
          <button
            onClick={triggerDebug}
            disabled={debugLoading}
            className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Bug className="w-3.5 h-3.5" />
            {debugLoading ? "Launching Debug Agent…" : "Debug & Retry"}
          </button>
        ) : (
          <div className="flex-1 flex items-center justify-center h-9 text-xs text-muted-foreground font-mono">
            {isTerminal
              ? "Completed — no PR"
              : "Waiting for completion…"}
          </div>
        )}
      </div>
    </div>
  )
}
