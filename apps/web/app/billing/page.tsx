"use client"

import { useEffect, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { fetchJobs, type Task } from "@/lib/api"
import { CreditCard, Zap, GitPullRequest, CheckCircle2, Loader2 } from "lucide-react"

export default function BillingPage() {
  const [jobs, setJobs] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJobs().then((data) => {
      setJobs(data)
      setLoading(false)
    })
  }, [])

  const completedJobs = jobs.filter((j) => j.execution_state === "completed")
  const prCount = jobs.filter((j) => j.pull_request_link).length
  const totalTokens = jobs.reduce((sum, j) => sum + (j.llm_total_tokens ?? 0), 0)

  return (
    <AppShell>
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-semibold text-foreground mb-6">Billing</h1>

        {/* Current Plan */}
        <section className="bg-card rounded-xl border border-border p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Current Plan</h2>
            <span className="px-2 py-1 rounded-md bg-[#4F8EFF]/10 text-[#4F8EFF] text-[10px] font-semibold tracking-wide">
              FREE
            </span>
          </div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#4F8EFF]/20 to-[#A855F7]/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#A855F7]" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Free Plan</p>
              <p className="text-xs text-muted-foreground">Community tier · No payment required</p>
            </div>
          </div>
          <button className="w-full py-2 rounded-lg bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white text-sm font-medium hover:opacity-90 transition-opacity">
            Upgrade to Pro
          </button>
        </section>

        {/* Usage Stats */}
        <section className="bg-card rounded-xl border border-border p-5 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Usage</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading usage...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-secondary/40">
                  <Zap className="w-4 h-4 text-[#4F8EFF] mx-auto mb-2" />
                  <p className="text-xl font-semibold text-foreground">{jobs.length}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Total Jobs</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-secondary/40">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xl font-semibold text-foreground">{completedJobs.length}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Completed</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-secondary/40">
                  <GitPullRequest className="w-4 h-4 text-[#A855F7] mx-auto mb-2" />
                  <p className="text-xl font-semibold text-foreground">{prCount}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">PRs Created</p>
                </div>
              </div>
              {totalTokens > 0 && (
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">LLM tokens used</p>
                  <p className="text-xs font-mono text-foreground">{totalTokens.toLocaleString()}</p>
                </div>
              )}
            </>
          )}
        </section>

        <p className="text-xs text-muted-foreground">
          This is a self-hosted instance. Usage stats are for informational purposes only.
        </p>
      </div>
    </AppShell>
  )
}
