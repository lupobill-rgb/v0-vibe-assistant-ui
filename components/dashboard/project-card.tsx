"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ExternalLink, Clock, Trash2, FolderOpen, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { deleteProject, type Project } from "@/lib/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  return new Date(timestamp).toLocaleDateString()
}

export function ProjectCard({
  project,
  onDeleted,
}: {
  project: Project
  onDeleted?: () => void
}) {
  const [hovering, setHovering] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteProject(project.id)
      onDeleted?.()
    } catch {
      // silently fail — user can retry
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const lastActivity = project.last_synced ?? project.created_at

  return (
    <>
      <div
        className="group relative bg-card rounded-xl border border-border overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* Thumbnail */}
        <div className="relative aspect-[16/10] bg-secondary overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#4F8EFF]/20 via-[#A855F7]/20 to-[#EC4899]/20" />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          {/* Hover overlay */}
          <div
            className={cn(
              "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200",
              hovering ? "opacity-100" : "opacity-0"
            )}
          >
            <Link
              href={`/projects/${project.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 text-sm font-medium text-white hover:bg-white/25 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Project
            </Link>
          </div>

          {/* Status */}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#4F8EFF]/20 text-[#4F8EFF]">
              active
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-card-foreground truncate mb-1">
            {project.name}
          </h3>
          <p className="text-xs text-muted-foreground truncate mb-3">
            {project.repository_url || project.local_path || "Local project"}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(lastActivity)}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}`)}>
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Open Project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-red-400 focus:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{project.name}</strong> and all
              associated jobs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
