"use client"

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
import { Sparkline } from "@/components/sparkline"

const defaultKpis: KPICard[] = [
  { id: "revenue", label: "Total Revenue", value: "$1,250.00", change: 12.5, trend: "up", change_period: "this month", format: "currency", sparkline: [820, 890, 940, 980, 1050, 1120, 1180, 1250] },
  { id: "customers", label: "New Customers", value: "1,234", change: -20, trend: "down", change_period: "this period", format: "number", sparkline: [1540, 1480, 1420, 1380, 1350, 1310, 1280, 1234] },
  { id: "accounts", label: "Active Accounts", value: "45,678", change: 12.5, trend: "up", change_period: "vs target", format: "number", sparkline: [40100, 41200, 42000, 42800, 43500, 44300, 45000, 45678] },
  { id: "growth", label: "Growth Rate", value: "4.5%", change: 4.5, trend: "up", change_period: "projected", format: "percent", sparkline: [3.2, 3.5, 3.8, 4.0, 4.1, 4.2, 4.3, 4.5] },
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
  onCardClick?: (kpi: KPICard) => void
}

export function SectionCards({ kpis, onCardClick }: SectionCardsProps) {
  const cards = kpis && kpis.length > 0 ? kpis : defaultKpis

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-br *:data-[slot=card]:from-primary/[0.07] *:data-[slot=card]:via-card *:data-[slot=card]:to-card *:data-[slot=card]:shadow-sm lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {cards.map((kpi) => {
        const TrendIcon = kpi.trend === "down" ? IconTrendingDown : IconTrendingUp
        const changeStr = kpi.change != null
          ? `${kpi.change > 0 ? "+" : ""}${kpi.change}%`
          : undefined
        const trendColor = kpi.trend === "down" ? "text-red-400" : "text-emerald-400"
        const sparkColor = kpi.trend === "down" ? "#F87171" : "#00E5A0"
        const accentGrad = kpi.trend === "down"
          ? "from-red-400/60 to-red-400/0"
          : "from-emerald-400/60 to-emerald-400/0"
        return (
          <Card
            key={kpi.id}
            className="@container/card cursor-pointer transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 relative overflow-hidden"
            onClick={() => onCardClick?.(kpi)}
          >
            {/* Top accent line */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accentGrad}`} />
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
              {kpi.sparkline && kpi.sparkline.length >= 2 && (
                <div className="mt-2 -mb-1">
                  <Sparkline data={kpi.sparkline} color={sparkColor} width={120} height={28} />
                </div>
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
