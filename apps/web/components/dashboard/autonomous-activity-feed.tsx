"use client"

import { useEffect, useState } from "react"
import { Sparkles, ChevronDown, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSupabase } from "@/lib/supabase"

type Execution = {
  id: string
  skill_id: string
  trigger_source: string
  trigger_event: string
  trigger_payload: Record<string, unknown> | null
  status: string
  error_message: string | null
  created_at: string
  completed_at: string | null
}

type SkillInfo = { skill_name: string; description: string | null }

function formatSkillName(raw: string): string {
  return raw.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function DetailPanel({
  ex,
  skill,
  onClose,
}: {
  ex: Execution
  skill: SkillInfo | null
  onClose: () => void
}) {
  const payload = ex.trigger_payload
  const results = payload?.responseResults as Record<string, number> | undefined

  return (
    <div className="mt-2 rounded-xl border border-[#7B61FF]/20 bg-[#0A0E17]/80 backdrop-blur-sm p-4 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-[#7B61FF] uppercase tracking-wider mb-1">
            AI Skill Execution
          </p>
          <p className="text-foreground font-semibold">
            {formatSkillName(skill?.skill_name ?? ex.skill_id)}
          </p>
          {skill?.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{skill.description}</p>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-muted-foreground">Source</span>
          <p className="text-foreground mt-0.5">{ex.trigger_source}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Event</span>
          <p className="text-foreground mt-0.5">{ex.trigger_event}</p>
        </div>
        {payload?.model && (
          <div>
            <span className="text-muted-foreground">Data Model</span>
            <p className="text-foreground mt-0.5">{String(payload.model)}</p>
          </div>
        )}
        {results && (
          <div>
            <span className="text-muted-foreground">Records Processed</span>
            <p className="text-foreground mt-0.5">
              +{results.added ?? 0} added &middot; {results.updated ?? 0} updated &middot; {results.deleted ?? 0} removed
            </p>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Triggered</span>
          <p className="text-foreground mt-0.5">{new Date(ex.created_at).toLocaleString()}</p>
        </div>
        {ex.completed_at && (
          <div>
            <span className="text-muted-foreground">Completed</span>
            <p className="text-foreground mt-0.5">{new Date(ex.completed_at).toLocaleString()}</p>
          </div>
        )}
        {ex.error_message && (
          <div className="col-span-2">
            <span className="text-red-400">Error</span>
            <p className="text-red-300/80 mt-0.5">{ex.error_message}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function AutonomousActivityFeed() {
  const [executions, setExecutions] = useState<Execution[]>([])
  const [skillMap, setSkillMap] = useState<Record<string, SkillInfo>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showFailed, setShowFailed] = useState(false)

  useEffect(() => {
    const supabase = getSupabase()

    async function load() {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from("autonomous_executions")
        .select("id, skill_id, trigger_source, trigger_event, trigger_payload, status, error_message, created_at, completed_at")
        .gt("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(50)
      if (!data) return
      setExecutions(data as Execution[])

      const ids = [...new Set(data.map((d: Execution) => d.skill_id))]
      if (ids.length > 0) {
        const { data: skills } = await supabase
          .from("skill_registry")
          .select("id, skill_name, description")
          .in("id", ids)
        if (skills) {
          const map: Record<string, SkillInfo> = {}
          for (const s of skills) map[s.id] = { skill_name: s.skill_name, description: s.description }
          setSkillMap(map)
        }
      }
    }

    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [])

  if (executions.length === 0) return null

  const launched = executions.filter((e) => e.status === "complete")
  const inProgress = executions.filter((e) => e.status === "running" || e.status === "pending")
  const failed = executions.filter((e) => e.status === "failed")

  const renderRow = (ex: Execution, variant: "launched" | "progress" | "failed") => {
    const skill = skillMap[ex.skill_id] ?? null
    const name = formatSkillName(skill?.skill_name ?? ex.skill_id)
    const isExpanded = expandedId === ex.id

    const dotClass =
      variant === "launched"
        ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
        : variant === "progress"
          ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)] animate-pulse"
          : "bg-white/20"

    const rowClass =
      variant === "failed"
        ? "opacity-50 hover:opacity-75"
        : "hover:border-[#7B61FF]/30 hover:bg-[#7B61FF]/5"

    return (
      <div key={ex.id} className="group">
        <button
          onClick={() => setExpandedId(isExpanded ? null : ex.id)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-card transition-all duration-150 text-left cursor-pointer",
            rowClass
          )}
        >
          <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0 transition-shadow", dotClass)} />
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm truncate", variant === "failed" ? "text-muted-foreground" : "text-foreground font-medium")}>
              {name}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {ex.trigger_source} &middot; {ex.trigger_event}
            </p>
          </div>
          <span className="text-[11px] text-muted-foreground flex-shrink-0 mr-1">
            {relativeTime(ex.created_at)}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
        {isExpanded && (
          <DetailPanel ex={ex} skill={skill} onClose={() => setExpandedId(null)} />
        )}
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 pt-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <Sparkles className="w-4 h-4 text-[#00E5A0]" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#00E5A0] rounded-full animate-ping" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">
          While you were away, VIBE autonomously ran{" "}
          <span className="text-[#00E5A0]">{launched.length} skills</span>
        </h2>
      </div>

      {/* Launched — hero section */}
      {launched.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          {launched.map((ex) => renderRow(ex, "launched"))}
        </div>
      )}

      {/* In progress */}
      {inProgress.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          <p className="text-[11px] uppercase tracking-wider text-amber-400/70 font-medium px-1 mb-0.5">
            In progress
          </p>
          {inProgress.map((ex) => renderRow(ex, "progress"))}
        </div>
      )}

      {/* Failed — collapsed by default */}
      {failed.length > 0 && (
        <div>
          <button
            onClick={() => setShowFailed(!showFailed)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors px-1 py-1 cursor-pointer"
          >
            {showFailed ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {failed.length} failed &middot; click to review
          </button>
          {showFailed && (
            <div className="flex flex-col gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
              {failed.map((ex) => renderRow(ex, "failed"))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
