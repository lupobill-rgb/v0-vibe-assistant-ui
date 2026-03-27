"use client"

import { AppShell } from "@/components/app-shell"
import { PricingPage } from "@/components/billing/PricingPage"
import { CreditCard } from "lucide-react"

export default function PricingRoute() {
  return (
    <AppShell>
      <div className="min-h-screen">
        <div className="px-6 pt-8 pb-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F8EFF] to-[#A855F7] flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Pricing</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Choose the right plan for your team
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-8 max-w-5xl mx-auto">
          <PricingPage />
        </div>
      </div>
    </AppShell>
  )
}
