"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

import type { ChartBlock } from "@/types/dashboard"

// Brand-aligned color palette: primary → accent → chart spectrum
const SERIES_COLORS = [
  "#00E5A0", // Vibe Core green
  "#00B4D8", // Signal cyan
  "#7B61FF", // Autonomy violet
  "#F59E0B", // Warm amber
  "#EC4899", // Pink
]

function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

function formatFullNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}

interface ChartAreaInteractiveProps {
  chart?: ChartBlock
  globalTimeRange?: string
}

export function ChartAreaInteractive({ chart, globalTimeRange }: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile()
  const [localTimeRange, setLocalTimeRange] = React.useState("all")

  // Global filter overrides local when set
  const timeRange = globalTimeRange && globalTimeRange !== "all" ? globalTimeRange : localTimeRange
  const setTimeRange = setLocalTimeRange

  React.useEffect(() => {
    if (isMobile) {
      setLocalTimeRange("7d")
    }
  }, [isMobile])

  if (!chart || !chart.data || chart.data.length === 0) {
    return null
  }

  const xKey = chart.x_key
  const yKeys = chart.y_keys

  // Build chart config from the actual y_keys
  const chartConfig: ChartConfig = {}
  yKeys.forEach((key, i) => {
    chartConfig[key] = {
      label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      color: SERIES_COLORS[i % SERIES_COLORS.length],
    }
  })

  // Detect time-series: actual dates (2024-01-15) or month names (January, Jan)
  const MONTH_NAMES = ['january','february','march','april','may','june','july','august','september','october','november','december','jan','feb','mar','apr','jun','jul','aug','sep','oct','nov','dec']
  const isDateSeries = chart.data.every((d) => {
    const val = String(d[xKey] ?? "")
    return !isNaN(Date.parse(val)) && val.length >= 8
  })
  const isMonthSeries = !isDateSeries && chart.data.every((d) => {
    const val = String(d[xKey] ?? "").toLowerCase().replace(/\s.*/, '')
    return MONTH_NAMES.includes(val)
  })
  const isOrderedSeries = isDateSeries || isMonthSeries
  // Also filter sequential data (Week 1, Q1 2025, Apr 1, etc.) by count
  const hasMultiplePoints = chart.data.length > 3

  let filteredData = chart.data
  if (timeRange !== "all" && (isOrderedSeries || hasMultiplePoints)) {
    if (isDateSeries) {
      const dates = chart.data.map((d) => new Date(String(d[xKey])).getTime())
      const maxDate = Math.max(...dates)
      let cutoff: number
      if (timeRange === "ytd") {
        cutoff = new Date(new Date().getFullYear(), 0, 1).getTime()
      } else {
        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
        cutoff = maxDate - days * 86400000
      }
      filteredData = chart.data.filter(
        (d) => new Date(String(d[xKey])).getTime() >= cutoff
      )
    } else {
      // For month names and sequential data: slice by count from the end
      const total = chart.data.length
      const keepCount = timeRange === "7d" ? Math.min(2, total)
        : timeRange === "30d" ? Math.min(3, total)
        : timeRange === "90d" ? Math.min(6, total)
        : timeRange === "ytd" ? Math.min(Math.ceil(total * 0.75), total)
        : total
      filteredData = chart.data.slice(total - keepCount)
    }
  }

  const chartType = chart.type ?? "area"
  const showTimeFilter = isOrderedSeries || hasMultiplePoints

  const formatXTick = (value: string) => {
    if (!isDateSeries) return String(value)
    const date = new Date(value)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const formatYTick = (value: number) => formatCompactNumber(value)

  // Shared axis props
  const xAxisProps = {
    dataKey: xKey,
    tickLine: false as const,
    axisLine: false as const,
    tickMargin: 8,
    minTickGap: 32,
    tickFormatter: formatXTick,
    className: "text-xs fill-muted-foreground",
  }

  const yAxisProps = {
    tickLine: false as const,
    axisLine: false as const,
    tickMargin: 8,
    tickFormatter: formatYTick,
    width: 60,
    className: "text-xs fill-muted-foreground",
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{chart.title}</CardTitle>
        <CardDescription>
          {showTimeFilter ? (
            <>
              <span className="hidden @[540px]/card:block">
                {timeRange === "all" ? "All data" : `Last ${timeRange === "7d" ? "7 days" : timeRange === "30d" ? "30 days" : "3 months"}`}
              </span>
              <span className="@[540px]/card:hidden">
                {timeRange === "all" ? "All" : timeRange}
              </span>
            </>
          ) : (
            <span>{filteredData.length} items</span>
          )}
        </CardDescription>
        {showTimeFilter && (
          <CardAction>
            <ToggleGroup
              type="single"
              value={timeRange}
              onValueChange={setTimeRange}
              variant="outline"
              className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
              <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
              <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
            </ToggleGroup>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger
                className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                size="sm"
                aria-label="Select a value"
              >
                <SelectValue placeholder="All data" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="rounded-lg">All data</SelectItem>
                <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
                <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
                <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
              </SelectContent>
            </Select>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[200px] sm:h-[280px] w-full"
        >
          {chartType === "bar" ? (
            <BarChart data={filteredData} barCategoryGap="20%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    formatter={(value) => formatFullNumber(Number(value))}
                  />
                }
              />
              {yKeys.map((key, i) => (
                <defs key={`def-${key}`}>
                  <linearGradient id={`bar-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={1} />
                    <stop offset="100%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.7} />
                  </linearGradient>
                </defs>
              ))}
              {yKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={`url(#bar-${key})`}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={64}
                />
              ))}
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={filteredData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    formatter={(value) => formatFullNumber(Number(value))}
                  />
                }
              />
              {yKeys.map((key, i) => (
                <Line
                  key={key}
                  dataKey={key}
                  type="monotone"
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, fill: "var(--background)" }}
                />
              ))}
            </LineChart>
          ) : chartType === "pie" || chartType === "donut" ? (
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatFullNumber(Number(value))}
                  />
                }
              />
              <Pie
                data={filteredData}
                dataKey={yKeys[0]}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                innerRadius={chartType === "donut" ? "55%" : 0}
                outerRadius="80%"
                strokeWidth={2}
                stroke="var(--background)"
              >
                {filteredData.map((_, i) => (
                  <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <AreaChart data={filteredData}>
              <defs>
                {yKeys.map((key, i) => (
                  <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    formatter={(value) => formatFullNumber(Number(value))}
                  />
                }
              />
              {yKeys.map((key, i) => (
                <Area
                  key={key}
                  dataKey={key}
                  type="monotone"
                  fill={`url(#fill-${key})`}
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  strokeWidth={2.5}
                />
              ))}
            </AreaChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
