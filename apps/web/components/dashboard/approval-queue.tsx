"use client"

import { useState, useEffect, useCallback } from "react"
import { useTeam } from "@/contexts/TeamContext"
import { supabase } from "@/lib/supabase"
import { API_URL } from "@/lib/api"
import { CheckCircle2, XCircle, Clock, Zap } from "lucide-react"

interface Recommendation {
  id: string
  title: string
  rationale: string
  proposed_action: string
  estimated_impact: string
  priority: "high" | "medium" | "low"
  created_at: string
}

interface Execution {
  id: string
  skill_id: string | null
  status: string
  trigger_source: string
  created_at: string
  skill_name?: string
}

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${data.session?.access_token}`, "Content-Type": "application/json" }
}

const priorityColor: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-green-500/20 text-green-400",
}
const statusColor: Record<string, string> = {
  queued: "bg-blue-500/20 text-blue-400",
  running: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function ApprovalQueue() {
  const { currentTeam } = useTeam()
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [execs, setExecs] = useState<Execution[]>([])
  const [deciding, setDeciding] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const fetchRecs = useCallback(async () => {
    if (!currentTeam?.id) return
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/approvals/recommendations?team_id=${currentTeam.id}`, { headers })
    if (res.ok) { const d = await res.json(); setRecs(d.recommendations ?? []) }
  }, [currentTeam?.id])

  const fetchExecs = useCallback(async () => {
    if (!currentTeam?.id) return
    const { data } = await supabase
      .from("autonomous_executions")
      .select("id, skill_id, status, trigger_source, created_at")
      .eq("team_id", currentTeam.id)
      .order("created_at", { ascending: false })
      .limit(10)
    if (!data) { setExecs([]); return }
    const skillIds = [...new Set(data.filter(e => e.skill_id).map(e => e.skill_id!))]
    let skillMap: Record<string, string> = {}
    if (skillIds.length > 0) {
      const { data: skills } = await supabase.from("skill_registry").select("id, skill_name").in("id", skillIds)
      skillMap = Object.fromEntries((skills ?? []).map(s => [s.id, s.skill_name]))
    }
    setExecs(data.map(e => ({ ...e, skill_name: e.skill_id ? skillMap[e.skill_id] : undefined })))
  }, [currentTeam?.id])

  useEffect(() => { fetchRecs(); fetchExecs() }, [fetchRecs, fetchExecs])
  useEffect(() => {
    const i = setInterval(() => { fetchRecs(); fetchExecs() }, 60000)
    return () => clearInterval(i)
  }, [fetchRecs, fetchExecs])

  const decide = async (id: string, decision: "approved" | "rejected") => {
    setDeciding(id)
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/approvals/recommendations/${id}/decide`, {
      method: "POST", headers, body: JSON.stringify({ decision }),
    })
    if (res.ok) {
      setRecs(prev => prev.filter(r => r.id !== id))
      setToast(decision === "approved" ? "Approved and queued for execution" : "Rejected")
      setTimeout(() => setToast(null), 3000)
      fetchExecs()
    }
    setDeciding(null)
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 text-sm">
          {toast}
        </div>
      )}

      {/* Pending Approvals */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-purple-400" /> Pending Approvals
        </h2>
        {recs.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground text-sm">
            No pending approvals
          </div>
        ) : (
          <div className="grid gap-3">
            {recs.map(r => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{r.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${priorityColor[r.priority] ?? priorityColor.medium}`}>
                        {r.priority}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.rationale}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-xs bg-purple-500/20 text-purple-400">{r.proposed_action}</span>
                      {r.estimated_impact && <span className="text-xs text-green-400">{r.estimated_impact}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => decide(r.id, "approved")} disabled={deciding === r.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50">
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </button>
                    <button onClick={() => decide(r.id, "rejected")} disabled={deciding === r.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-cyan-400" /> Recent Activity
        </h2>
        {execs.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground text-sm">
            No activity yet
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {execs.map(e => (
              <div key={e.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground">{e.skill_name || "Skill execution"}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor[e.status] || "bg-gray-500/20 text-gray-400"}`}>
                    {e.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{e.trigger_source}</span>
                  <span>{timeAgo(e.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
