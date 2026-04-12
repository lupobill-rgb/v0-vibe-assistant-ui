"use client"

import { useEffect, useState } from "react"
import { Loader2, Check, Sparkles, Users, Building2, Shield } from "lucide-react"
import { fetchBillingStatus, createCheckoutSession, type BillingStatus } from "@/lib/api"
import { useTeam } from "@/contexts/TeamContext"
import { cn } from "@/lib/utils"

/*
 * Customer-facing pricing: "Free for 30 days. $17/user/month after that."
 * No mention of markup, tokens, or LLM in customer-facing copy.
 * Builder persona tiers (Starter/Pro/Growth/Team) retained for feature gating.
 * Portfolio tier sits above Team for PE and multi-entity deployments.
 */

const VOLUME_TIERS = [
  { range: "1–499 users", price: "$17" },
  { range: "500–2,499 users", price: "$15" },
  { range: "2,500–9,999 users", price: "$12" },
  { range: "10,000+ users", price: "$10" },
]

const BUILDER_TIERS = [
  {
    slug: "starter",
    name: "Starter",
    target: "Individual",
    features: ["3 projects", "1 builder seat", "Sample data only"],
  },
  {
    slug: "pro",
    name: "Pro",
    target: "Power users",
    features: ["15 projects", "5 builder seats", "5 connectors", "Standard agents", "Email support"],
  },
  {
    slug: "growth",
    name: "Growth",
    target: "Small teams",
    features: ["50 projects", "15 builder seats", "15 connectors", "Advanced agents", "Reactive kernel", "Priority support"],
    recommended: true,
  },
  {
    slug: "team",
    name: "Team",
    target: "Departments",
    features: ["Unlimited projects", "50 builder seats", "Unlimited connectors", "All agents", "Full kernel", "Dedicated support", "SSO"],
  },
  {
    slug: "portfolio",
    name: "Portfolio",
    target: "PE & Multi-entity",
    features: ["Everything in Team", "Multi-entity management", "Cross-portfolio analytics", "Consolidated billing", "Dedicated CSM"],
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    target: "Org-wide",
    features: ["Everything in Portfolio", "Custom integrations", "SLA guarantee", "DPA and ZDR included", "On-prem option"],
  },
]

export function PricingPage() {
  const { currentOrg } = useTeam()
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutSlug, setCheckoutSlug] = useState<string | null>(null)

  useEffect(() => {
    if (!currentOrg?.id) { setLoading(false); return }
    fetchBillingStatus(currentOrg.id)
      .then((data) => setBilling(data))
      .finally(() => setLoading(false))
  }, [currentOrg?.id])

  const currentTier = billing?.tier_slug ?? "starter"
  const inTrial = billing?.in_trial ?? false
  const trialEndsAt = billing?.trial_ends_at
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : 0

  const handleUpgrade = async (tierSlug: string) => {
    if (!currentOrg?.id) return
    setCheckoutSlug(tierSlug)
    try {
      const result = await createCheckoutSession(currentOrg.id, tierSlug)
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      }
    } finally {
      setCheckoutSlug(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          Free for 30 days. $17/user/month after that.
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
          Full platform access from day one. No credit card required to start.
          Volume discounts applied automatically as you grow.
        </p>
      </div>

      {/* Trial banner */}
      {inTrial && (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-[#00E5A0]/30 bg-[#00E5A0]/5 px-5 py-3">
          <Sparkles className="w-4 h-4 text-[#00E5A0]" />
          <span className="text-sm text-foreground">
            You have <span className="font-semibold text-[#00E5A0]">{daysLeft} days</span> left
            on your free trial
          </span>
        </div>
      )}

      {/* Seat pricing card */}
      <div className="rounded-xl border border-[#7B61FF]/30 bg-gradient-to-br from-[#7B61FF]/5 to-[#00E5A0]/5 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00E5A0]/20 to-[#7B61FF]/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-[#7B61FF]" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Per-user pricing</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {VOLUME_TIERS.map((vt) => (
            <div key={vt.range} className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{vt.price}</p>
              <p className="text-xs text-muted-foreground mt-1">/user/month</p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">{vt.range}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Volume discounts applied automatically based on active user count.
          End users of VIBE-built apps are always free.
        </p>
      </div>

      {/* Enterprise card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Enterprise</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Custom pricing with negotiated minimum commit. Includes DPA, ZDR, and a dedicated CSM.
        </p>
        <a
          href={`mailto:${process.env.NEXT_PUBLIC_SALES_EMAIL || 'sales@vibe.ubigrowth.ai'}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-secondary transition-colors"
        >
          <Shield className="w-4 h-4" />
          Contact Sales
        </a>
      </div>

      {/* Builder persona tiers (feature gating) */}
      <div>
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-foreground">Builder capabilities</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Choose the feature tier that fits your workflow. All tiers use the same per-user pricing above.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUILDER_TIERS.map((tier) => {
            const isCurrent = tier.slug === currentTier
            const isEnterprise = tier.slug === "enterprise"
            const isPortfolio = tier.slug === "portfolio"
            const isUpgrade = !isCurrent && !isEnterprise && !isPortfolio
            return (
              <div
                key={tier.slug}
                className={cn(
                  "relative rounded-xl border p-5 flex flex-col gap-4",
                  tier.recommended
                    ? "border-[#7B61FF]/50 bg-[#7B61FF]/5"
                    : "border-border bg-card",
                )}
              >
                {tier.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#00E5A0] to-[#7B61FF] px-3 py-0.5 text-xs font-medium text-white">
                      <Sparkles className="w-3 h-3" /> Most Popular
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-foreground">{tier.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{tier.target}</p>
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>

                <div>
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary text-muted-foreground cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : isEnterprise || isPortfolio ? (
                    <a
                      href={`mailto:${process.env.NEXT_PUBLIC_SALES_EMAIL || 'sales@vibe.ubigrowth.ai'}`}
                      className="flex items-center justify-center w-full px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-secondary transition-colors"
                    >
                      Contact Us
                    </a>
                  ) : isUpgrade ? (
                    <button
                      onClick={() => handleUpgrade(tier.slug)}
                      disabled={checkoutSlug === tier.slug}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-60",
                        tier.recommended
                          ? "bg-gradient-to-r from-[#00E5A0] to-[#7B61FF] hover:opacity-90"
                          : "bg-gradient-to-r from-[#00E5A0]/80 to-[#7B61FF]/80 hover:opacity-90",
                      )}
                    >
                      {checkoutSlug === tier.slug && <Loader2 className="w-4 h-4 animate-spin" />}
                      Select {tier.name}
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        End users of VIBE-built apps are always free.
      </p>
    </div>
  )
}
