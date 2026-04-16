'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const data = [
  { month: 'Jan', revenue: 4200 },
  { month: 'Feb', revenue: 5800 },
  { month: 'Mar', revenue: 4900 },
  { month: 'Apr', revenue: 7100 },
  { month: 'May', revenue: 6300 },
]

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: '#00E5A0',
  },
} satisfies ChartConfig

export default function DashboardTestPage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-8 p-8"
      style={{ backgroundColor: '#0A0E17' }}
    >
      <h1
        className="text-3xl font-bold"
        style={{ color: '#E8ECF4' }}
      >
        Dashboard Smoke Test
      </h1>

      {/* KPI Card */}
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: '#0F1420',
          borderColor: '#1a2030',
          minWidth: 240,
        }}
      >
        <p className="text-sm" style={{ color: '#888888' }}>
          Total Revenue
        </p>
        <p
          className="mt-1 text-4xl font-bold tabular-nums"
          style={{ color: '#00E5A0' }}
        >
          $28,300
        </p>
        <p className="mt-1 text-sm" style={{ color: '#888888' }}>
          Jan -- May 2026
        </p>
      </div>

      {/* Bar Chart */}
      <div
        className="w-full max-w-lg rounded-xl border p-6"
        style={{
          backgroundColor: '#0F1420',
          borderColor: '#1a2030',
        }}
      >
        <p
          className="mb-4 text-sm font-medium"
          style={{ color: '#E8ECF4' }}
        >
          Monthly Revenue
        </p>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2030" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#888888', fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#888888', fontSize: 12 }}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="revenue"
              fill="var(--color-revenue)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  )
}
