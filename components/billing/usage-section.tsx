"use client"

import { cn } from "@/lib/utils"

interface UsageItem {
  label: string
  used: number
  total: number
  unit: string
}

const usageItems: UsageItem[] = [
  { label: "AI Generations", used: 67, total: 100, unit: "generations" },
  { label: "Projects", used: 3, total: 5, unit: "projects" },
  { label: "Storage", used: 120, total: 500, unit: "MB" },
  { label: "API Calls", used: 1240, total: 5000, unit: "calls" },
]

export function UsageSection() {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-foreground">Usage This Month</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Your current usage across all resources. Resets on March 1, 2026.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {usageItems.map((item) => {
          const percentage = Math.round((item.used / item.total) * 100)
          const isHigh = percentage >= 80

          return (
            <div key={item.label} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground">
                  {item.used.toLocaleString()} / {item.total.toLocaleString()} {item.unit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isHigh
                      ? "bg-gradient-to-r from-amber-500 to-red-500"
                      : "bg-gradient-to-r from-[#4F8EFF] to-[#A855F7]"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                isHigh ? "text-amber-400" : "text-muted-foreground"
              )}>
                {percentage}% used
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
