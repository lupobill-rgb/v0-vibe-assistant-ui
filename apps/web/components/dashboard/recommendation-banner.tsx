"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { API_URL } from "@/lib/api"
import { Sparkles, X, Loader2 } from "lucide-react"

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

const DISMISSED_KEY = "vibe_dismissed_recommendations"

function getDismissedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"))
  } catch { return new Set() }
}

function addDismissedId(id: string) {
  const ids = getDismissedIds()
  ids.add(id)
  // Keep last 100 to avoid unbounded growth
  const arr = [...ids].slice(-100)
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr))
}

export function RecommendationBanner({ teamId }: Props) {
  const [rec, setRec] = useState<Recommendation | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [running, setRunning] = useState(false)
  const router = useRouter()

  const fetchRec = useCallback(async () => {
    if (!teamId) return
    const { data } = await supabase
      .from("skill_recommendations")
      .select("id, title, rationale, proposed_action, priority")
      .eq("team_id", teamId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("priority", { ascending: true })
      .limit(5)
    const dismissed = getDismissedIds()
    const next = data?.find((r) => !dismissed.has(r.id)) ?? null
    setRec(next)
    setLoaded(true)
  }, [teamId])

  useEffect(() => { fetchRec() }, [fetchRec])

  const decide = async (decision: "approved" | "rejected") => {
    if (!rec || running) return
    const headers = await getAuthHeaders()
    if (decision === "approved") setRunning(true)
    const res = await fetch(
      `${API_URL}/api/approvals/recommendations/${rec.id}/decide`,
      { method: "POST", headers, body: JSON.stringify({ decision }) },
    )
    if (res.ok) {
      addDismissedId(rec.id)
      if (decision === "approved") {
        setToast("Building \u2014 finding your project...")
        const data = await res.json()
        // Poll for the job created by the autonomous processor
        if (data.execution_id) {
          for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 1500))
            const { data: exec } = await supabase
              .from("autonomous_executions")
              .select("job_id")
              .eq("id", data.execution_id)
              .single()
            if (exec?.job_id) {
              const { data: job } = await supabase
                .from("jobs")
                .select("project_id")
                .eq("id", exec.job_id)
                .single()
              if (job?.project_id) {
                router.push(`/building/${job.project_id}`)
                return
              }
            }
          }
        }
        setToast("Skill queued \u2014 check Projects for updates")
        setTimeout(() => { setToast(null); setRunning(false) }, 3000)
      }
      setRec(null)
    } else {
      setRunning(false)
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
          disabled={running}
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {running ? <><Loader2 className="h-3 w-3 animate-spin" /> Building...</> : "Run this"}
        </button>
        <button
          onClick={() => decide("rejected")}
          disabled={running}
          className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  )
}
