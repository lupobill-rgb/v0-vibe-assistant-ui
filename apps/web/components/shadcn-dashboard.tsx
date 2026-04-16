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

interface ShadcnDashboardProps {
  data?: DashboardData
}

export function ShadcnDashboard({ data }: ShadcnDashboardProps) {
  const table = data?.tables?.[0]

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SectionCards kpis={data?.kpis} />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive chart={data?.charts?.[0]} />
          </div>
          {data?.charts?.[1] && (
            <div className="px-4 lg:px-6">
              <ChartAreaInteractive chart={data.charts[1]} />
            </div>
          )}
          {table && (
            <div className="px-4 lg:px-6">
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
          )}
        </div>
      </div>
    </div>
  )
}
