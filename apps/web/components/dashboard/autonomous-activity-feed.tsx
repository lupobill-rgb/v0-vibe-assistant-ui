"use client"

import { useEffect, useState } from "react"
import { Zap, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSupabase } from "@/lib/supabase"

type Execution = {
  id: string
  skill_id: string
  trigger_source: string
  trigger_event: string
  status: string
  created_at: string
}

const STATUS_CFG: Record<string, { icon: typeof Loader2; color: string }> = {
  complete:  { icon: CheckCircle2, color: "text-emerald-400" },
  failed:    { icon: XCircle,      color: "text-red-400" },
  pending:   { icon: Clock,        color: "text-amber-400" },
  running:   { icon: Loader2,      color: "text-[#00E5A0]" },
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

export function AutonomousActivityFeed() {
  const [executions, setExecutions] = useState<Execution[]>([])
  const [skillNames, setSkillNames] = useState<Record<string, string>>({})

  useEffect(() => {
    const supabase = getSupabase()

    async function fetch() {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from("autonomous_executions")
        .select("id, skill_id, trigger_source, trigger_event, status, created_at")
        .gt("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(10)
      if (!data) return
      setExecutions(data as Execution[])

      // Resolve skill names in a separate query
      const ids = [...new Set(data.map((d: Execution) => d.skill_id))]
      if (ids.length > 0) {
        const { data: skills } = await supabase
          .from("skill_registry")
          .select("id, name")
          .in("id", ids)
        if (skills) {
          const map: Record<string, string> = {}
          for (const s of skills) map[s.id] = s.name
          setSkillNames(map)
        }
      }
    }

    fetch()
    const id = setInterval(fetch, 30_000)
    return () => clearInterval(id)
  }, [])

  if (executions.length === 0) return null

  return (
    <div className="px-4 sm:px-6 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-[#7B61FF]" />
        <h2 className="text-sm font-semibold text-foreground">
          While you were away, VIBE built...
        </h2>
      </div>
      <div className="flex flex-col gap-2">
        {executions.map((ex) => {
          const cfg = STATUS_CFG[ex.status] ?? STATUS_CFG.pending
          const Icon = cfg.icon
          const isRunning = ex.status === "running"
          return (
            <div
              key={ex.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-card"
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0", cfg.color, isRunning && "animate-spin")} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">
                  {skillNames[ex.skill_id] ?? ex.skill_id}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {ex.trigger_source} &middot; {ex.trigger_event}
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground flex-shrink-0">
                {relativeTime(ex.created_at)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
