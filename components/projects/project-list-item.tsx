"use client"

import Link from "next/link"
import { MoreHorizontal, Clock, ExternalLink } from "lucide-react"
import type { Project } from "@/lib/api"

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

export function ProjectListItem({ project }: { project: Project }) {
  return (
    <div className="group flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-card/60 border border-transparent hover:border-border transition-all">
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#4F8EFF]/20 via-[#A855F7]/20 to-[#EC4899]/20 flex-shrink-0 overflow-hidden" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground truncate">{project.name}</h3>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 bg-[#4F8EFF]/20 text-[#4F8EFF]">
            active
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {project.repository_url || project.local_path || "Local project"}
        </p>
      </div>

      {/* Time */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
        <Clock className="w-3 h-3" />
        {formatTimeAgo(project.last_synced ?? project.created_at)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <Link
          href={`/projects/${project.id}`}
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
        <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
