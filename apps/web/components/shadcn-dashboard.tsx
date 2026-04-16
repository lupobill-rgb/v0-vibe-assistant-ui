"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"

import { Maximize2, MessageSquare, X } from "lucide-react"
import type { DashboardData, KPICard, ChartBlock, TableBlock } from "@/types/dashboard"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ShadcnDashboardProps {
  data?: DashboardData
  onDrillDown?: (prompt: string) => void
}

export function ShadcnDashboard({ data, onDrillDown }: ShadcnDashboardProps) {
  const [expandedChart, setExpandedChart] = React.useState<ChartBlock | null>(null)
  const [expandedKpi, setExpandedKpi] = React.useState<KPICard | null>(null)

  if (!data) return null

  const theme = data.meta.theme
  const isLight = theme?.mode === 'light'

  // Build CSS variable overrides from brand theme
  const themeStyles: React.CSSProperties & Record<string, string> = {}
  if (theme?.primaryColor) {
    themeStyles['--primary'] = theme.primaryColor
    themeStyles['--ring'] = theme.primaryColor
  }
  if (theme?.accentColor) {
    themeStyles['--accent'] = theme.accentColor
  }
  if (theme?.backgroundColor) {
    themeStyles['--background'] = theme.backgroundColor
    themeStyles['--card'] = theme.backgroundColor
  }
  if (theme?.foregroundColor) {
    themeStyles['--foreground'] = theme.foregroundColor
    themeStyles['--card-foreground'] = theme.foregroundColor
  }

  // Light mode overrides — clean white/gray palette
  if (isLight) {
    if (!theme?.backgroundColor) {
      themeStyles['--background'] = '#ffffff'
      themeStyles['--card'] = '#ffffff'
      themeStyles['--popover'] = '#ffffff'
    }
    if (!theme?.foregroundColor) {
      themeStyles['--foreground'] = '#0f172a'
      themeStyles['--card-foreground'] = '#0f172a'
      themeStyles['--popover-foreground'] = '#0f172a'
    }
    themeStyles['--muted'] = '#f1f5f9'
    themeStyles['--muted-foreground'] = '#64748b'
    themeStyles['--border'] = '#e2e8f0'
    themeStyles['--input'] = '#e2e8f0'
    themeStyles['--secondary'] = '#f1f5f9'
    themeStyles['--secondary-foreground'] = '#0f172a'
  }

  const logoUrl = theme?.logoUrl
  const brandName = theme?.companyName

  return (
    <div
      className="flex flex-1 flex-col"
      style={Object.keys(themeStyles).length > 0 ? themeStyles : undefined}
    >
      {/* Dashboard Header */}
      <header className="flex h-14 shrink-0 items-center border-b" style={{ background: isLight ? '#f8fafc' : undefined }}>
        <div className="flex w-full items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName ?? ''} className="h-7 w-auto shrink-0 object-contain" />
            ) : (
              <div className="h-6 w-1 rounded-full bg-gradient-to-b from-[#00E5A0] to-[#7B61FF] shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">{data.meta.title}</h1>
              {data.meta.subtitle && (
                <p className="text-xs truncate" style={{ color: isLight ? '#64748b' : undefined }}>{data.meta.subtitle}</p>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-xs shrink-0 ${
              data.meta.data_source === "connected"
                ? "border-emerald-500/50 text-emerald-400"
                : "border-muted-foreground/30 text-muted-foreground"
            }`}
          >
            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
              data.meta.data_source === "connected" ? "bg-emerald-400" : "bg-muted-foreground"
            }`} />
            {data.meta.data_source === "connected" ? "Live" : "Sample Data"}
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* KPI Cards */}
          <SectionCards
            kpis={data.kpis}
            onCardClick={(kpi) => setExpandedKpi(kpi)}
          />

          {/* Charts */}
          {data.charts?.map((chart) => (
            <div key={chart.id} className="px-4 lg:px-6 group relative">
              <ChartAreaInteractive chart={chart} />
              <div className="absolute top-3 right-7 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setExpandedChart(chart)}
                  title="Expand"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </Button>
                {onDrillDown && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onDrillDown(`Tell me more about "${chart.title}". What are the key insights and trends?`)}
                    title="Ask about this chart"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
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

          {/* Data Tables */}
          {data.tables?.map((table) => (
            <div key={table.id} className="px-4 lg:px-6">
              <DashboardDataTable table={table} onDrillDown={onDrillDown} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Expanded Chart Dialog ── */}
      <Dialog open={!!expandedChart} onOpenChange={() => setExpandedChart(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{expandedChart?.title}</DialogTitle>
          </DialogHeader>
          {expandedChart && (
            <div className="pt-2">
              <ChartAreaInteractive chart={expandedChart} />
              {onDrillDown && (
                <div className="flex justify-end pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      onDrillDown(`Analyze "${expandedChart.title}" in detail. What trends, anomalies, or insights do you see?`)
                      setExpandedChart(null)
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Ask AI about this chart
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── KPI Detail Dialog ── */}
      <Dialog open={!!expandedKpi} onOpenChange={() => setExpandedKpi(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{expandedKpi?.label}</DialogTitle>
          </DialogHeader>
          {expandedKpi && (
            <div className="flex flex-col gap-4 pt-2">
              <div className="text-center py-4">
                <p className="text-4xl font-bold tabular-nums">{expandedKpi.value}</p>
                {expandedKpi.change != null && (
                  <p className={`text-sm mt-2 ${expandedKpi.trend === 'down' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {expandedKpi.trend === 'down' ? 'Down' : 'Up'} {expandedKpi.change > 0 ? '+' : ''}{expandedKpi.change}% {expandedKpi.change_period ?? ''}
                  </p>
                )}
              </div>
              {onDrillDown && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => {
                      onDrillDown(`What's driving the ${expandedKpi.label}? Break down the contributing factors.`)
                      setExpandedKpi(null)
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    What&apos;s driving this?
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => {
                      onDrillDown(`Show me the trend for ${expandedKpi.label} over the last 12 months.`)
                      setExpandedKpi(null)
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Show trend
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
 * DashboardDataTable — TanStack table matching shadcn template style
 * Renders dynamic columns/rows from DashboardData.tables
 * ────────────────────────────────────────────────────────────────── */

function DashboardDataTable({ table, onDrillDown }: { table: TableBlock; onDrillDown?: (prompt: string) => void }) {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const columns = React.useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      table.columns.map((col) => ({
        accessorKey: col.key,
        header: col.label,
        cell: ({ row }) => {
          const val = row.getValue(col.key)
          return <span>{String(val ?? "")}</span>
        },
      })),
    [table.columns]
  )

  const reactTable = useReactTable({
    data: table.rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{table.title}</CardTitle>
        <CardDescription>
          {table.rows.length} row{table.rows.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-auto">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {reactTable.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="cursor-pointer select-none whitespace-nowrap"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc"
                        ? " ↑"
                        : header.column.getIsSorted() === "desc"
                          ? " ↓"
                          : ""}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {reactTable.getRowModel().rows.length > 0
                ? reactTable.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={onDrillDown ? "cursor-pointer hover:bg-muted/50" : ""}
                      onClick={() => {
                        if (!onDrillDown) return
                        const firstVal = String(row.getAllCells()[0]?.getValue() ?? '')
                        onDrillDown('Tell me more about "' + firstVal + '" from the ' + table.title + ' table.')
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                        No data
                      </TableCell>
                    </TableRow>
                  )}
            </TableBody>
          </Table>
        </div>
        {/* Pagination */}
        {reactTable.getPageCount() > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-muted-foreground">
              Page {reactTable.getState().pagination.pageIndex + 1} of{" "}
              {reactTable.getPageCount()}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => reactTable.previousPage()}
                disabled={!reactTable.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => reactTable.nextPage()}
                disabled={!reactTable.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
