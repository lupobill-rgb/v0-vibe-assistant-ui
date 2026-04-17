"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import type { DashboardData } from "@/types/dashboard"
import { ShadcnDashboard } from "@/components/shadcn-dashboard"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * /embed/[id] — Standalone embeddable dashboard page.
 * No sidebar, no auth, no chat. Designed for iframe embedding.
 *
 * Usage: <iframe src="https://yourapp.com/embed/{jobId}" />
 */
export default function EmbedDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then(async ({ id }) => {
      try {
        const { data: job } = await supabase
          .from("jobs")
          .select("last_diff")
          .eq("id", id)
          .maybeSingle()

        if (!job?.last_diff) {
          setError("Dashboard not found")
          setLoading(false)
          return
        }

        // Parse the dashboard data
        let raw = typeof job.last_diff === "string" ? job.last_diff : JSON.stringify(job.last_diff)
        raw = raw.trim()

        // Strip markdown fences
        const fenceMatch = raw.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/)
        if (fenceMatch) raw = fenceMatch[1].trim()

        let parsed: unknown = JSON.parse(raw)
        if (typeof parsed === "string") {
          try { parsed = JSON.parse(parsed) } catch {}
        }

        if (parsed && typeof parsed === "object") {
          const obj = parsed as Record<string, unknown>
          if ("dashboard_data" in obj) {
            setData(obj.dashboard_data as DashboardData)
          } else if ("meta" in obj && "kpis" in obj) {
            setData(parsed as DashboardData)
          } else {
            setError("Invalid dashboard format")
          }
        } else {
          setError("Invalid dashboard data")
        }
      } catch (err: any) {
        setError(err.message ?? "Failed to load dashboard")
      }
      setLoading(false)
    })
  }, [params])

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <DashboardSkeleton />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Dashboard Unavailable</p>
          <p className="text-sm text-muted-foreground mt-1">{error ?? "No data available"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ShadcnDashboard data={data} />
    </div>
  )
}
