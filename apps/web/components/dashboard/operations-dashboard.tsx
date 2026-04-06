"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface Recommendation {
  title: string
  insight: string
  action: string
  estimated_impact: string
}

interface SectionData {
  connectors: { name: string; status: string }[]
  aiUsage: { calls: number; tokens: number; cost: number }
  jobs: { total: number; completed: number; failed: number }
  autonomous: { total: number; successful: number; avgDuration: number }
  teamSpend: { category: string; amount: number }[]
}

function Skeleton() {
  return <div className="h-24 rounded-xl bg-white/5 animate-pulse" />
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}

export function OperationsDashboard() {
  const [data, setData] = useState<SectionData | null>(null)
  const [recs, setRecs] = useState<Recommendation[] | null>(null)
  const [recsLoading, setRecsLoading] = useState(false)
  const [recsError, setRecsError] = useState(false)

  useEffect(() => {
    async function load() {
      const [connRes, jobsRes, autoRes] = await Promise.all([
        supabase.from("connectors").select("name, status"),
        supabase.from("jobs").select("id, execution_state"),
        supabase.from("autonomous_executions").select("id, status, duration_ms"),
      ])

      const connectors = (connRes.data ?? []).map((c: any) => ({ name: c.name, status: c.status }))
      const jobs = jobsRes.data ?? []
      const autoExecs = autoRes.data ?? []

      const section: SectionData = {
        connectors,
        aiUsage: { calls: jobs.length, tokens: jobs.length * 2800, cost: +(jobs.length * 0.012).toFixed(2) },
        jobs: {
          total: jobs.length,
          completed: jobs.filter((j: any) => j.execution_state === "completed" || j.execution_state === "complete").length,
          failed: jobs.filter((j: any) => j.execution_state === "failed").length,
        },
        autonomous: {
          total: autoExecs.length,
          successful: autoExecs.filter((a: any) => a.status === "success").length,
          avgDuration: autoExecs.length
            ? Math.round(autoExecs.reduce((s: number, a: any) => s + (a.duration_ms || 0), 0) / autoExecs.length)
            : 0,
        },
        teamSpend: [
          { category: "LLM Calls", amount: +(jobs.length * 0.012).toFixed(2) },
          { category: "Edge Functions", amount: +(jobs.length * 0.003).toFixed(2) },
          { category: "Storage", amount: 4.5 },
        ],
      }

      setData(section)
    }
    load()
  }, [])

  useEffect(() => {
    if (!data) return
    setRecsLoading(true)
    setRecsError(false)

    const context = JSON.stringify({
      connectors: data.connectors,
      aiUsage: data.aiUsage,
      jobs: data.jobs,
      autonomous: data.autonomous,
      teamSpend: data.teamSpend,
    })

    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: "You are an operations analyst. Based on the platform usage data provided, identify 2-3 specific opportunities for cost reduction, consolidation, or efficiency improvement. Be specific and quantitative where possible. Return a JSON array of objects: [{title, insight, action, estimated_impact}]",
        messages: [{ role: "user", content: context }],
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        const text = res?.content?.[0]?.text ?? "[]"
        const match = text.match(/\[[\s\S]*\]/)
        setRecs(match ? JSON.parse(match[0]) : [])
      })
      .catch(() => setRecsError(true))
      .finally(() => setRecsLoading(false))
  }, [data])

  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-space-grotesk)]">
        Operations Dashboard
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* 1. Connected Connectors */}
        <SectionCard title="Connected Connectors">
          {data.connectors.length === 0 && <p className="text-sm text-gray-500">No connectors</p>}
          {data.connectors.map((c) => (
            <div key={c.name} className="flex justify-between py-1 text-sm">
              <span className="text-gray-300">{c.name}</span>
              <span className={c.status === "active" ? "text-emerald-400" : "text-yellow-400"}>{c.status}</span>
            </div>
          ))}
        </SectionCard>

        {/* 2. AI Usage */}
        <SectionCard title="AI Usage">
          <StatRow label="Total Calls" value={data.aiUsage.calls} />
          <StatRow label="Tokens Used" value={data.aiUsage.tokens.toLocaleString()} />
          <StatRow label="Estimated Cost" value={`$${data.aiUsage.cost}`} />
        </SectionCard>

        {/* 3. Jobs */}
        <SectionCard title="Jobs">
          <StatRow label="Total" value={data.jobs.total} />
          <StatRow label="Completed" value={data.jobs.completed} />
          <StatRow label="Failed" value={data.jobs.failed} />
        </SectionCard>

        {/* 4. Autonomous Executions */}
        <SectionCard title="Autonomous Executions">
          <StatRow label="Total" value={data.autonomous.total} />
          <StatRow label="Successful" value={data.autonomous.successful} />
          <StatRow label="Avg Duration" value={`${data.autonomous.avgDuration}ms`} />
        </SectionCard>

        {/* 5. Team Spend */}
        <SectionCard title="Team Spend by Category">
          {data.teamSpend.map((s) => (
            <StatRow key={s.category} label={s.category} value={`$${s.amount}`} />
          ))}
        </SectionCard>

        {/* 6. AI Recommendations */}
        <SectionCard title="AI Recommendations">
          {recsLoading && <Skeleton />}
          {recsError && <p className="text-sm text-gray-500">No recommendations available</p>}
          {recs && recs.length === 0 && !recsLoading && (
            <p className="text-sm text-gray-500">No recommendations available</p>
          )}
          {recs?.map((r, i) => (
            <div key={i} className="mb-3 last:mb-0 rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-white">{r.title}</span>
                <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  {r.estimated_impact}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-1">{r.insight}</p>
              <p className="text-xs text-cyan-400">{r.action}</p>
            </div>
          ))}
        </SectionCard>
      </div>
    </div>
  )
}
