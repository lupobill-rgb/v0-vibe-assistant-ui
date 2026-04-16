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
  { id: "revenue", label: "Total Revenue", value: "$1,250.00", change: 12.5, trend: "up", change_period: "this month" },
  { id: "customers", label: "New Customers", value: "1,234", change: -20, trend: "down", change_period: "this period" },
  { id: "accounts", label: "Active Accounts", value: "45,678", change: 12.5, trend: "up", change_period: "vs target" },
  { id: "growth", label: "Growth Rate", value: "4.5%", change: 4.5, trend: "up", change_period: "projected" },
]

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
        return (
          <Card key={kpi.id} className="@container/card">
            <CardHeader>
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {kpi.value}
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
                <div className="line-clamp-1 flex gap-2 font-medium">
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
