import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://ptaqytvztkhjpuawdxng.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YXF5dHZ6dGtoanB1YXdkeG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDAwNjYsImV4cCI6MjA4NzUxNjA2Nn0.V9lzpPsCZX3X9rdTTa0cTz6Al47wDeMNiVC7WXbTfq4'

const INTAKE_SYSTEM = `You are VIBE, an AI product assistant. A user wants to build a software tool. Your job is to ask 2-3 targeted questions based on exactly what they described, then produce a complete build spec.
Rules:
- Read the user's prompt carefully before asking anything
- Ask questions specific to what they described — not generic questions
- Ask only ONE question at a time, one sentence max
- After 2-3 exchanges output EXACTLY this JSON and nothing else:
  {"ready": true, "enrichedPrompt": "<complete detailed spec including all field names, entity types, user roles, and workflows the user confirmed>", "summary": "<one line>"}
- Never ask more than 3 questions
- Be conversational, direct, no fluff
Examples of good targeted questions:
- For a CRM: "What fields does a contact need — name, email, phone, company, status?"
- For a task tracker: "What stages do tasks move through — todo, in progress, done, or something different?"
- For inventory: "Are you tracking quantity levels, reorder points, or just item catalog?"
- For a booking system: "Are these bookings for people, resources like rooms, or both?"
The enrichedPrompt you output must be detailed enough to build the exact app — include entity names, field names, relationships, and any workflow the user mentioned.`

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
