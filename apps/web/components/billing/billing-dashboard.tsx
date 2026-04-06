"use client"

import { useEffect, useState } from "react"
import { fetchBillingStatus, createCheckoutSession, type BillingStatus } from "@/lib/api"
import { useTeam } from "@/contexts/TeamContext"
import { supabase } from "@/lib/supabase"
import {
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  CreditCard,
  Loader2,
  BarChart3,
  Users,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PricingPage } from "./PricingPage"

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: typeof Zap
  color: string
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", color)}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

interface UsageData {
  jobs_total: number
  jobs_completed: number
  jobs_failed: number
  jobs_active: number
  tokens_used: number
  compute_seconds: number
  files_changed: number
  ai_cost: number
  executions_count: number
}

export function BillingDashboard() {
  const { currentOrg } = useTeam()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [accountType, setAccountType] = useState<string>("individual")

  useEffect(() => {
    if (!currentOrg?.id) return
    const load = async () => {
      // Step A — team IDs for this org
      const { data: teams } = await supabase
        .from("teams")
        .select("id")
        .eq("org_id", currentOrg.id)
      const teamIds = (teams ?? []).map((t: { id: string }) => t.id)

      // Step B — project IDs for those teams
      const projectIds = teamIds.length
        ? ((await supabase.from("projects").select("id").in("team_id", teamIds)).data ?? []).map((p: { id: string }) => p.id)
        : []

      // Step C — jobs for those projects
      const jd = projectIds.length
        ? (await supabase.from("jobs").select("llm_total_tokens, files_changed_count, total_job_seconds, execution_state").in("project_id", projectIds)).data ?? []
        : []

      // Step D — compute usage
      const jobs_total = jd.length
      const jobs_completed = jd.filter((j: { execution_state: string }) =>
        ["completed", "complete"].includes(j.execution_state)
      ).length
      const jobs_failed = jd.filter((j: { execution_state: string }) => j.execution_state === "failed").length
      const jobs_active = jobs_total - jobs_completed - jobs_failed
      const tokens_used = jd.reduce((s: number, j: { llm_total_tokens: number | null }) => s + (j.llm_total_tokens ?? 0), 0)
      const files_changed = jd.reduce((s: number, j: { files_changed_count: number | null }) => s + (j.files_changed_count ?? 0), 0)
      const compute_seconds = jd.reduce((s: number, j: { total_job_seconds: number | null }) => s + (j.total_job_seconds ?? 0), 0)

      // Org-Wide AI Cost from metering_calls
      const { data: meter } = await supabase
        .from("metering_calls")
        .select("cost_estimate")
        .in("team_id", teamIds)
      const rawCost = (meter ?? []).reduce((s: number, m: { cost_estimate: number | null }) => s + (m.cost_estimate ?? 0), 0)
      const ai_cost = rawCost * 2.0

      // Org-Wide Executions
      const { count: execCount } = await supabase
        .from("autonomous_executions")
        .select("id", { count: "exact", head: true })
        .in("team_id", teamIds)

      setUsage({
        jobs_total, jobs_completed, jobs_failed, jobs_active,
        tokens_used, compute_seconds, files_changed,
        ai_cost, executions_count: execCount ?? 0,
      })

      const bs = await fetchBillingStatus(currentOrg.id)
      setStatus(bs)
      if (currentOrg?.id) {
        const { data } = await supabase
          .from("organizations")
          .select("account_type")
          .eq("id", currentOrg.id)
          .single()
        if (data?.account_type) setAccountType(data.account_type)
      }
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [currentOrg?.id])

  const currentTier = status?.tier_slug ?? "starter"
  const creditsUsed = status?.credits_used ?? 0
  const creditsLimit = status?.credits_limit ?? 50

  const handleUpgrade = async () => {
    if (!currentOrg?.id) return
    setUpgrading(true)
    try {
      const nextTier = currentTier === "starter" ? "pro" : currentTier === "pro" ? "growth" : "team"
      const result = await createCheckoutSession(currentOrg.id, nextTier)
      if (result.checkoutUrl) window.location.href = result.checkoutUrl
    } finally {
      setUpgrading(false)
    }
  }

  const fmtTokens = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

  const fmtSeconds = (n: number) => {
    const r = Math.round(n * 10) / 10
    return r >= 60 ? `${Math.floor(r / 60)}m ${Math.round(r % 60)}s` : `${r}s`
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Current Plan */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4F8EFF]/20 to-[#A855F7]/20 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-[#4F8EFF]" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Current Plan</h2>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-bold text-foreground capitalize">
                  {currentTier}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {creditsUsed} credits used · {creditsLimit === -1 ? "Unlimited" : `${creditsLimit} limit`}
              </p>
            </div>
            {currentTier !== "enterprise" && currentTier !== "team" && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
              >
                {upgrading && <Loader2 className="w-4 h-4 animate-spin" />}
                Upgrade
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Account Type Banner */}
      {accountType === "individual" && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Users className="w-5 h-5 text-[#4F8EFF] flex-shrink-0" />
          <p className="text-sm text-muted-foreground flex-1">
            Invite teammates to unlock Team features.
          </p>
          <a
            href="/settings"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#4F8EFF]/10 text-[#4F8EFF] hover:bg-[#4F8EFF]/20 transition-colors"
          >
            Invite
          </a>
        </div>
      )}
      {accountType === "team" && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Users className="w-5 h-5 text-[#A855F7] flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            You have a growing team. At 5 members you'll be automatically upgraded to Enterprise.
          </p>
        </div>
      )}
      {accountType === "enterprise" && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">Enterprise Account</span>
        </div>
      )}

      {/* Usage Stats */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-4">Usage Overview</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading usage data...
          </div>
        ) : usage ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Jobs"
              value={usage.jobs_total}
              sub={`${usage.jobs_completed} completed`}
              icon={BarChart3}
              color="bg-gradient-to-br from-[#4F8EFF] to-[#4F8EFF]/70"
            />
            <StatCard
              label="Tokens Used"
              value={fmtTokens(usage.tokens_used)}
              sub="org-wide"
              icon={Zap}
              color="bg-gradient-to-br from-[#A855F7] to-[#A855F7]/70"
            />
            <StatCard
              label="Files Changed"
              value={usage.files_changed}
              sub="org-wide"
              icon={TrendingUp}
              color="bg-gradient-to-br from-[#EC4899] to-[#EC4899]/70"
            />
            <StatCard
              label="Compute Time"
              value={fmtSeconds(usage.compute_seconds)}
              sub="org-wide"
              icon={Clock}
              color="bg-gradient-to-br from-emerald-500 to-emerald-500/70"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            Failed to load usage data.
          </p>
        )}
      </div>

      {/* Org-Wide Stats */}
      {usage && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-4">Org-Wide Metrics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label="Org-Wide Total AI Cost"
              value={`$${usage.ai_cost.toFixed(2)}`}
              sub="org-wide"
              icon={CreditCard}
              color="bg-gradient-to-br from-amber-500 to-amber-500/70"
            />
            <StatCard
              label="Org-Wide Total Jobs"
              value={usage.jobs_total}
              sub="org-wide"
              icon={BarChart3}
              color="bg-gradient-to-br from-[#4F8EFF] to-[#4F8EFF]/70"
            />
            <StatCard
              label="Org-Wide Executions"
              value={usage.executions_count}
              sub="org-wide"
              icon={Zap}
              color="bg-gradient-to-br from-[#A855F7] to-[#A855F7]/70"
            />
          </div>
        </div>
      )}

      {/* Job Breakdown */}
      {usage && usage.jobs_total > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Job Breakdown</h3>
          <div className="flex flex-col gap-3">
            {[
              { label: "Completed", count: usage.jobs_completed, total: usage.jobs_total, icon: CheckCircle2, color: "text-emerald-400", bar: "bg-emerald-500" },
              { label: "Failed", count: usage.jobs_failed, total: usage.jobs_total, icon: XCircle, color: "text-red-400", bar: "bg-red-500" },
              { label: "Active / Queued", count: usage.jobs_active, total: usage.jobs_total, icon: Loader2, color: "text-[#4F8EFF]", bar: "bg-[#4F8EFF]" },
            ].map((row) => {
              const pct = usage.jobs_total > 0 ? Math.round((row.count / usage.jobs_total) * 100) : 0
              return (
                <div key={row.label} className="flex items-center gap-3">
                  <row.icon className={cn("w-4 h-4 flex-shrink-0", row.color)} />
                  <span className="text-sm text-muted-foreground w-28">{row.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", row.bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{row.count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pricing Tiers — hidden for enterprise */}
      {currentTier !== "enterprise" && <PricingPage />}
    </div>
  )
}
