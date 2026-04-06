"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useTeam } from "@/contexts/TeamContext"
import { API_URL } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface Recommendation {
  id: string
  title: string
  rationale: string
  proposed_action: string
  estimated_impact: string | null
  priority: string
  created_at: string
}

const priorityBadge: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-green-500/20 text-green-400",
}

export function ApprovalQueue() {
  const { currentTeam } = useTeam()
  const { toast } = useToast()
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentTeam?.id) return
    setLoading(true)
    supabase
      .from("skill_recommendations")
      .select("id, title, rationale, proposed_action, estimated_impact, priority, created_at")
      .eq("team_id", currentTeam.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRecs(data ?? [])
        setLoading(false)
      })
  }, [currentTeam?.id])

  async function decide(id: string, decision: "approved" | "rejected") {
    const { data: session } = await supabase.auth.getSession()
    const token = session?.session?.access_token
    if (!token) return

    const res = await fetch(`${API_URL}/assets/recommendations/${id}/decide`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ decision }),
    })

    if (res.ok) {
      setRecs((prev) => prev.filter((r) => r.id !== id))
      toast({
        title: decision === "approved" ? "Approved" : "Rejected",
        description: `Recommendation ${decision} successfully.`,
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-card border border-border animate-pulse" />
        ))}
      </div>
    )
  }

  if (recs.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-xl bg-card border border-border">
        <p className="text-sm text-muted-foreground">No pending recommendations</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {recs.map((rec) => (
        <div key={rec.id} className="rounded-xl bg-card border border-border p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">{rec.title}</h3>
            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${priorityBadge[rec.priority] ?? priorityBadge.medium}`}>
              {rec.priority}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{rec.rationale}</p>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#7c3aed]/20 text-[#a78bfa]">
              {rec.proposed_action}
            </span>
            {rec.estimated_impact && (
              <span className="text-[10px] text-green-400">{rec.estimated_impact}</span>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => decide(rec.id, "approved")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 hover:bg-green-500 text-white transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => decide(rec.id, "rejected")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
