import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://ptaqytvztkhjpuawdxng.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YXF5dHZ6dGtoanB1YXdkeG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDAwNjYsImV4cCI6MjA4NzUxNjA2Nn0.V9lzpPsCZX3X9rdTTa0cTz6Al47wDeMNiVC7WXbTfq4'

const INTAKE_SYSTEM = `You are VIBE, an AI product assistant. A user wants to build something. Ask 2-3 short focused questions to understand exactly what they need before building.

Rules:
- Ask only ONE question at a time, one sentence max
- After 2-3 exchanges output EXACTLY this JSON and nothing else:
  {"ready": true, "enrichedPrompt": "<complete build spec>", "summary": "<one line>"}
- Never ask more than 3 questions
- Be conversational not formal
- Focus on: what entities to track, key fields, who uses it`

export async function POST(request: Request) {
  const { messages, build } = await request.json()

  if (build) {
    const prompt = messages[messages.length - 1]?.content ?? ''
    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-diff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ prompt, mode: 'app', model: 'claude' }),
    })
    const data = await res.json()
    return NextResponse.json({ html: data.diff, usage: data.usage })
  }

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
