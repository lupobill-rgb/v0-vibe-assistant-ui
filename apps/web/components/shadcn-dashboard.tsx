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

import type { DashboardData, TableBlock } from "@/types/dashboard"
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
import { Separator } from "@/components/ui/separator"

interface ShadcnDashboardProps {
  data?: DashboardData
}

export function ShadcnDashboard({ data }: ShadcnDashboardProps) {
  if (!data) return null

  return (
    <div className="flex flex-1 flex-col">
      {/* Dashboard Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
        <div className="flex w-full items-center gap-2 px-4 lg:px-6">
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          <h1 className="text-base font-medium">{data.meta.title}</h1>
          {data.meta.subtitle && (
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {data.meta.subtitle}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {data.meta.data_source === "connected" ? "Live Data" : "Sample Data"}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* KPI Cards */}
          <SectionCards kpis={data.kpis} />

          {/* Charts */}
          {data.charts?.map((chart) => (
            <div key={chart.id} className="px-4 lg:px-6">
              <ChartAreaInteractive chart={chart} />
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
              <DashboardDataTable table={table} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
 * DashboardDataTable — TanStack table matching shadcn template style
 * Renders dynamic columns/rows from DashboardData.tables
 * ────────────────────────────────────────────────────────────────── */

function DashboardDataTable({ table }: { table: TableBlock }) {
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
              {reactTable.getRowModel().rows.length > 0 ? (
                reactTable.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
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
