"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { API_URL } from "@/lib/api"
import { Sparkles, X } from "lucide-react"

interface Recommendation {
  id: string
  title: string
  rationale: string
  proposed_action: string
  priority: string
}

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession()
  return {
    Authorization: `Bearer ${data.session?.access_token}`,
    "Content-Type": "application/json",
  }
}

interface Props {
  teamId: string
  orgId: string
  context?: "home" | "operations" | "executive" | "billing"
}

export function RecommendationBanner({ teamId }: Props) {
  const [rec, setRec] = useState<Recommendation | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const fetchRec = useCallback(async () => {
    if (!teamId) return
    const { data } = await supabase
      .from("skill_recommendations")
      .select("id, title, rationale, proposed_action, priority")
      .eq("team_id", teamId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("priority", { ascending: true })
      .limit(2)
    setRec(data?.[0] ?? null)
    setLoaded(true)
  }, [teamId])

  useEffect(() => { fetchRec() }, [fetchRec])

  const decide = async (decision: "approved" | "rejected") => {
    if (!rec) return
    const headers = await getAuthHeaders()
    const res = await fetch(
      `${API_URL}/api/approvals/recommendations/${rec.id}/decide`,
      { method: "POST", headers, body: JSON.stringify({ decision }) },
    )
    if (res.ok) {
      if (decision === "approved") {
        setToast("Skill queued \u2014 UbiVibe is on it")
        setTimeout(() => setToast(null), 3000)
      }
      setRec(null)
    }
  }

  if (!loaded || !rec) return null

  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 text-sm">
          {toast}
        </div>
      )}
      <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{rec.title}</p>
          <p className="text-xs text-muted-foreground truncate">{rec.rationale}</p>
        </div>
        <button
          onClick={() => decide("approved")}
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors"
        >
          Run this
        </button>
        <button
          onClick={() => decide("rejected")}
          className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  )
}
