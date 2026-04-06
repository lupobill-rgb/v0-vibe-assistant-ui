import { NextResponse } from "next/server"

async function callAnthropic(messages: Array<{ role: string; content: string }>, system: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system,
      messages,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `Anthropic API error ${res.status}`)
  return data.content?.[0]?.text || ""
}

const SYSTEM = `You are a CEO advisor AI for VIBE, an enterprise AI execution platform.
Given org metrics (pipeline, team usage, performance), return a JSON object with exactly these keys:
- pacing: string (1-2 sentence assessment of pipeline pacing vs targets)
- opportunities: string[] (2-3 specific growth opportunities)
- risks: string[] (2-3 risks or concerns to watch)
- consolidations: string[] (1-2 team/resource consolidation suggestions)
Return ONLY valid JSON. No markdown. No code fences.`

export async function POST(req: Request) {
  try {
    const { pipeline, usage, performance } = await req.json()
    const prompt = `Org metrics:\nPipeline: $${pipeline.total} total, $${pipeline.weighted} weighted, ${pipeline.closingSoon} deals closing in 30d\nPlatform: ${usage.totalJobs} total jobs, $${usage.aiCost.toFixed(2)} AI spend\nTop teams: ${usage.topTeams.map((t: any) => `${t.name}(${t.count})`).join(", ")}\nLow adoption: ${usage.bottomTeams.map((t: any) => `${t.name}(${t.count})`).join(", ")}\nPerformance: ${performance.map((t: any) => `${t.name}: ${t.rate}% completion, ${t.jobs} jobs`).join("; ")}`
    const raw = await callAnthropic([{ role: "user", content: prompt }], SYSTEM)
    const insights = JSON.parse(raw)
    return NextResponse.json(insights)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
