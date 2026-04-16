"use client"

import type { DashboardData } from "@/types/dashboard"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards } from "@/components/section-cards"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ShadcnDashboardProps {
  data?: DashboardData
}

export function ShadcnDashboard({ data }: ShadcnDashboardProps) {
  if (!data) return null

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 lg:px-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight font-[family-name:var(--font-heading)]">
              {data.meta.title}
            </h1>
            {data.meta.subtitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {data.meta.subtitle}
              </p>
            )}
          </div>
          <Badge variant="outline" className="text-xs">
            {data.meta.data_source === "connected" ? "Live Data" : "Sample Data"}
          </Badge>
        </div>

        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* KPI Cards */}
          <SectionCards kpis={data.kpis} />

          {/* Charts */}
          {data.charts?.map((chart) => (
            <div key={chart.id} className="px-4 lg:px-6">
              <ChartAreaInteractive chart={chart} />
            </div>
          ))}

          {/* Tables */}
          {data.tables?.map((table) => (
            <div key={table.id} className="px-4 lg:px-6">
              <Card>
                <CardHeader>
                  <CardTitle>{table.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {table.columns.map((col) => (
                            <TableHead key={col.key}>{col.label}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {table.rows.map((row, i) => (
                          <TableRow key={i}>
                            {table.columns.map((col) => (
                              <TableCell key={col.key}>
                                {String(row[col.key] ?? "")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}

          {/* Alerts */}
          {data.alerts && data.alerts.length > 0 && (
            <div className="flex flex-col gap-2 px-4 lg:px-6">
              {data.alerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={
                    alert.severity === "critical"
                      ? "border-destructive/50"
                      : alert.severity === "warning"
                        ? "border-yellow-500/50"
                        : "border-border"
                  }
                >
                  <CardContent className="flex items-center gap-3 py-3">
                    <Badge
                      variant={alert.severity === "critical" ? "destructive" : "outline"}
                    >
                      {alert.severity}
                    </Badge>
                    <span className="text-sm">{alert.message}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
