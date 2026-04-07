"use client"

import { useEffect, useState } from "react"
import { Loader2, Check, Sparkles } from "lucide-react"
import { fetchBillingStatus, createCheckoutSession, type BillingStatus } from "@/lib/api"
import { useTeam } from "@/contexts/TeamContext"
import { cn } from "@/lib/utils"

const TIERS = [
  {
    slug: "starter",
    name: "Starter",
    price: "Free",
    period: "",
    target: "Individual",
    limits: { workspaces: 1, builders: 1, projects: 3, credits: 50 },
    features: ["3 projects", "50 build credits/mo", "Sample data only", "1 builder"],
    recommended: false,
    connectorNote: "Sample data only — connect your CRM on Pro+",
  },
  {
    slug: "pro",
    name: "Pro",
    price: "$49",
    period: "/mo",
    target: "Power users",
    limits: { workspaces: 3, builders: 5, projects: 15, credits: 500 },
    features: ["15 projects", "500 credits/mo", "5 connectors", "Standard agents", "Email support"],
    recommended: false,
    connectorNote: null,
  },
  {
    slug: "growth",
    name: "Growth",
    price: "$99",
    period: "/mo",
    target: "Small teams",
    limits: { workspaces: 5, builders: 15, projects: 50, credits: 1200 },
    features: ["50 projects", "1,200 credits/mo", "15 connectors", "Advanced agents", "Reactive kernel", "Priority support"],
    recommended: true,
    connectorNote: null,
  },
  {
    slug: "team",
    name: "Team",
    price: "$199",
    period: "/mo",
    target: "Departments",
    limits: { workspaces: 25, builders: 50, projects: "Unlimited", credits: 2500 },
    features: ["Unlimited projects", "2,500 credits/mo", "Unlimited connectors", "All agents", "Full kernel", "Dedicated support", "SSO"],
    recommended: false,
    connectorNote: null,
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    target: "Org-wide",
    limits: { workspaces: "Unlimited", builders: "Unlimited", projects: "Unlimited", credits: "Unlimited" },
    features: ["Everything in Team", "Custom integrations", "SLA guarantee", "On-prem option"],
    recommended: false,
    connectorNote: null,
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
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Choose your plan</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Scale your AI execution environment as you grow.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {TIERS.map((tier) => {
          const isCurrent = tier.slug === currentTier
          const isEnterprise = tier.slug === "enterprise"
          const isUpgrade = !isCurrent && !isEnterprise
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
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                  {tier.period && (
                    <span className="text-sm text-muted-foreground">{tier.period}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-sm">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Limits</p>
                {Object.entries(tier.limits).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">{key}</span>
                    <span className="font-medium text-foreground">{val}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1.5 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Features</p>
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
                ) : tier.slug === "starter" ? (
                  <button
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground cursor-default"
                  >
                    Get Started Free
                  </button>
                ) : isEnterprise ? (
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
                    Upgrade to {tier.name}
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Per-workspace pricing. End users of VIBE-built apps are always free.
      </p>
    </div>
  )
}
