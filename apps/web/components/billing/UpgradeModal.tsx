"use client"

import { useState } from "react"
import { Loader2, Zap } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { createCheckoutSession } from "@/lib/api"

const TIER_INFO: Record<string, { name: string; highlight: string }> = {
  pro: { name: "Pro", highlight: "15 projects, 5 builder seats, 5 connectors" },
  growth: { name: "Growth", highlight: "50 projects, 15 builder seats, 15 connectors" },
  team: { name: "Team", highlight: "Unlimited projects, 50 builder seats, unlimited connectors" },
  portfolio: { name: "Portfolio", highlight: "Multi-entity management, cross-portfolio analytics" },
}

const LIMIT_HEADINGS: Record<string, string> = {
  projects: "Upgrade for more projects",
  credits: "Upgrade for more capacity",
  workspaces: "You need more workspaces",
  builders: "You need more builder seats",
  connectors: "Upgrade to connect your CRM",
}

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  limitType: "projects" | "credits" | "workspaces" | "builders" | "connectors"
  current: number
  max: number
  currentTier: string
  nextTier: string
  orgId: string
}

export function UpgradeModal({
  isOpen,
  onClose,
  limitType,
  current,
  max,
  currentTier,
  nextTier,
  orgId,
}: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tier = TIER_INFO[nextTier]

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await createCheckoutSession(orgId, nextTier)
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      } else {
        setError(result.error ?? "Failed to create checkout session")
        setLoading(false)
      }
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5A0]/20 to-[#7B61FF]/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#7B61FF]" />
          </div>
          <DialogTitle className="text-center">
            {LIMIT_HEADINGS[limitType]}
          </DialogTitle>
          <DialogDescription className="text-center">
            You&apos;re on the <span className="font-medium text-foreground capitalize">{currentTier}</span> plan
            ({current}/{max} {limitType} used). Upgrade to{" "}
            <span className="font-medium text-foreground">{tier?.name ?? nextTier}</span> for{" "}
            {tier?.highlight ?? "higher limits"}.
          </DialogDescription>
        </DialogHeader>

        {tier && (
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-lg font-semibold text-foreground">{tier.name}</p>
            <p className="text-sm font-bold bg-gradient-to-r from-[#00E5A0] to-[#7B61FF] bg-clip-text text-transparent">
              $17/user/month
            </p>
            <p className="text-xs text-muted-foreground mt-1">{tier.highlight}</p>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 text-center">{error}</p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#00E5A0] to-[#7B61FF] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Upgrade to {tier?.name ?? nextTier}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Not now
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
