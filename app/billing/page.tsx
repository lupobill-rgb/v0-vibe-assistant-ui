"use client"

import { AppShell } from "@/components/app-shell"
import { PlanCards } from "@/components/billing/plan-cards"
import { UsageSection } from "@/components/billing/usage-section"
import { PaymentMethod } from "@/components/billing/payment-method"

export default function BillingPage() {
  return (
    <AppShell>
      <div className="min-h-screen">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your subscription, usage, and payment methods
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-8 flex flex-col gap-8 max-w-5xl">
          {/* Current Plan Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Plans</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Choose the plan that fits your needs
                </p>
              </div>
              <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
                <button className="px-3 py-1.5 rounded-md text-xs font-medium bg-card text-foreground shadow-sm">
                  Monthly
                </button>
                <button className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Yearly
                </button>
              </div>
            </div>
            <PlanCards />
          </div>

          {/* Usage */}
          <UsageSection />

          {/* Payment & History */}
          <PaymentMethod />
        </div>
      </div>
    </AppShell>
  )
}
