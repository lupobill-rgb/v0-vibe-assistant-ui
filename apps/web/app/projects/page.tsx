"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { fetchProjects, createProject, type Project } from "@/lib/api"
import { FolderKanban, Plus, ExternalLink, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects().then((data) => {
      setProjects(data)
      setLoading(false)
    })
  }, [])

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || creating) return
    setCreating(true)
    setCreateError(null)
    try {
      const result = await createProject(newProjectName.trim())
      if (result.error) {
        setCreateError(result.error)
      } else if (result.id) {
        setDialogOpen(false)
        setNewProjectName("")
        router.push(`/projects/${result.id}`)
      }
    } catch {
      setCreateError("Failed to create project. Is the API running?")
    } finally {
      setCreating(false)
    }
  }

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
            {!loading && (
              <p className="text-sm text-muted-foreground mt-1">
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white border-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No projects yet</p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white border-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group bg-card rounded-xl border border-border p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#4F8EFF]/20 via-[#A855F7]/20 to-[#EC4899]/20 flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-[#A855F7]" />
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-semibold text-foreground mb-1 truncate">{project.name}</h3>
                <p className="text-xs text-muted-foreground truncate mb-3">
                  {project.repository_url || "Local project"}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {new Date(project.created_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setNewProjectName("")
            setCreateError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateProject()
              }}
              disabled={creating}
              autoFocus
            />
            {createError && (
              <p className="text-xs text-red-400 mt-2">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || creating}
              className="bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white border-0"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
