import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import type { KPICard } from "@/types/dashboard"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const defaultKpis: KPICard[] = [
  { id: "revenue", label: "Total Revenue", value: "$1,250.00", change: 12.5, trend: "up", change_period: "this month", format: "currency" },
  { id: "customers", label: "New Customers", value: "1,234", change: -20, trend: "down", change_period: "this period", format: "number" },
  { id: "accounts", label: "Active Accounts", value: "45,678", change: 12.5, trend: "up", change_period: "vs target", format: "number" },
  { id: "growth", label: "Growth Rate", value: "4.5%", change: 4.5, trend: "up", change_period: "projected", format: "percent" },
]

function formatKpiValue(value: string | number, format?: string): string {
  if (typeof value === "string") {
    // Already formatted (has $ or % or commas)
    if (/[$%,]/.test(value)) return value
    // Try to parse as number for formatting
    const num = Number(value)
    if (isNaN(num)) return value
    value = num
  }
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
    case "percent":
      return typeof value === "number" && value <= 1 ? `${(value * 100).toFixed(1)}%` : `${value}%`
    case "number":
      return new Intl.NumberFormat("en-US").format(value)
    default:
      // Auto-detect: large numbers get formatted
      if (typeof value === "number" && Math.abs(value) >= 1000) {
        return new Intl.NumberFormat("en-US").format(value)
      }
      return String(value)
  }
}

interface SectionCardsProps {
  kpis?: KPICard[]
}

export function SectionCards({ kpis }: SectionCardsProps) {
  const cards = kpis && kpis.length > 0 ? kpis : defaultKpis

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {cards.map((kpi) => {
        const TrendIcon = kpi.trend === "down" ? IconTrendingDown : IconTrendingUp
        const changeStr = kpi.change != null
          ? `${kpi.change > 0 ? "+" : ""}${kpi.change}%`
          : undefined
        const trendColor = kpi.trend === "down" ? "text-red-400" : "text-emerald-400"
        return (
          <Card key={kpi.id} className="@container/card">
            <CardHeader>
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {formatKpiValue(kpi.value, kpi.format)}
              </CardTitle>
              {changeStr && (
                <CardAction>
                  <Badge variant="outline">
                    <TrendIcon />
                    {changeStr}
                  </Badge>
                </CardAction>
              )}
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              {changeStr && (
                <div className={`line-clamp-1 flex gap-2 font-medium ${trendColor}`}>
                  {kpi.trend === "down" ? "Down" : "Up"} {changeStr} {kpi.change_period ?? ""}
                  <TrendIcon className="size-4" />
                </div>
              )}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
