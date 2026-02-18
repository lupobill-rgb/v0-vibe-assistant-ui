import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { fetchJob, type Task } from '../../api/client'

type StepStatus = 'done' | 'active' | 'pending' | 'error'

interface PipelineStep {
  id: string
  label: string
  description: string
  status: StepStatus
}

const STAGES = [
  { id: 'queued', label: 'Queued', description: 'Waiting for executor to pick up' },
  { id: 'cloning', label: 'Cloning Repo', description: 'Setting up isolated git worktree' },
  { id: 'building_context', label: 'Building Context', description: 'Scanning repo with ripgrep' },
  { id: 'calling_llm', label: 'Calling LLM', description: 'Generating unified diff via GPT-4' },
  { id: 'applying_diff', label: 'Applying Diff', description: 'Validating and applying changes' },
  { id: 'running_preflight', label: 'Running Preflight', description: 'CI-parity checks (lint, test)' },
  { id: 'creating_pr', label: 'Creating PR', description: 'Opening pull request on GitHub' },
  { id: 'completed', label: 'Completed', description: 'All done!' },
]

function stageIndex(state: string): number {
  const idx = STAGES.findIndex((s) => s.id === state)
  return idx === -1 ? 0 : idx
}

function buildSteps(task: Task | null): PipelineStep[] {
  if (!task) return STAGES.map((s) => ({ ...s, status: 'pending' as StepStatus }))
  const currentIdx = stageIndex(task.execution_state)
  const isFailed = task.execution_state === 'failed'
  const isCompleted = task.execution_state === 'completed'

  return STAGES.map((s, idx) => {
    let status: StepStatus = 'pending'
    if (isFailed && idx === currentIdx) status = 'error'
    else if (idx < currentIdx || isCompleted) status = 'done'
    else if (idx === currentIdx) status = 'active'
    return { ...s, status }
  })
}

function StatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />
    case 'active':
      return <Loader2 className="w-5 h-5 text-[#4F8EFF] animate-spin" />
    case 'error':
      return <AlertCircle className="w-5 h-5 text-red-400" />
    default:
      return <Circle className="w-5 h-5 text-muted-foreground/40" />
  }
}

interface Props {
  taskId: string
}

export function PipelineTracker({ taskId }: Props) {
  const [task, setTask] = useState<Task | null>(null)

  useEffect(() => {
    let active = true

    const poll = async () => {
      try {
        const data = await fetchJob(taskId)
        if (!active) return
        setTask(data)
        const terminal = data.execution_state === 'completed' || data.execution_state === 'failed'
        if (!terminal) setTimeout(poll, 3000)
      } catch {
        // ignore transient errors, keep polling
        if (active) setTimeout(poll, 5000)
      }
    }

    poll()
    return () => {
      active = false
    }
  }, [taskId])

  const steps = buildSteps(task)
  const completedCount = steps.filter((s) => s.status === 'done').length
  const progress = (completedCount / steps.length) * 100

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-border flex-shrink-0">
        <Link
          to="/"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-card-foreground truncate">
            {task?.user_prompt?.slice(0, 40) ?? 'Running task…'}
          </h2>
          <p className="text-[10px] text-muted-foreground capitalize">
            {task?.execution_state?.replace(/_/g, ' ') ?? 'Queued'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-foreground">Progress</span>
          <span className="text-xs text-muted-foreground font-mono">
            {completedCount}/{steps.length} steps
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StatusIcon status={step.status} />
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-px flex-1 my-1 min-h-[24px]',
                    step.status === 'done' ? 'bg-emerald-400/40' : 'bg-border'
                  )}
                />
              )}
            </div>
            <div className="pb-5 min-w-0 flex-1">
              <span
                className={cn(
                  'text-sm font-medium',
                  step.status === 'done'
                    ? 'text-foreground'
                    : step.status === 'active'
                    ? 'text-[#4F8EFF]'
                    : step.status === 'error'
                    ? 'text-red-400'
                    : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border flex-shrink-0">
        {task?.pull_request_link ? (
          <a
            href={task.pull_request_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 h-9 rounded-lg bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Pull Request
          </a>
        ) : (
          <div className="flex w-full items-center justify-center gap-2 h-9 rounded-lg bg-secondary text-muted-foreground text-sm">
            {task?.execution_state === 'completed' ? 'No PR created' : 'PR pending…'}
          </div>
        )}
      </div>
    </div>
  )
}
