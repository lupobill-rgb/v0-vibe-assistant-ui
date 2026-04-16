"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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

const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

interface ChartAreaInteractiveProps {
  chart?: ChartBlock
}

export function ChartAreaInteractive({ chart }: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("all")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
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

  // Use chart data directly — no date filtering for non-time-series data
  const isTimeSeries = chart.data.every((d) => {
    const val = String(d[xKey] ?? "")
    return !isNaN(Date.parse(val)) && val.length >= 8
  })

  let filteredData = chart.data
  if (isTimeSeries && timeRange !== "all") {
    const dates = chart.data.map((d) => new Date(String(d[xKey])).getTime())
    const maxDate = Math.max(...dates)
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
    const cutoff = maxDate - days * 86400000
    filteredData = chart.data.filter(
      (d) => new Date(String(d[xKey])).getTime() >= cutoff
    )
  }

  const chartType = chart.type ?? "area"
  const showTimeFilter = isTimeSeries

  const formatXTick = (value: string) => {
    if (!isTimeSeries) return String(value)
    const date = new Date(value)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
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
          className="aspect-auto h-[250px] w-full"
        >
          {chartType === "bar" ? (
            <BarChart data={filteredData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={formatXTick}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              {yKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={filteredData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={formatXTick}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              {yKeys.map((key, i) => (
                <Line
                  key={key}
                  dataKey={key}
                  type="natural"
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          ) : (
            <AreaChart data={filteredData}>
              <defs>
                {yKeys.map((key, i) => (
                  <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={formatXTick}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              {yKeys.map((key, i) => (
                <Area
                  key={key}
                  dataKey={key}
                  type="natural"
                  fill={`url(#fill-${key})`}
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  stackId="a"
                />
              ))}
            </AreaChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
