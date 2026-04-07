"use client"

import { Zap } from "lucide-react"
import type { LimitExceededError } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const TIER_INFO: Record<string, { label: string; price: string; projects: string; credits: string }> = {
  starter: { label: "Starter", price: "Free", projects: "3", credits: "50" },
  pro: { label: "Pro", price: "$49/mo", projects: "15", credits: "500" },
  growth: { label: "Growth", price: "$99/mo", projects: "50", credits: "2,000" },
  team: { label: "Team", price: "$199/mo", projects: "200", credits: "10,000" },
  enterprise: { label: "Enterprise", price: "Custom", projects: "Unlimited", credits: "Unlimited" },
}

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  limitInfo: LimitExceededError | null
}

export function UpgradeModal({ open, onOpenChange, limitInfo }: UpgradeModalProps) {
  if (!limitInfo) return null

  const current = TIER_INFO[limitInfo.currentTier] || TIER_INFO.starter
  const next = TIER_INFO[limitInfo.nextTier] || TIER_INFO.pro
  const isProjects = limitInfo.limitType === "projects"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            {isProjects ? "Project limit reached" : "Credit limit reached"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Your <span className="font-semibold text-foreground">{current.label}</span> plan
            allows {isProjects ? `${current.projects} projects` : `${current.credits} credits/period`}.
            You currently have{" "}
            <span className="font-semibold text-foreground">{limitInfo.current}</span>.
          </p>

          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                Upgrade to {next.label}
              </span>
              <span className="text-sm font-bold bg-gradient-to-r from-[#00E5A0] to-[#7B61FF] bg-clip-text text-transparent">
                {next.price}
              </span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>Up to {next.projects} projects</li>
              <li>{next.credits} credits per billing period</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button
            className="bg-gradient-to-r from-[#00E5A0] to-[#7B61FF] text-white hover:opacity-90"
            onClick={() => {
              // Navigate to billing/upgrade page
              window.location.href = "/settings/billing"
            }}
          >
            Upgrade now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
