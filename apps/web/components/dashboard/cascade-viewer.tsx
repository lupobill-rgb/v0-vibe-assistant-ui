"use client"

import { useEffect, useState } from "react"
import { GitBranch } from "lucide-react"
import { supabase } from "@/lib/supabase"

type CascadeEdge = {
  id: string
  source_execution_id: string
  target_execution_id: string
  source_skill_id: string
  target_skill_id: string
  created_at: string
}

type SkillName = Record<string, string>
type ExecStatus = Record<string, string>

type Chain = { edges: CascadeEdge[] }

const STATUS_DOT: Record<string, string> = {
  complete: "bg-emerald-400",
  completed: "bg-emerald-400",
  failed: "bg-red-400",
  pending: "bg-amber-400",
  running: "bg-[#00E5A0]",
}

export function CascadeViewer() {
  const [chains, setChains] = useState<Chain[]>([])

  useEffect(() => {
    if (!supabase) return
    async function load() {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: edges } = await supabase
        .from("cascade_edges")
        .select("id, source_execution_id, target_execution_id, source_skill_id, target_skill_id, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20)

      if (!edges?.length) return

      // Collect unique skill ids and execution ids
      const skillIds = [...new Set(edges.flatMap((e: CascadeEdge) => [e.source_skill_id, e.target_skill_id]))]
      const execIds = [...new Set(edges.flatMap((e: CascadeEdge) => [e.source_execution_id, e.target_execution_id]))]

      const [{ data: skills }, { data: execs }] = await Promise.all([
        supabase.from("skill_registry").select("id, name").in("id", skillIds),
        supabase.from("autonomous_executions").select("id, status").in("id", execIds),
      ])

      const skillMap: SkillName = {}
      skills?.forEach((s: { id: string; name: string }) => { skillMap[s.id] = s.name })
      const execMap: ExecStatus = {}
      execs?.forEach((e: { id: string; status: string }) => { execMap[e.id] = e.status })

      // Group by source_execution_id for chains
      const grouped: Record<string, CascadeEdge[]> = {}
      edges.forEach((e: CascadeEdge) => {
        const key = e.source_execution_id
        ;(grouped[key] ??= []).push(e)
      })

      const built = Object.values(grouped).map((g) => ({ edges: g }))
      setChains(built)

      // Stash maps on component for render
      setMaps({ skillMap, execMap })
    }
    load()
  }, [])

  const [maps, setMaps] = useState<{ skillMap: SkillName; execMap: ExecStatus }>({ skillMap: {}, execMap: {} })

  if (!chains.length) return null

  const { skillMap, execMap } = maps

  return (
    <div className="px-4 sm:px-6 py-4">
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="w-4 h-4 text-[#7B61FF]" />
        <h2 className="text-base font-semibold text-foreground">Cascade Activity</h2>
      </div>
      <div className="flex flex-col gap-3">
        {chains.map((chain) => (
          <div key={chain.edges[0].id} className="flex flex-col gap-0">
            {chain.edges.map((edge, i) => (
              <div key={edge.id} className="flex flex-col items-start">
                {i === 0 && <Node name={skillMap[edge.source_skill_id] ?? "Unknown"} status={execMap[edge.source_execution_id] ?? "pending"} />}
                <div className="ml-4 w-px h-5 border-l-2 border-dashed border-muted-foreground/30" />
                <Node name={skillMap[edge.target_skill_id] ?? "Unknown"} status={execMap[edge.target_execution_id] ?? "pending"} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Node({ name, status }: { name: string; status: string }) {
  const dot = STATUS_DOT[status] ?? "bg-amber-400"
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-sm">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className="text-foreground">{name}</span>
      <span className="text-[11px] text-muted-foreground">{status}</span>
    </div>
  )
}
