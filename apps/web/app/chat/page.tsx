"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { PromptCard } from "@/components/dashboard/prompt-card"
import { CreateProjectDialog } from "@/components/dialogs/create-project-dialog"
import { ImportGithubDialog } from "@/components/dialogs/import-github-dialog"
import { fetchProjectJobs, fetchProjects, type Task, type Project } from "@/lib/api"
import { MessageSquare, Clock, CheckCircle2, XCircle, Loader2, ExternalLink, Plus, Github } from "lucide-react"
import { cn } from "@/lib/utils"

const STATE_CONFIG: Record<string, { label: string; icon: typeof Loader2; color: string }> = {
  completed: { label: "Completed", icon: CheckCircle2, color: "text-emerald-400" },
  failed: { label: "Failed", icon: XCircle, color: "text-red-400" },
  running: { label: "Running", icon: Loader2, color: "text-[#4F8EFF]" },
  queued: { label: "Queued", icon: Clock, color: "text-amber-400" },
  planning: { label: "Planning", icon: Loader2, color: "text-[#4F8EFF]" },
  building: { label: "Building", icon: Loader2, color: "text-[#4F8EFF]" },
  validating: { label: "Validating", icon: Loader2, color: "text-[#4F8EFF]" },
  testing: { label: "Testing", icon: Loader2, color: "text-[#4F8EFF]" },
  cloning: { label: "Cloning", icon: Loader2, color: "text-[#4F8EFF]" },
  building_context: { label: "Building Context", icon: Loader2, color: "text-[#4F8EFF]" },
  calling_llm: { label: "Calling LLM", icon: Loader2, color: "text-[#4F8EFF]" },
  applying_diff: { label: "Applying Diff", icon: Loader2, color: "text-[#4F8EFF]" },
  running_preflight: { label: "Preflight", icon: Loader2, color: "text-[#4F8EFF]" },
  creating_pr: { label: "Creating PR", icon: Loader2, color: "text-[#4F8EFF]" },
}

function JobRow({ task }: { task: Task }) {
  const cfg = STATE_CONFIG[task.execution_state] ?? STATE_CONFIG["queued"]
  const Icon = cfg.icon
  const isRunning = !["completed", "failed", "queued"].includes(task.execution_state)
  const date = new Date(task.initiated_at).toLocaleString()

  return (
    <Link
      href={`/task/${task.task_id}`}
      className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-card/80 transition-all duration-200 group"
    >
      <Icon
        className={cn("w-4 h-4 flex-shrink-0", cfg.color, isRunning && "animate-spin")}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{task.user_prompt}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{date}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className={cn(
            "text-[11px] font-medium px-2 py-0.5 rounded-md",
            task.execution_state === "completed" && "bg-emerald-500/10 text-emerald-400",
            task.execution_state === "failed" && "bg-red-500/10 text-red-400",
            task.execution_state === "queued" && "bg-amber-500/10 text-amber-400",
            !["completed", "failed", "queued"].includes(task.execution_state) && "bg-[#4F8EFF]/10 text-[#4F8EFF]",
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

function ProjectCard({
  project,
  selected,
  lastJob,
  onClick,
}: {
  project: Project
  selected: boolean
  lastJob?: Task
  onClick: () => void
}) {
  const initial = project.name.charAt(0).toUpperCase()
  const date = new Date(project.created_at).toLocaleDateString()
  const lastState = lastJob ? (STATE_CONFIG[lastJob.execution_state] ?? STATE_CONFIG["queued"]) : null

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col rounded-xl border bg-card p-4 text-left transition-all duration-200 hover:bg-card/80",
        selected
          ? "border-[#A855F7] ring-1 ring-[#A855F7]/30"
          : "border-border hover:border-primary/30"
      )}
    >
      {/* Thumbnail placeholder */}
      <div className="w-full aspect-[16/10] rounded-lg bg-secondary/60 flex items-center justify-center mb-3 overflow-hidden">
        <span className="text-2xl font-bold text-muted-foreground/40 select-none">{initial}</span>
      </div>
      {/* Name + date */}
      <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{date}</p>
      {/* Last job badge */}
      {lastState && lastJob && (
        <span
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md w-fit",
            lastJob.execution_state === "completed" && "bg-emerald-500/10 text-emerald-400",
            lastJob.execution_state === "failed" && "bg-red-500/10 text-red-400",
            lastJob.execution_state === "queued" && "bg-amber-500/10 text-amber-400",
            !["completed", "failed", "queued"].includes(lastJob.execution_state) && "bg-[#4F8EFF]/10 text-[#4F8EFF]",
          )}
        >
          {lastState.label}
        </span>
      )}
    </button>
  )
}

function ChatContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialProjectId = searchParams.get("project") ?? undefined

  const [jobs, setJobs] = useState<Task[]>([])
  const [allJobs, setAllJobs] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId ?? "")

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const refreshProjects = (selectId?: string) => {
    fetchProjects().then((data) => {
      setProjects(data)
      if (selectId) {
        setSelectedProjectId(selectId)
        router.push(`/chat?project=${selectId}`)
      } else if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id)
      }
    })
  }

  // Load projects on mount
  useEffect(() => {
    fetchProjects().then((data) => {
      setProjects(data)
      if (initialProjectId && data.some((p) => p.id === initialProjectId)) {
        setSelectedProjectId(initialProjectId)
      } else if (data.length > 0 && !initialProjectId) {
        setSelectedProjectId(data[0].id)
      }
    })
  }, [])

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
        setAllJobs((prev) => {
          const map = new Map(prev.map((j) => [j.task_id, j]))
          data.forEach((j) => map.set(j.task_id, j))
          return Array.from(map.values())
        })
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [selectedProjectId])

  // Helper: get latest job for a project from cached allJobs
  const latestJobFor = (projectId: string) =>
    allJobs
      .filter((j) => j.project_id === projectId)
      .sort((a, b) => b.initiated_at - a.initiated_at)[0]

  return (
    <AppShell>
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="px-6 pt-8 pb-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F8EFF] to-[#A855F7] flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Chat</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Submit prompts and track your AI jobs
            </p>
          </div>
        </div>
      </div>

        {/* Project Gallery */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Projects</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/50 hover:border-border transition-all duration-200"
                title="New Project"
              >
                <Plus className="w-3.5 h-3.5" />
                New
              </button>
              <button
                onClick={() => setImportDialogOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/50 hover:border-border transition-all duration-200"
                title="Import from GitHub"
              >
                <Github className="w-3.5 h-3.5" />
                Import
              </button>
            </div>
          </div>

          {projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  selected={p.id === selectedProjectId}
                  lastJob={latestJobFor(p.id)}
                  onClick={() => setSelectedProjectId(p.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic py-4">
              No projects yet. Create one or import from GitHub.
            </div>
          )}
        </div>

        {/* Prompt Card */}
        <PromptCard selectedProjectId={selectedProjectId} />

      {/* Recent Jobs */}
      <div className="px-6 py-8">
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

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(id) => refreshProjects(id)}
      />
      <ImportGithubDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImported={(id) => refreshProjects(id)}
      />
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
