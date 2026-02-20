"use client"

import { CreditCard, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Invoice {
  date: string
  amount: string
  status: "paid" | "pending"
}

const invoices: Invoice[] = [
  { date: "Feb 1, 2026", amount: "$0.00", status: "paid" },
  { date: "Jan 1, 2026", amount: "$0.00", status: "paid" },
  { date: "Dec 1, 2025", amount: "$0.00", status: "paid" },
]

export function PaymentMethod() {
  return (
    <div className="flex flex-col gap-6">
      {/* Payment Method */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-foreground">Payment Method</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your payment methods for subscriptions and usage.
          </p>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 border border-border">
          <div className="w-12 h-8 rounded-md bg-gradient-to-br from-[#4F8EFF]/30 to-[#A855F7]/30 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">No payment method on file</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add a card to upgrade your plan</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Card
          </Button>
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-foreground">Billing History</h3>
          <p className="text-sm text-muted-foreground mt-1">
            View and download your past invoices.
          </p>
        </div>

        <div className="flex flex-col">
          {/* Table Header */}
          <div className="flex items-center px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
            <span className="flex-1">Date</span>
            <span className="w-24 text-right">Amount</span>
            <span className="w-24 text-right">Status</span>
            <span className="w-24 text-right">Invoice</span>
          </div>

          {/* Rows */}
          {invoices.map((invoice) => (
            <div
              key={invoice.date}
              className="flex items-center px-4 py-3 text-sm hover:bg-secondary/30 transition-colors border-b border-border last:border-0"
            >
              <span className="flex-1 text-foreground">{invoice.date}</span>
              <span className="w-24 text-right text-foreground">{invoice.amount}</span>
              <span className="w-24 text-right">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400">
                  {invoice.status}
                </span>
              </span>
              <span className="w-24 text-right">
                <button className="text-xs text-primary hover:underline">Download</button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
