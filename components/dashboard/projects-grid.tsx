"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { ProjectCard, type NormalizedProject } from "./project-card"
import { type Project, TENANT_ID } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"

/** Coerce a date value (epoch ms, epoch seconds, or ISO string) to epoch ms. */
function toEpochMs(value: number | string | null | undefined): number {
  if (value == null) return 0
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  // Heuristic: if < 1e12, it's likely epoch seconds (not ms)
  return value < 1e12 ? value * 1000 : value
}

/** Derive a display status from the raw project fields. */
function deriveStatus(project: Project): "published" | "synced" | "draft" {
  if (project.published_url) return "published"
  if (project.last_synced) return "synced"
  return "draft"
}

/** Derive template type from the project name. */
function deriveTemplateType(name: string): "landing" | "project" {
  return name.startsWith("landing-") ? "landing" : "project"
}

/** Map the raw API Project into a normalized shape for ProjectCard. */
function normalizeProject(raw: Project): NormalizedProject {
  const createdAt = toEpochMs(raw.created_at)
  const lastSynced = toEpochMs(raw.last_synced)
  return {
    id: raw.id,
    name: raw.name,
    description: raw.repository_url || "No description",
    status: deriveStatus(raw),
    template_type: deriveTemplateType(raw.name),
    created_at: createdAt,
    updated_at: lastSynced || createdAt,
    published_url: raw.published_url,
    repository_url: raw.repository_url,
    local_path: raw.local_path,
  }
}

import { FolderPlus, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

const API_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:3001"

function ProjectCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Skeleton className="aspect-[16/10] w-full" />
      <div className="p-4">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-full mb-3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

export function ProjectsGrid() {
  const [projects, setProjects] = useState<NormalizedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/projects`, {
        headers: { "X-Tenant-Id": TENANT_ID },
      })
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      const data: Project[] = await response.json()
      setProjects(data.map(normalizeProject))
    } catch {
      setError("Failed to load projects. Is the API running?")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // Loading state
  if (loading) {
    return (
      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Your Projects</h2>
            <Skeleton className="h-4 w-24 mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="px-6 py-8">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            Unable to load projects
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            {error}
          </p>
          <Button variant="outline" size="sm" onClick={loadProjects} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <div className="px-6 py-8">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4F8EFF]/20 to-[#A855F7]/20 flex items-center justify-center mb-4">
            <FolderPlus className="w-6 h-6 text-[#4F8EFF]" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            No projects yet
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Create your first project to get started. Describe what you want to
            build and VIBE will generate the code for you.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white hover:opacity-90 transition-opacity"
          >
            <FolderPlus className="w-4 h-4" />
            Create your first project
          </Link>
        </div>
      </div>
    )
  }

  // Projects list
  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Your Projects</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} project{projects.length !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} onDeleted={loadProjects} />
        ))}
      </div>
    </div>
  )
}
