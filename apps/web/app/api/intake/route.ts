import { NextResponse } from 'next/server'

export const maxDuration = 180

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
NEVER use alert(), confirm(), or prompt(). Use showToast() for all user feedback.
Output MUST start <!DOCTYPE html> and end </html>.`

async function callAnthropic(messages: Array<{ role: string; content: string }>, system: string, maxTokens: number) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `Anthropic API error ${res.status}`)
  return data.content?.[0]?.text || ''
}

async function callEdgeFunction(prompt: string, system: string, maxTokens: number, opts?: { mode?: string; context?: string }) {
  const body: Record<string, unknown> = {
    prompt,
    model: 'claude',
    system,
    max_tokens: maxTokens,
  }
  if (opts?.mode) body.mode = opts.mode
  if (opts?.context) body.context = opts.context
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Edge Function returned ' + res.status)
  }
  return data
}

export async function POST(request: Request) {
  const { messages, build, edit, prompt: editPrompt, context, project_id } = await request.json()

  try {
    if (edit) {
      const prompt = editPrompt || messages?.[messages.length - 1]?.content || ''
      let trimmedContext = context ?? ''
      if (trimmedContext.length > 50000) {
        trimmedContext = trimmedContext.slice(0, 50000) + '\n<!-- HTML truncated for size -->'
      }
      const editMessages = [{ role: 'user', content: trimmedContext ? `Current HTML:\n${trimmedContext}\n\nEdit request: ${prompt}` : prompt }]
      let html = await callAnthropic(editMessages, 'You are an expert web developer. Make ONLY the requested change to the HTML. Preserve everything else exactly. Return complete HTML starting with <!DOCTYPE html>. No explanations. Raw HTML only.', 16000)
      if (html.startsWith('```')) {
        html = html.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '')
      }
      if (!html) {
        return NextResponse.json({ error: 'LLM returned empty response' }, { status: 502 })
      }
      return NextResponse.json({ html })
    }

    if (build) {
      let prompt = messages[messages.length - 1]?.content ?? ''

      // If project_id provided, look up uploaded data to enrich the prompt
      if (project_id) {
        try {
          const uploadRes = await fetch(
            `${SUPABASE_URL}/rest/v1/user_uploads?project_id=eq.${encodeURIComponent(project_id)}&order=created_at.desc&limit=1`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              },
            }
          )
          if (uploadRes.ok) {
            const uploads = await uploadRes.json()
            if (Array.isArray(uploads) && uploads.length > 0) {
              const upload = uploads[0]
              const statsBlock = upload.aggregated_stats?.columns
                ? JSON.stringify(upload.aggregated_stats.columns)
                : 'N/A'
              const sampleRows = Array.isArray(upload.sample_data)
                ? JSON.stringify(upload.sample_data.slice(0, 3))
                : 'N/A'
              prompt += `\n\nUPLOADED DATA — USE THIS DATA, DO NOT HARDCODE ANYTHING:\n` +
                `Table name: ${upload.table_name}\n` +
                `Columns: ${JSON.stringify(upload.columns)}\n` +
                `Total rows: ${upload.row_count}\n` +
                `Real stats (use these exact numbers for KPI cards and charts): ${statsBlock}\n` +
                `Sample rows: ${sampleRows}\n\n` +
                `Instructions:\n` +
                `- Query this table via Supabase REST API using window.__VIBE_SUPABASE_URL__\n` +
                `- Use the real stats above for all KPI values and chart data\n` +
                `- Build all filters to re-query this table with WHERE clauses matching the filter\n` +
                `- Column names in queries must exactly match the columns array above\n` +
                `- This works for any uploaded file — adapt to whatever columns are present`
            }
          }
        } catch (uploadErr) {
          // Non-fatal: proceed with original prompt if upload lookup fails
          console.error('[VIBE] Failed to fetch upload data:', uploadErr)
        }
      }

      const data = await callEdgeFunction(prompt, APP_SYSTEM, 16000)
      let html = data.diff || ''
      if (html.startsWith('```')) {
        html = html.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '')
      }
      if (!html) {
        return NextResponse.json({ error: 'Build returned empty HTML' }, { status: 502 })
      }
      return NextResponse.json({ html, usage: data.usage })
    }

    // Intake Q&A — call Anthropic directly for fast responses
    const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: m.content,
    }))
    const text = await callAnthropic(anthropicMessages, INTAKE_SYSTEM, 500)
    return NextResponse.json({ text })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[VIBE] /api/intake error:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
