"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useTeam } from "@/contexts/TeamContext"

interface SectionProps { title: string; children: React.ReactNode }
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

type TN = { name: string; count: number }
interface Pipeline { total: number; weighted: number; byStage: Record<string, { count: number; value: number }>; closingSoon: number }
interface Usage { totalJobs: number; topTeams: TN[]; bottomTeams: TN[]; aiCost: number }
interface TeamPerf { name: string; jobs: number; completed: number; rate: number; avgTokens: number }

export function ExecutiveDashboard() {
  const { currentOrg } = useTeam()
  const orgId = currentOrg?.id

  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [perf, setPerf] = useState<TeamPerf[] | null>(null)
  const [insights, setInsights] = useState<{ pacing: string; opportunities: string[]; risks: string[]; consolidations: string[] } | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)

  useEffect(() => {
    if (!orgId) return

    supabase.from("gtm_deals").select("stage, value, probability, expected_close_date")
      .eq("organization_id", orgId).then(({ data }) => {
        if (!data || data.length === 0) {
          setPipeline({ total: 0, weighted: 0, byStage: {}, closingSoon: 0 })
          return
        }
        const open = data.filter((d) => d.stage !== "closed_lost")
        const total = open.reduce((s, d) => s + (d.value ?? 0), 0)
        const weighted = open.reduce((s, d) => s + (d.value ?? 0) * ((d.probability ?? 0) / 100), 0)
        const byStage: Record<string, { count: number; value: number }> = {}
        open.forEach((d) => {
          const st = d.stage ?? "unknown"
          if (!byStage[st]) byStage[st] = { count: 0, value: 0 }
          byStage[st].count++
          byStage[st].value += d.value ?? 0
        })
        const cutoff = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
        const closingSoon = open.filter((d) => d.expected_close_date && d.expected_close_date <= cutoff).length
        setPipeline({ total, weighted, byStage, closingSoon })
      })

    // 2. Platform usage — fetch teams first, then jobs + metering per team
    supabase
      .from("teams")
      .select("id, name")
      .eq("org_id", orgId)
      .then(async ({ data: teams }) => {
        if (!teams || teams.length === 0) {
          setUsage({ totalJobs: 0, topTeams: [], bottomTeams: [], aiCost: 0 })
          setPerf([])
          return
        }
        const teamIds = teams.map((t) => t.id)

        // Jobs via projects
        const { data: projects } = await supabase
          .from("projects")
          .select("id, team_id")
          .in("team_id", teamIds)
        const allPids = (projects ?? []).map((p) => p.id)
        const { data: allJobs } = allPids.length > 0
          ? await supabase.from("jobs").select("project_id, execution_state, input_tokens, output_tokens").in("project_id", allPids)
          : { data: [] as any[] }
        const pidToTeam: Record<string, string> = {}
        ;(projects ?? []).forEach((p) => { pidToTeam[p.id] = p.team_id })
        const jobsByTeam: Record<string, any[]> = {}
        ;(allJobs ?? []).forEach((j) => {
          const tid = pidToTeam[j.project_id]; if (!tid) return
          if (!jobsByTeam[tid]) jobsByTeam[tid] = []
          jobsByTeam[tid].push(j)
        })

        const totalJobs = (allJobs ?? []).length
        const teamCounts = teams.map((t) => ({ name: t.name, count: (jobsByTeam[t.id] ?? []).length }))
        teamCounts.sort((a, b) => b.count - a.count)
        const topTeams = teamCounts.slice(0, 3)
        const bottomTeams = teamCounts.filter((t) => t.count >= 0).slice(-3).reverse()

        // AI cost
        const { data: metering } = await supabase
          .from("metering_calls")
          .select("cost_estimate")
          .in("team_id", teamIds)
        const rawCost = (metering ?? []).reduce((s, r) => s + (r.cost_estimate ?? 0), 0)
        const aiCost = rawCost * 2.0

        setUsage({ totalJobs, topTeams, bottomTeams, aiCost })

        // 3. Team performance
        const perfData: TeamPerf[] = teams.map((t) => {
          const tj = jobsByTeam[t.id] ?? []
          const completed = tj.filter((j) => j.execution_state === "completed" || j.execution_state === "complete").length
          const rate = tj.length > 0 ? Math.round((completed / tj.length) * 100) : 0
          const tokens = tj.reduce((s, j) => s + (j.input_tokens ?? 0) + (j.output_tokens ?? 0), 0)
          const avg = tj.length > 0 ? Math.round(tokens / tj.length) : 0
          return { name: t.name, jobs: tj.length, completed, rate, avgTokens: avg }
        })
        perfData.sort((a, b) => b.rate - a.rate)
        setPerf(perfData)
      })
  }, [orgId])

  // Fetch AI recommendations once all data is loaded
  useEffect(() => {
    if (!pipeline || !usage || !perf || perf.length === 0 || insightsLoading || insights) return
    setInsightsLoading(true)
    fetch("/api/executive-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline, usage, performance: perf }),
    })
      .then((r) => r.json())
      .then((d) => { if (!d.error) setInsights(d) })
      .catch(() => {})
      .finally(() => setInsightsLoading(false))
  }, [pipeline, usage, perf, insightsLoading, insights])

  // Write AI insights as skill_recommendations (deduped by title + org)
  useEffect(() => {
    if (!insights || !orgId || !currentOrg) return

    async function writeRecs() {
      // Get all teams for this org to assign recommendations
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name")
        .eq("org_id", orgId)
      if (!teams || teams.length === 0) return

      const defaultTeam = teams[0]
      const recs: Array<{
        org_id: string; team_id: string; title: string; rationale: string;
        proposed_action: string; estimated_impact: string; priority: string
      }> = []

      insights!.opportunities.forEach((o) => {
        recs.push({
          org_id: orgId!,
          team_id: defaultTeam.id,
          title: o.slice(0, 100),
          rationale: o,
          proposed_action: "Investigate and act on opportunity",
          estimated_impact: "Revenue growth",
          priority: "medium",
        })
      })
      insights!.risks.forEach((r) => {
        recs.push({
          org_id: orgId!,
          team_id: defaultTeam.id,
          title: r.slice(0, 100),
          rationale: r,
          proposed_action: "Mitigate identified risk",
          estimated_impact: "Risk reduction",
          priority: "high",
        })
      })

      // Dedupe: skip if pending rec with same title + org already exists
      for (const rec of recs) {
        const { data: existing } = await supabase
          .from("skill_recommendations")
          .select("id")
          .eq("org_id", rec.org_id)
          .eq("title", rec.title)
          .eq("status", "pending")
          .limit(1)
        if (existing && existing.length > 0) continue
        await supabase.from("skill_recommendations").insert(rec)
      }
    }

    writeRecs()
  }, [insights, orgId, currentOrg])

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <Section title="Pipeline Overview">
        {!pipeline || pipeline.total === 0 ? <Empty /> : (
          <div className="flex gap-6">
            <Kpi value={`$${(pipeline.total / 1000).toFixed(0)}k`} label="Total Pipeline" />
            <Kpi value={`$${(pipeline.weighted / 1000).toFixed(0)}k`} label="Weighted" />
            <Kpi value={pipeline.closingSoon} label="Closing 30d" />
          </div>
        )}
      </Section>

      <Section title="Deals by Stage">
        {!pipeline || Object.keys(pipeline.byStage).length === 0 ? <Empty /> : (
          <ul className="space-y-2">
            {Object.entries(pipeline.byStage).map(([stage, { count, value }]) => (
              <li key={stage} className="flex items-center justify-between text-sm">
                <span className="text-foreground capitalize">{stage.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">{count} deals · ${(value / 1000).toFixed(0)}k</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Platform Usage">
        {!usage ? <Empty /> : (
          <div className="flex gap-6">
            <Kpi value={usage.totalJobs.toLocaleString()} label="Total Jobs" />
            <Kpi value={`$${usage.aiCost.toFixed(2)}`} label="AI Spend" />
          </div>
        )}
      </Section>

      <Section title="Top Teams by Usage">
        {!usage || usage.topTeams.length === 0 ? <Empty /> : (
          <ul className="space-y-2">
            {usage.topTeams.map((t) => (
              <li key={t.name} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{t.name}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">{t.count} jobs</span>
              </li>))}
          </ul>
        )}
      </Section>

      <Section title="Low Adoption Teams">
        {!usage || usage.bottomTeams.length === 0 ? <Empty /> : (
          <ul className="space-y-2">
            {usage.bottomTeams.map((t) => (
              <li key={t.name} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{t.name}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{t.count} jobs</span>
              </li>))}
          </ul>
        )}
      </Section>

      <Section title="Team Performance">
        {!perf || perf.length === 0 ? <Empty /> : (
          <ul className="space-y-2">
            {perf.map((t) => (
              <li key={t.name} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{t.name}</span>
                <span className="text-muted-foreground">{t.jobs} jobs · {t.rate}% · {t.avgTokens.toLocaleString()} avg tok</span>
              </li>))}
          </ul>
        )}
      </Section>

      {/* AI Recommendations — spans full width */}
      <div className="md:col-span-2 xl:col-span-3 grid gap-6 md:grid-cols-2">
        <Section title="Pacing">
          {insightsLoading ? <p className="text-sm text-muted-foreground animate-pulse">Generating AI insights…</p>
            : !insights ? <Empty /> : <p className="text-sm text-foreground">{insights.pacing}</p>}
        </Section>
        <Section title="Opportunities">
          {!insights ? <Empty /> : (
            <ul className="space-y-1">
              {insights.opportunities.map((o, i) => (
                <li key={i} className="text-sm text-foreground flex gap-2"><span className="text-green-400">↑</span>{o}</li>))}
            </ul>)}
        </Section>
        <Section title="Risks">
          {!insights ? <Empty /> : (
            <ul className="space-y-1">
              {insights.risks.map((r, i) => (
                <li key={i} className="text-sm text-foreground flex gap-2"><span className="text-red-400">⚠</span>{r}</li>))}
            </ul>)}
        </Section>
        <Section title="Consolidations">
          {!insights ? <Empty /> : (
            <ul className="space-y-1">
              {insights.consolidations.map((c, i) => (
                <li key={i} className="text-sm text-foreground flex gap-2"><span className="text-cyan-400">→</span>{c}</li>))}
            </ul>)}
        </Section>
      </div>
    </div>
  )
}
