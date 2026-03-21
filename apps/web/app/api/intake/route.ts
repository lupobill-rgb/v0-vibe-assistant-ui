import { NextResponse } from 'next/server'

const INTAKE_SYSTEM = `You are VIBE, an AI product assistant. A user wants to build something. Your job is to ask 2-3 short focused questions to understand exactly what they need before building.

Rules:
- Ask only ONE question at a time
- Questions must be SHORT (one sentence max)
- After 2-3 exchanges output EXACTLY this JSON and nothing else:
  {"ready": true, "enrichedPrompt": "<full build spec combining original intent + answers>", "summary": "<one line describing what will be built>"}
- Never ask more than 3 questions total
- Never explain yourself or add commentary
- Be conversational not formal

Focus on: what type of output (app/site/dashboard), what data/entities are involved, who will use it.`

export async function POST(request: Request) {
  const { messages } = await request.json()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: INTAKE_SYSTEM,
      messages,
    }),
  })
  const data = await res.json()
  return NextResponse.json({ text: data.content?.[0]?.text ?? '' })
}
