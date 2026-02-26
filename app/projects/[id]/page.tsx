"use client"

import { use, useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import {
  createJob,
  TENANT_ID,
  type Project,
  type Task,
} from "@/lib/api"
import {
  ArrowLeft,
  ArrowUp,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Hourglass,
  GitPullRequest,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

const API_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:3001"

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

function getStatusIcon(state: string) {
  if (state === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
  if (state === "failed") return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
  if (state === "queued") return <Hourglass className="w-4 h-4 text-amber-400 flex-shrink-0" />
  return <Loader2 className="w-4 h-4 text-[#4F8EFF] animate-spin flex-shrink-0" />
}

function getStatusLabel(state: string) {
  if (state === "completed") return "Completed"
  if (state === "failed") return "Failed"
  if (state === "queued") return "Queued"
  return "Running"
}

function ProjectDetailSkeleton() {
  return (
    <div className="p-6 max-w-3xl">
      <Skeleton className="h-4 w-24 mb-6" />
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="bg-card rounded-2xl border border-border p-5 mb-8">
        <Skeleton className="h-4 w-20 mb-3" />
        <Skeleton className="h-24 w-full mb-3" />
        <Skeleton className="h-9 w-24 ml-auto" />
      </div>
      <div>
        <Skeleton className="h-4 w-24 mb-3" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full mb-2 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params)
  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
  const [projectLoading, setProjectLoading] = useState(true)
  const [projectError, setProjectError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<Task[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [jobsError, setJobsError] = useState<string | null>(null)

  const [prompt, setPrompt] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProject = useCallback(async () => {
    setProjectLoading(true)
    setProjectError(null)
    try {
      const response = await fetch(`${API_URL}/projects/${id}`, {
        headers: { "X-Tenant-Id": TENANT_ID },
      })
      if (!response.ok) {
        if (response.status === 404) {
          setProject(null)
          setProjectError("Project not found.")
        } else {
          throw new Error(`API returned ${response.status}`)
        }
        return
      }
      const data: Project = await response.json()
      setProject(data)
    } catch {
      setProjectError("Failed to load project. Is the API running?")
    } finally {
      setProjectLoading(false)
    }
  }, [id])

  const loadJobs = useCallback(async () => {
    setJobsLoading(true)
    setJobsError(null)
    try {
      const response = await fetch(`${API_URL}/projects/${id}/jobs`, {
        headers: { "X-Tenant-Id": TENANT_ID },
      })
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      const data: Task[] = await response.json()
      setJobs(data)
    } catch {
      setJobsError("Failed to load jobs.")
    } finally {
      setJobsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadProject()
    loadJobs()
  }, [loadProject, loadJobs])

  const handleSubmit = async () => {
    if (!prompt.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await createJob({
        prompt: prompt.trim(),
        project_id: id,
        base_branch: "main",
      })
      if (result.error) {
        setError(result.error)
      } else if (result.task_id) {
        router.push(`/task/${result.task_id}`)
      }
    } catch {
      setError("Failed to submit job. Is the API running?")
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Loading state
  if (projectLoading) {
    return (
      <AppShell>
        <ProjectDetailSkeleton />
      </AppShell>
    )
  }

  // Error state
  if (projectError && !project) {
    return (
      <AppShell>
        <div className="p-6">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            All Projects
          </Link>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              Unable to load project
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              {projectError}
            </p>
            <Button variant="outline" size="sm" onClick={loadProject} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!project) {
    return (
      <AppShell>
        <div className="p-6">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            All Projects
          </Link>
          <p className="text-muted-foreground">Project not found.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="p-6 max-w-3xl">
        {/* Back link */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          All Projects
        </Link>

        {/* Project header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
          {project.repository_url && (
            <a
              href={project.repository_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {project.repository_url}
            </a>
          )}
        </div>

        {/* Prompt submission */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-8">
          <h2 className="text-sm font-medium text-foreground mb-3">New Job</h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build or change..."
            rows={4}
            disabled={submitting}
            className="w-full bg-secondary/40 text-foreground placeholder:text-muted-foreground text-sm rounded-lg px-3 py-2 border border-border resize-none outline-none focus:border-primary/40 transition-colors leading-relaxed disabled:opacity-60 mb-3"
          />
          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-mono">
              {prompt.length > 0 ? `${prompt.length} chars · ` : ""}⌘↵ to submit
            </span>
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || submitting}
              className={[
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                prompt.trim() && !submitting
                  ? "bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white hover:opacity-90"
                  : "bg-secondary text-muted-foreground cursor-not-allowed",
              ].join(" ")}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
              Run Job
            </button>
          </div>
        </div>

        {/* Job history */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-foreground">Recent Jobs</h2>
            {jobsError && (
              <Button variant="ghost" size="sm" onClick={loadJobs} className="gap-1.5 h-7 text-xs">
                <RefreshCw className="w-3 h-3" />
                Retry
              </Button>
            )}
          </div>
          {jobsLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : jobsError ? (
            <div className="flex flex-col items-center py-8 text-center">
              <AlertCircle className="w-5 h-5 text-red-400 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">{jobsError}</p>
              <Button variant="outline" size="sm" onClick={loadJobs} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No jobs yet. Submit a prompt above to get started.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {jobs.map((job) => (
                <Link
                  key={job.task_id}
                  href={`/task/${job.task_id}`}
                  className="group bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="mt-0.5">{getStatusIcon(job.execution_state)}</div>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{job.user_prompt}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {getStatusLabel(job.execution_state)}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(job.initiated_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {job.pull_request_link && (
                      <a
                        href={job.pull_request_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/20 transition-colors flex-shrink-0"
                      >
                        <GitPullRequest className="w-3 h-3" />
                        View PR
                      </a>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
