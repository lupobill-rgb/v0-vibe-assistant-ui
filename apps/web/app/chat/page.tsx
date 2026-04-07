"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { PromptCard } from "@/components/dashboard/prompt-card"
import { fetchProjectJobs, type Task } from "@/lib/api"
import { MessageSquare, Clock, CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

const STATE_CONFIG: Record<string, { label: string; icon: typeof Loader2; color: string }> = {
  completed: { label: "Completed", icon: CheckCircle2, color: "text-emerald-400" },
  failed: { label: "Failed", icon: XCircle, color: "text-red-400" },
  running: { label: "Running", icon: Loader2, color: "text-[#00E5A0]" },
  queued: { label: "Queued", icon: Clock, color: "text-amber-400" },
  planning: { label: "Planning", icon: Loader2, color: "text-[#00E5A0]" },
  building: { label: "Building", icon: Loader2, color: "text-[#00E5A0]" },
  validating: { label: "Validating", icon: Loader2, color: "text-[#00E5A0]" },
  testing: { label: "Testing", icon: Loader2, color: "text-[#00E5A0]" },
  cloning: { label: "Cloning", icon: Loader2, color: "text-[#00E5A0]" },
  building_context: { label: "Building Context", icon: Loader2, color: "text-[#00E5A0]" },
  calling_llm: { label: "Calling LLM", icon: Loader2, color: "text-[#00E5A0]" },
  applying_diff: { label: "Applying Diff", icon: Loader2, color: "text-[#00E5A0]" },
  running_preflight: { label: "Preflight", icon: Loader2, color: "text-[#00E5A0]" },
  creating_pr: { label: "Creating PR", icon: Loader2, color: "text-[#00E5A0]" },
}

function JobRow({ task }: { task: Task }) {
  const cfg = STATE_CONFIG[task.execution_state] ?? STATE_CONFIG["queued"]
  const Icon = cfg.icon
  const isRunning = !["completed", "failed", "queued"].includes(task.execution_state)
  const date = new Date(task.initiated_at).toLocaleString()

  return (
    <Link
      href={`/task/${task.task_id}`}
      className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 min-h-[56px] rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-card/80 transition-all duration-200 group"
    >
      <Icon
        className={cn("w-4 h-4 flex-shrink-0", cfg.color, isRunning && "animate-spin")}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{task.user_prompt}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{date}</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <span
          className={cn(
            "text-[11px] font-medium px-2 py-0.5 rounded-md",
            task.execution_state === "completed" && "bg-emerald-500/10 text-emerald-400",
            task.execution_state === "failed" && "bg-red-500/10 text-red-400",
            task.execution_state === "queued" && "bg-amber-500/10 text-amber-400",
            !["completed", "failed", "queued"].includes(task.execution_state) && "bg-[#00E5A0]/10 text-[#00E5A0]",
          )}
        >
          {cfg.label}
        </span>
        {task.pull_request_link && (
          <a
            href={task.pull_request_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            PR
          </a>
        )}
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  )
}

function ChatContent() {
  const searchParams = useSearchParams()
  const selectedProjectId = searchParams.get("project") ?? ""
  const initialPrompt = searchParams.get("prompt") ?? undefined
  const promptCardRef = useRef<HTMLDivElement>(null)

  const [jobs, setJobs] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (initialPrompt && promptCardRef.current) {
      setTimeout(() => {
        promptCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
    }
  }, [initialPrompt])

  // Load jobs for selected project
  useEffect(() => {
    if (!selectedProjectId) {
      setJobs([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    fetchProjectJobs(selectedProjectId)
      .then((data) => {
        setJobs(data.slice(0, 20))
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [selectedProjectId])

  return (
    <AppShell>
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-2">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00E5A0] to-[#7B61FF] flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">Chat</h1>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              Submit prompts and track your AI jobs
            </p>
          </div>
        </div>
      </div>

        {/* Prompt Card */}
        <div ref={promptCardRef}>
          <PromptCard selectedProjectId={selectedProjectId} initialPrompt={initialPrompt} />
        </div>

      {/* Recent Jobs */}
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        <h2 className="text-base font-semibold text-foreground mb-4">
          {selectedProjectId ? "Project Jobs" : "Recent Jobs"}
        </h2>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading jobs...
          </div>
        )}

        {!loading && error && (
          <div className="text-sm text-red-400 py-4">
            Failed to load jobs. Is the API running?
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="text-sm text-muted-foreground py-4">
            No jobs yet. Submit a prompt above to get started.
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <div className="flex flex-col gap-2">
            {jobs.map((job) => (
              <JobRow key={job.task_id} task={job} />
            ))}
          </div>
        )}
      </div>

    </div>
    </AppShell>
  )
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  )
}
