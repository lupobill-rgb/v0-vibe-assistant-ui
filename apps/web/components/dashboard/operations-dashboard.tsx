"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useTeam } from "@/contexts/TeamContext"
import { RecommendationBanner } from "@/components/dashboard/recommendation-banner"

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Kpi({ value: v, label }: { value: string | number; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-foreground">{v}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

function Empty() {
  return <p className="text-sm text-muted-foreground">No data yet</p>
}

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  connected: "bg-green-500/20 text-green-400",
  error: "bg-red-500/20 text-red-400",
  inactive: "bg-yellow-500/20 text-yellow-400",
}

export function OperationsDashboard() {
  const { currentTeam, currentOrg } = useTeam()
  const teamId = currentTeam?.id

  const [connectors, setConnectors] = useState<any[] | null>(null)
  const [aiUsage, setAiUsage] = useState<{ calls: number; tokens: number; cost: number } | null>(null)
  const [jobs, setJobs] = useState<{ total: number; completed: number; failed: number; avgDuration: number } | null>(null)
  const [execs, setExecs] = useState<{ total: number; completed: number; failed: number } | null>(null)
  const [spend, setSpend] = useState<{ total: number; byCategory: Record<string, number> } | null>(null)

  useEffect(() => {
    if (!teamId) return
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

    // 1. Connectors
    supabase
      .from("team_integrations")
      .select("provider, created_at")
      .eq("team_id", teamId)
      .then(({ data }) => setConnectors(data ?? []))

    // 2. AI Usage
    supabase
      .from("metering_calls")
      .select("model, provider, input_tokens, output_tokens, cost_estimate, timestamp")
      .eq("team_id", teamId)
      .gte("timestamp", thirtyDaysAgo)
      .then(({ data }) => {
        if (!data || data.length === 0) { setAiUsage({ calls: 0, tokens: 0, cost: 0 }); return }
        const calls = data.length
        const tokens = data.reduce((s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0)
        const cost = data.reduce((s, r) => s + (r.cost_estimate ?? 0), 0)
        setAiUsage({ calls, tokens, cost })
      })

    // 3. Jobs (via projects)
    supabase
      .from("projects")
      .select("id")
      .eq("team_id", teamId)
      .then(({ data: projects }) => {
        if (!projects || projects.length === 0) { setJobs({ total: 0, completed: 0, failed: 0, avgDuration: 0 }); return }
        const pids = projects.map((p) => p.id)
        supabase
          .from("jobs")
          .select("execution_state, initiated_at, total_job_seconds")
          .in("project_id", pids)
          .gte("initiated_at", thirtyDaysAgo)
          .then(({ data: jd }) => {
            if (!jd) { setJobs({ total: 0, completed: 0, failed: 0, avgDuration: 0 }); return }
            const completed = jd.filter((j) => j.execution_state === "completed" || j.execution_state === "complete").length
            const failed = jd.filter((j) => j.execution_state === "failed").length
            const durations = jd.filter((j) => j.total_job_seconds).map((j) => j.total_job_seconds)
            const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
            setJobs({ total: jd.length, completed, failed, avgDuration: avg })
          })
      })

    // 4. Autonomous Executions
    supabase
      .from("autonomous_executions")
      .select("status, trigger_source, created_at")
      .eq("team_id", teamId)
      .gte("created_at", thirtyDaysAgo)
      .then(({ data }) => {
        if (!data) { setExecs({ total: 0, completed: 0, failed: 0 }); return }
        setExecs({
          total: data.length,
          completed: data.filter((e) => e.status === "completed").length,
          failed: data.filter((e) => e.status === "failed").length,
        })
      })

    // 5. Team Spend
    supabase
      .from("team_spend")
      .select("category, amount, vendor, spend_date")
      .eq("team_id", teamId)
      .then(({ data }) => {
        if (!data || data.length === 0) { setSpend({ total: 0, byCategory: {} }); return }
        const total = data.reduce((s, r) => s + (r.amount ?? 0), 0)
        const byCategory: Record<string, number> = {}
        data.forEach((r) => { byCategory[r.category ?? "Other"] = (byCategory[r.category ?? "Other"] ?? 0) + (r.amount ?? 0) })
        setSpend({ total, byCategory })
      })
  }, [teamId])

  return (
    <div className="space-y-6">
      {currentOrg?.id && teamId && (
        <RecommendationBanner teamId={teamId} orgId={currentOrg.id} context="operations" />
      )}
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {/* Connectors */}
      <Section title="Active Connectors">
        {connectors === null ? <Empty /> : connectors.length === 0 ? <Empty /> : (
          <>
            <Kpi value={connectors.length} label="Connected" />
            <ul className="mt-3 space-y-1">
              {connectors.map((c, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{c.provider}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">active</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      {/* AI Usage */}
      <Section title="AI Usage (30d)">
        {!aiUsage || aiUsage.calls === 0 ? <Empty /> : (
          <div className="flex gap-6">
            <Kpi value={aiUsage.calls.toLocaleString()} label="Calls" />
            <Kpi value={aiUsage.tokens.toLocaleString()} label="Tokens" />
            <Kpi value={`$${aiUsage.cost.toFixed(2)}`} label="Cost" />
          </div>
        )}
      </Section>

      {/* Jobs */}
      <Section title="Jobs (30d)">
        {!jobs || jobs.total === 0 ? <Empty /> : (
          <div className="flex gap-6">
            <Kpi value={jobs.total} label="Total" />
            <Kpi value={jobs.completed} label="Completed" />
            <Kpi value={jobs.failed} label="Failed" />
            <Kpi value={`${jobs.avgDuration}s`} label="Avg Duration" />
          </div>
        )}
      </Section>

      {/* Autonomous Executions */}
      <Section title="Autonomous Executions (30d)">
        {!execs || execs.total === 0 ? <Empty /> : (
          <div className="flex gap-6">
            <Kpi value={execs.total} label="Total" />
            <Kpi value={execs.completed} label="Completed" />
            <Kpi value={execs.failed} label="Failed" />
          </div>
        )}
      </Section>

      {/* Team Spend */}
      <Section title="Team Spend">
        {!spend || spend.total === 0 ? <Empty /> : (
          <>
            <Kpi value={`$${spend.total.toFixed(2)}`} label="Total Spend" />
            <ul className="mt-3 space-y-1">
              {Object.entries(spend.byCategory).map(([cat, amt]) => (
                <li key={cat} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{cat}</span>
                  <span className="text-muted-foreground">${(amt as number).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>
    </div>
    </div>
  )
}
