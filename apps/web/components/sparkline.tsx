"use client"

import * as React from "react"

interface SparklineProps {
  data: number[]
  color?: string
  width?: number
  height?: number
  fillOpacity?: number
  strokeWidth?: number
  className?: string
}

/**
 * Lightweight inline sparkline — SVG path, no dependencies.
 * Renders a smooth line with a gradient fill below. Normalizes to fit the box.
 */
export function Sparkline({
  data,
  color = "#00E5A0",
  width = 80,
  height = 24,
  fillOpacity = 0.2,
  strokeWidth = 1.5,
  className,
}: SparklineProps) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = width / (data.length - 1)

  // Build path from points
  const points = data.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * height
    return { x, y }
  })

  const linePath = points
    .map((p, i) => (i === 0 ? `M${p.x.toFixed(2)},${p.y.toFixed(2)}` : `L${p.x.toFixed(2)},${p.y.toFixed(2)}`))
    .join(" ")

  // Close path to bottom for fill
  const fillPath = `${linePath} L${width},${height} L0,${height} Z`

  // Unique gradient id per instance to avoid conflicts
  const gradId = React.useId().replace(/:/g, "")

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`spark-${gradId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#spark-${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot for emphasis */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={2}
          fill={color}
        />
      )}
    </svg>
  )
}
