"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { getAllProjects, deleteProject, type SavedProject } from "@/lib/projects-store"
import { FolderKanban, Trash2, FileText, Clock, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<SavedProject[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const loadProjects = useCallback(() => {
    setProjects(getAllProjects())
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const filtered = useMemo(() => {
    if (!searchQuery) return projects
    const q = searchQuery.toLowerCase()
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q),
    )
  }, [projects, searchQuery])

  function handleOpen(project: SavedProject) {
    // Navigate to home with project ID in query to reload it
    router.push(`/?project=${project.id}`)
  }

  function handleDelete(id: string) {
    deleteProject(id)
    loadProjects()
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return formatDate(iso)
  }

  return (
    <AppShell>
      <div className="min-h-screen">
        {/* Header */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Saved Projects
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {filtered.length} project{filtered.length !== 1 ? "s" : ""} total
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 max-w-sm h-9 px-3 rounded-lg border border-border bg-secondary/50">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                <FolderKanban className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                No projects found
              </h3>
              <p className="text-xs text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Generate a site from the home page to get started."}
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
                  <button
                    onClick={() => handleOpen(project)}
                    className="relative w-full aspect-[16/10] bg-secondary overflow-hidden text-left cursor-pointer"
                  >
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
                    {/* Page count badge */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm text-[10px] font-medium text-muted-foreground">
                      <FileText className="w-3 h-3" />
                      {project.pageOrder.length} page
                      {project.pageOrder.length !== 1 ? "s" : ""}
                    </div>
                  </button>

                  {/* Content */}
                  <div className="p-4">
                    <button
                      onClick={() => handleOpen(project)}
                      className="block w-full text-left"
                    >
                      <h3 className="text-sm font-semibold text-card-foreground truncate mb-1">
                        {project.name}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate mb-3">
                        {project.prompt}
                      </p>
                    </button>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {timeAgo(project.lastModified)}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="sr-only">Delete project</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete project?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete &ldquo;{project.name}&rdquo; and
                              all its pages. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(project.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
