"use client"
import { useEffect, useState, useCallback } from "react"
import { ProjectCard, type Project } from "./project-card"
import { fetchProjects as apiFetchProjects } from "@/lib/api"
import { supabase } from "@/lib/supabase"

const PAGE_SIZE = 12

export function ProjectsGrid() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [lastDiffMap, setLastDiffMap] = useState<Record<string, string | null>>({})

  useEffect(() => {
    apiFetchProjects()
      .then(data => {
        const mapped = data.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.repository_url || "Local project",
          thumbnail: "",
          starred: false,
          lastEdited: new Date(p.created_at ?? 0).toLocaleDateString(),
          status: "active" as const,
        }))
        setProjects(mapped)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load projects:', err)
        setLoading(false)
      })
  }, [])

  const visibleProjects = projects.slice(0, visibleCount)

  // Batched last_diff fetch for visible projects only
  useEffect(() => {
    const ids = visibleProjects.map(p => p.id)
    if (ids.length === 0) return

    let cancelled = false
    async function fetchDiffs() {
      const { data, error } = await supabase
        .from("jobs")
        .select("project_id, last_diff")
        .in("project_id", ids)
        .eq("execution_state", "completed")
        .order("initiated_at", { ascending: false })

      if (error || cancelled || !data) return

      // Deduplicate: first occurrence per project_id wins (most recent)
      const map: Record<string, string | null> = {}
      for (const row of data) {
        if (!(row.project_id in map)) {
          map[row.project_id] = row.last_diff ?? null
        }
      }
      if (!cancelled) setLastDiffMap(prev => ({ ...prev, ...map }))
    }
    fetchDiffs()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCount, projects])

  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => prev + PAGE_SIZE)
  }, [])

  if (loading) return <div className="px-6 py-8">Loading projects...</div>

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Your Projects
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} projects total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
            All
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            Starred
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            Recent
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            lastDiff={lastDiffMap[project.id] ?? null}
          />
        ))}
      </div>
      {visibleCount < projects.length && (
        <div className="flex justify-center mt-6">
          <button
            onClick={handleLoadMore}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
