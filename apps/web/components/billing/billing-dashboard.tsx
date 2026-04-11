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
  const inTrial = status?.in_trial ?? false
  const trialEndsAt = status?.trial_ends_at
  const activeUsers = status?.active_users ?? 1
  const tokensUsed = status?.tokens_used ?? 0
  const tokensIncluded = status?.tokens_included ?? 750000
  const seatPriceCents = status?.seat_price_cents ?? 1700
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : 0

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
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00E5A0]/20 to-[#7B61FF]/20 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-[#00E5A0]" />
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
                {inTrial ? (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[#00E5A0]/10 text-[#00E5A0] border border-[#00E5A0]/20">
                    Free Trial · {daysLeft} days left
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {activeUsers} active user{activeUsers !== 1 ? "s" : ""} · ${(seatPriceCents / 100).toFixed(0)}/user/month
              </p>
            </div>
            {currentTier !== "enterprise" && currentTier !== "portfolio" && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-[#00E5A0] to-[#7B61FF] text-white hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
              >
                {upgrading && <Loader2 className="w-4 h-4 animate-spin" />}
                Upgrade
              </button>
            )}
          </div>

          {/* Usage allocation bar */}
          <div className="mt-4 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Usage this period</span>
              <span className="text-xs text-muted-foreground">
                {fmtTokens(tokensUsed)} / {fmtTokens(tokensIncluded)} included
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  tokensUsed > tokensIncluded
                    ? "bg-amber-500"
                    : "bg-gradient-to-r from-[#00E5A0] to-[#7B61FF]",
                )}
                style={{ width: `${Math.min(100, (tokensUsed / tokensIncluded) * 100)}%` }}
              />
            </div>
            {tokensUsed > tokensIncluded && (
              <p className="text-xs text-amber-400 mt-1">
                {fmtTokens(tokensUsed - tokensIncluded)} overage this period
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Account Type Banner */}
      {accountType === "individual" && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Users className="w-5 h-5 text-[#00E5A0] flex-shrink-0" />
          <p className="text-sm text-muted-foreground flex-1">
            Invite teammates to unlock Team features.
          </p>
          <a
            href="/settings"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#00E5A0]/10 text-[#00E5A0] hover:bg-[#00E5A0]/20 transition-colors"
          >
            Invite
          </a>
        </div>
      )}
      {accountType === "team" && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Users className="w-5 h-5 text-[#7B61FF] flex-shrink-0" />
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
              color="bg-gradient-to-br from-[#00E5A0] to-[#00E5A0]/70"
            />
            <StatCard
              label="Tokens Used"
              value={fmtTokens(usage.tokens_used)}
              sub="org-wide"
              icon={Zap}
              color="bg-gradient-to-br from-[#7B61FF] to-[#7B61FF]/70"
            />
            <StatCard
              label="Files Changed"
              value={usage.files_changed}
              sub="org-wide"
              icon={TrendingUp}
              color="bg-gradient-to-br from-[#00B4D8] to-[#00B4D8]/70"
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
              color="bg-gradient-to-br from-[#00E5A0] to-[#00E5A0]/70"
            />
            <StatCard
              label="Org-Wide Executions"
              value={usage.executions_count}
              sub="org-wide"
              icon={Zap}
              color="bg-gradient-to-br from-[#7B61FF] to-[#7B61FF]/70"
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
              { label: "Active / Queued", count: usage.jobs_active, total: usage.jobs_total, icon: Loader2, color: "text-[#00E5A0]", bar: "bg-[#00E5A0]" },
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
