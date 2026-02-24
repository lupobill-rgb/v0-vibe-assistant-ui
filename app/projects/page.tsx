"use client"

import { useState, useMemo, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { getProjects, type Project as ApiProject } from "@/lib/api"
import { ExternalLink, FolderKanban, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const data = await getProjects()
        setProjects(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load projects")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!searchQuery) return projects
    const q = searchQuery.toLowerCase()
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.repository_url.toLowerCase().includes(q)
    )
  }, [projects, searchQuery])

  return (
    <AppShell>
      <div className="min-h-screen">
        {/* Header */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Projects</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {filtered.length} project{filtered.length !== 1 ? "s" : ""} total
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 max-w-sm h-9 px-3 rounded-lg border border-border bg-secondary/50">
            <FolderKanban className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Loading projects...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground text-sm max-w-md">
                {error}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                <FolderKanban className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">No projects found</h3>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "Try adjusting your search" : "Create a landing page from the home page to get started."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((project) => (
                <div
                  key={project.id}
                  className="group bg-card rounded-xl border border-border overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
                >
                  {/* Thumbnail area */}
                  <div className="relative aspect-[16/10] bg-secondary overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10" />
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                        backgroundSize: "20px 20px",
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FolderKanban className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-card-foreground truncate mb-1">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate mb-3">
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{project.repository_url}</span>
                    </div>
                    {project.created_at && (
                      <p className="text-[10px] text-muted-foreground">
                        Created {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
