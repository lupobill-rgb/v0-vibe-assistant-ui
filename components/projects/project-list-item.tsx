"use client"

import { useState } from "react"
import Link from "next/link"
import { Star, MoreHorizontal, Clock, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Project } from "@/components/dashboard/project-card"

export function ProjectListItem({ project }: { project: Project }) {
  const [starred, setStarred] = useState(project.starred)

  const statusColors = {
    active: "bg-[#4F8EFF]/20 text-[#4F8EFF]",
    deployed: "bg-emerald-500/20 text-emerald-400",
    draft: "bg-muted text-muted-foreground",
  }

  return (
    <div className="group flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-card/60 border border-transparent hover:border-border transition-all">
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#4F8EFF]/20 via-[#A855F7]/20 to-[#EC4899]/20 flex-shrink-0 overflow-hidden">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: project.thumbnail ? `url(${project.thumbnail})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground truncate">{project.name}</h3>
          <span
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0",
              statusColors[project.status]
            )}
          >
            {project.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
      </div>

      {/* Time */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
        <Clock className="w-3 h-3" />
        {project.lastEdited}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={(e) => {
            e.preventDefault()
            setStarred(!starred)
          }}
          className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
            starred
              ? "text-amber-400"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Star className={cn("w-3.5 h-3.5", starred && "fill-current")} />
        </button>
        <Link
          href={`/task/${project.id}`}
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
