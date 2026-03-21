import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://ptaqytvztkhjpuawdxng.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YXF5dHZ6dGtoanB1YXdkeG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDAwNjYsImV4cCI6MjA4NzUxNjA2Nn0.V9lzpPsCZX3X9rdTTa0cTz6Al47wDeMNiVC7WXbTfq4'
const EDGE_FN_URL = SUPABASE_URL + '/functions/v1/generate-diff'

const INTAKE_SYSTEM = `You are VIBE, an AI product assistant. A user wants to build something. Ask 2-3 short focused questions to understand exactly what they need before building.

Rules:
- Ask only ONE question at a time, one sentence max
- After 2-3 exchanges output EXACTLY this JSON and nothing else:
  {"ready": true, "enrichedPrompt": "<complete build spec>", "summary": "<one line>"}
- Never ask more than 3 questions
- Be conversational not formal
- Focus on: what entities to track, key fields, who uses it`

const APP_SYSTEM = `You are VIBE, a full-stack app builder.
BUILD A WORKING APPLICATION. NOT a website. NOT a landing page. NOT a marketing page.
The app opens directly to a DATA TABLE. ALL data reads and writes use the Supabase REST API. ZERO hardcoded records.
Output starts with <!DOCTYPE html>. No explanation, no preamble, no markdown.
CRITICAL — IFRAME SAFETY:
This HTML runs inside a sandboxed iframe. Inline event handlers (onclick, onchange, onsubmit, onmouseover, onfocus, onblur, oninput, onkeydown, onkeyup, onkeypress, etc.) are BLOCKED and will silently fail.
You MUST attach ALL event listeners in JavaScript using addEventListener or event delegation (document.addEventListener('click', ...)).
NEVER put event handlers in HTML attributes. NEVER use onclick="..." or onchange="..." or onsubmit="..." anywhere in the HTML.
For dynamically created elements use event delegation: attach one listener on a parent/document and check e.target.closest('.your-class').
HEAD must include:
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700;800&display=swap" rel="stylesheet">
<script>window.__VIBE_SUPABASE_URL__="${SUPABASE_URL}";window.__VIBE_SUPABASE_ANON_KEY__="${SUPABASE_ANON_KEY}";</script>
Output MUST start <!DOCTYPE html> and end </html>.`

async function callEdgeFunction(prompt: string, system: string, maxTokens: number) {
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      prompt,
      model: 'claude',
      system,
      max_tokens: maxTokens,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Edge Function returned ' + res.status)
  }
  return data
}

export async function POST(request: Request) {
  const { messages, build, edit } = await request.json()

  try {
    if (edit) {
      const prompt = messages[messages.length - 1]?.content ?? ''
      const data = await callEdgeFunction(prompt, '', 16000)
      let html = data.diff || ''
      if (html.startsWith('```')) {
        html = html.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '')
      }
      if (!html) {
        return NextResponse.json({ error: 'LLM returned empty response' }, { status: 502 })
      }
      return NextResponse.json({ html, usage: data.usage })
    }

    if (build) {
      const prompt = messages[messages.length - 1]?.content ?? ''
      const data = await callEdgeFunction(prompt, APP_SYSTEM, 16000)
      const html = data.diff || ''
      return NextResponse.json({ html, usage: data.usage })
    }

    // Intake Q&A — conversational flow
    const lastMessage = messages[messages.length - 1]?.content ?? ''
    const conversationContext = messages
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join('\n')
    const data = await callEdgeFunction(conversationContext, INTAKE_SYSTEM, 500)
    const text = data.diff || ''
    return NextResponse.json({ text })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[VIBE] /api/intake error:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
