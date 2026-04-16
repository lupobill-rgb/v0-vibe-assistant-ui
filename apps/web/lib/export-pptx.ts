import type { DashboardData } from "@/types/dashboard"

/**
 * Export a DashboardData object as a PowerPoint (.pptx) file.
 * Uses pptxgenjs for client-side generation — no server needed.
 */
export async function exportDashboardToPptx(data: DashboardData): Promise<void> {
  const PptxGenJS = (await import("pptxgenjs")).default
  const pptx = new PptxGenJS()

  // Slide defaults
  pptx.layout = "LAYOUT_WIDE" // 13.33 x 7.5 inches
  pptx.author = data.meta.theme?.companyName ?? "VIBE"
  pptx.title = data.meta.title

  const BG = "#0A0E17"
  const FG = "#E8ECF4"
  const MUTED = "#888888"
  const PRIMARY = data.meta.theme?.primaryColor ?? "#00E5A0"
  const ACCENT = "#7B61FF"

  // ── Slide 1: Title ──
  const titleSlide = pptx.addSlide()
  titleSlide.background = { color: BG }
  titleSlide.addText(data.meta.title, {
    x: 0.8, y: 2.0, w: 11.5, h: 1.2,
    fontSize: 36, fontFace: "Arial", color: FG, bold: true,
  })
  if (data.meta.subtitle) {
    titleSlide.addText(data.meta.subtitle, {
      x: 0.8, y: 3.2, w: 11.5, h: 0.6,
      fontSize: 18, fontFace: "Arial", color: MUTED,
    })
  }
  titleSlide.addText(data.meta.department + " | " + new Date(data.meta.generated_at).toLocaleDateString(), {
    x: 0.8, y: 4.0, w: 11.5, h: 0.4,
    fontSize: 12, fontFace: "Arial", color: MUTED,
  })
  // Brand accent bar
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 5.0, w: 2.5, h: 0.06, fill: { color: PRIMARY.replace("#", "") },
  })

  // ── Slide 2: KPIs ──
  if (data.kpis?.length) {
    const kpiSlide = pptx.addSlide()
    kpiSlide.background = { color: BG }
    kpiSlide.addText("Key Metrics", {
      x: 0.8, y: 0.4, w: 11.5, h: 0.6,
      fontSize: 24, fontFace: "Arial", color: FG, bold: true,
    })

    const cols = Math.min(data.kpis.length, 4)
    const cardW = 11.5 / cols - 0.2
    data.kpis.slice(0, 8).forEach((kpi, i) => {
      const row = Math.floor(i / cols)
      const col = i % cols
      const x = 0.8 + col * (cardW + 0.2)
      const y = 1.3 + row * 2.2

      // Card background
      kpiSlide.addShape(pptx.ShapeType.roundRect, {
        x, y, w: cardW, h: 1.9,
        fill: { color: "0F1420" },
        rectRadius: 0.1,
        line: { color: "1a2030", width: 1 },
      })
      // Label
      kpiSlide.addText(kpi.label, {
        x: x + 0.2, y: y + 0.15, w: cardW - 0.4, h: 0.35,
        fontSize: 11, fontFace: "Arial", color: MUTED,
      })
      // Value
      kpiSlide.addText(String(kpi.value), {
        x: x + 0.2, y: y + 0.5, w: cardW - 0.4, h: 0.7,
        fontSize: 28, fontFace: "Arial", color: FG, bold: true,
      })
      // Change
      if (kpi.change != null) {
        const changeColor = kpi.trend === "down" ? "EF4444" : "10B981"
        const arrow = kpi.trend === "down" ? "▼" : "▲"
        kpiSlide.addText(`${arrow} ${kpi.change > 0 ? "+" : ""}${kpi.change}% ${kpi.change_period ?? ""}`, {
          x: x + 0.2, y: y + 1.25, w: cardW - 0.4, h: 0.35,
          fontSize: 10, fontFace: "Arial", color: changeColor,
        })
      }
    })
  }

  // ── Slides 3+: Charts (one per slide as data table) ──
  for (const chart of data.charts ?? []) {
    const chartSlide = pptx.addSlide()
    chartSlide.background = { color: BG }
    chartSlide.addText(chart.title, {
      x: 0.8, y: 0.4, w: 11.5, h: 0.6,
      fontSize: 24, fontFace: "Arial", color: FG, bold: true,
    })

    if (chart.type === "bar" && chart.data.length > 0) {
      // Bar chart
      const labels = chart.data.map((d) => String(d[chart.x_key] ?? ""))
      const chartData = chart.y_keys.map((key, i) => ({
        name: key.replace(/_/g, " "),
        labels,
        values: chart.data.map((d) => Number(d[key] ?? 0)),
      }))
      chartSlide.addChart(pptx.ChartType.bar, chartData, {
        x: 0.8, y: 1.2, w: 11.5, h: 5.5,
        showValue: false,
        showLegend: chart.y_keys.length > 1,
        legendPos: "b",
        legendColor: MUTED.replace("#", ""),
        catAxisLabelColor: MUTED.replace("#", ""),
        valAxisLabelColor: MUTED.replace("#", ""),
        chartColors: ["00E5A0", "00B4D8", "7B61FF", "F59E0B", "EC4899"],
        plotArea: { fill: { color: BG.replace("#", "") } },
      })
    } else if ((chart.type === "line" || chart.type === "area") && chart.data.length > 0) {
      const labels = chart.data.map((d) => String(d[chart.x_key] ?? ""))
      const chartData = chart.y_keys.map((key) => ({
        name: key.replace(/_/g, " "),
        labels,
        values: chart.data.map((d) => Number(d[key] ?? 0)),
      }))
      chartSlide.addChart(pptx.ChartType.line, chartData, {
        x: 0.8, y: 1.2, w: 11.5, h: 5.5,
        showLegend: chart.y_keys.length > 1,
        legendPos: "b",
        legendColor: MUTED.replace("#", ""),
        catAxisLabelColor: MUTED.replace("#", ""),
        valAxisLabelColor: MUTED.replace("#", ""),
        chartColors: ["00E5A0", "00B4D8", "7B61FF", "F59E0B", "EC4899"],
        plotArea: { fill: { color: BG.replace("#", "") } },
        lineSmooth: true,
        lineSize: 2,
      })
    } else if ((chart.type === "pie" || chart.type === "donut") && chart.data.length > 0) {
      const labels = chart.data.map((d) => String(d[chart.x_key] ?? ""))
      const chartData = [{
        name: chart.y_keys[0],
        labels,
        values: chart.data.map((d) => Number(d[chart.y_keys[0]] ?? 0)),
      }]
      chartSlide.addChart(
        chart.type === "donut" ? pptx.ChartType.doughnut : pptx.ChartType.pie,
        chartData,
        {
          x: 2.0, y: 1.2, w: 9.0, h: 5.5,
          showLegend: true,
          legendPos: "b",
          legendColor: MUTED.replace("#", ""),
          chartColors: ["00E5A0", "00B4D8", "7B61FF", "F59E0B", "EC4899"],
        },
      )
    } else {
      // Fallback: render chart data as table
      const headers = [chart.x_key, ...chart.y_keys]
      const headerRow = headers.map((h) => ({ text: h, options: { bold: true, fontSize: 10, color: FG.replace("#", ""), fill: { color: "1a2030" } } }))
      const dataRows = chart.data.map((d) =>
        headers.map((h) => ({ text: String(d[h] ?? ""), options: { fontSize: 9, color: MUTED.replace("#", "") } }))
      )
      chartSlide.addTable([headerRow, ...dataRows] as any, {
        x: 0.8, y: 1.5, w: 11.5,
        border: { color: "1a2030", pt: 0.5 },
        colW: headers.map(() => 11.5 / headers.length),
        autoPage: true,
      })
    }
  }

  // ── Table slides ──
  for (const table of data.tables ?? []) {
    const tableSlide = pptx.addSlide()
    tableSlide.background = { color: BG }
    tableSlide.addText(table.title, {
      x: 0.8, y: 0.4, w: 11.5, h: 0.6,
      fontSize: 24, fontFace: "Arial", color: FG, bold: true,
    })

    const headers = table.columns.map((c) => c.label)
    const rows = table.rows.slice(0, 15).map((row) =>
      table.columns.map((col) => String(row[col.key] ?? ""))
    )

    const headerRow = headers.map((h) => ({
      text: h,
      options: { bold: true, fontSize: 10, color: FG.replace("#", ""), fill: { color: "1a2030" } },
    }))
    const dataRows = rows.map((row) =>
      row.map((cell) => ({
        text: cell,
        options: { fontSize: 9, color: MUTED.replace("#", "") },
      }))
    )

    tableSlide.addTable([headerRow, ...dataRows] as any, {
      x: 0.8, y: 1.3, w: 11.5,
      border: { color: "1a2030", pt: 0.5 },
      colW: headers.map(() => 11.5 / headers.length),
      autoPage: true,
    })
  }

  // Generate and download
  const fileName = data.meta.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_") + ".pptx"
  await pptx.writeFile({ fileName })
}
