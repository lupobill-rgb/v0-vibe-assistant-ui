"use client";

import type { DashboardData, ChartBlock, TableColumn } from "@/types/dashboard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PipelineLayoutProps {
  data: DashboardData;
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function formatValue(value: string | number, format?: string): string {
  if (format === "currency") {
    return typeof value === "number"
      ? `$${value.toLocaleString()}`
      : `$${value}`;
  }
  if (format === "percent") {
    return `${value}%`;
  }
  return typeof value === "number" ? value.toLocaleString() : String(value);
}

function formatCellValue(value: unknown, format?: string): string {
  if (value == null) return "";
  if (format === "currency") return `$${Number(value).toLocaleString()}`;
  if (format === "percent") return `${value}%`;
  return String(value);
}

function trendColor(trend?: "up" | "down" | "flat"): string {
  if (trend === "up") return "text-green-600";
  if (trend === "down") return "text-red-600";
  return "text-muted-foreground";
}

function TrendIcon({ trend }: { trend?: "up" | "down" | "flat" }) {
  if (trend === "up") return <TrendingUp className="size-4" />;
  if (trend === "down") return <TrendingDown className="size-4" />;
  return <Minus className="size-4" />;
}

function buildChartConfig(chart: ChartBlock): ChartConfig {
  const config: ChartConfig = {};
  chart.y_keys.forEach((key, i) => {
    config[key] = {
      label: key,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  });
  return config;
}

function ChartRenderer({ chart }: { chart: ChartBlock }) {
  const config = buildChartConfig(chart);
  const type = chart.type;

  if (type === "pie" || type === "donut") {
    return (
      <ChartContainer config={config} className="mx-auto aspect-square max-h-[300px]">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Pie
            data={chart.data}
            dataKey={chart.y_keys[0]}
            nameKey={chart.x_key}
            innerRadius={type === "donut" ? 60 : 0}
          />
        </PieChart>
      </ChartContainer>
    );
  }

  // bar, line, area, funnel, scatter (funnel/scatter fall back to bar)
  const useBar = type === "bar" || type === "funnel" || type === "scatter";
  const useLine = type === "line";

  if (useLine) {
    return (
      <ChartContainer config={config} className="h-[300px] w-full">
        <LineChart data={chart.data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey={chart.x_key} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {chart.y_keys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
    );
  }

  if (type === "area") {
    return (
      <ChartContainer config={config} className="h-[300px] w-full">
        <AreaChart data={chart.data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey={chart.x_key} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {chart.y_keys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              fillOpacity={0.3}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    );
  }

  // Default: BarChart (covers bar, funnel, scatter fallback)
  return (
    <ChartContainer config={config} className="h-[300px] w-full">
      <BarChart data={chart.data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={chart.x_key} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {chart.y_keys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

export function PipelineLayout({ data }: PipelineLayoutProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* KPI Row */}
      {data.kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {data.kpis.map((kpi) => (
            <Card key={kpi.id}>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold tracking-tight">
                  {formatValue(kpi.value, kpi.format)}
                </p>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                {kpi.change != null && (
                  <div className={`mt-2 flex items-center gap-1 text-sm ${trendColor(kpi.trend)}`}>
                    <TrendIcon trend={kpi.trend} />
                    <span>{kpi.change > 0 ? "+" : ""}{kpi.change}%</span>
                    {kpi.change_period && (
                      <span className="text-muted-foreground">
                        {kpi.change_period}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts Row */}
      {data.charts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.charts.map((chart) => (
            <Card key={chart.id} className="bg-transparent border-0">
              <CardHeader>
                <CardTitle className="text-base">{chart.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div style={{ width: '100%', height: '300px' }}>
                  <ChartRenderer chart={chart} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tables Row */}
      {data.tables && data.tables.length > 0 && (
        <div className="flex flex-col gap-4">
          {data.tables.map((table) => (
            <Card key={table.id}>
              <CardHeader>
                <CardTitle className="text-base">{table.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {table.columns.map((col: TableColumn) => (
                        <TableHead key={col.key}>{col.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.rows.map((row, rowIdx) => (
                      <TableRow key={rowIdx} className="even:bg-muted/50">
                        {table.columns.map((col: TableColumn) => (
                          <TableCell key={col.key}>
                            {formatCellValue(row[col.key], col.format)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
