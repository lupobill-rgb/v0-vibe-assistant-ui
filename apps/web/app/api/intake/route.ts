import { NextResponse } from 'next/server'

export const maxDuration = 120

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ptaqytvztkhjpuawdxng.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const EDGE_FN_URL = SUPABASE_URL + '/functions/v1/generate-diff'

const INTAKE_SYSTEM = `You are VIBE, an AI product assistant. A user wants to build something. Ask 2-3 short focused questions to understand exactly what they need before building.

Rules:
- Ask only ONE question at a time, one sentence max
- After 2-3 exchanges output EXACTLY this JSON and nothing else:
  {"ready": true, "enrichedPrompt": "<complete build spec>", "summary": "<one line>"}
- Never ask more than 3 questions
- Be conversational not formal
- Focus on: what entities to track, key fields, who uses it
- IMPORTANT: If the user has attached a file and its content is shown below, READ IT FIRST. Do NOT ask questions that are already answered by the file data (column names, team names, departments, categories, amounts, etc.). Extract what you need from the file and proceed to build faster â€” you may only need 1 question or none at all.`

const APP_SYSTEM = `You are VIBE, a full-stack app builder.
BUILD A WORKING APPLICATION. NOT a website. NOT a landing page. NOT a marketing page.
The app opens directly to a DATA TABLE. ALL data reads and writes use the Supabase REST API. ZERO hardcoded records.
Output starts with <!DOCTYPE html>. No explanation, no preamble, no markdown.
CRITICAL â€” IFRAME SAFETY:
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
  // Use DeepSeek as primary (cheaper), fall back to Anthropic
  const deepseekKey = process.env.DEEPSEEK_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  try {
    if (deepseekKey) {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deepseekKey}` },
        body: JSON.stringify({
          model: 'deepseek-chat',
          max_tokens: maxTokens,
          messages: [{ role: 'system', content: system }, ...messages],
        }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (res.ok) return data.choices?.[0]?.message?.content || ''
      console.warn('[intake] DeepSeek failed, falling back to Anthropic:', data.error?.message)
    }
    if (!anthropicKey) throw new Error('No LLM API key configured (DEEPSEEK_API_KEY or ANTHROPIC_API_KEY)')
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: maxTokens, system, messages }),
      signal: controller.signal,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || `Anthropic API error ${res.status}`)
    return data.content?.[0]?.text || ''
  } finally {
    clearTimeout(timeout)
  }
}

async function callEdgeFunction(prompt: string, system: string, maxTokens: number, opts?: { mode?: string; context?: string; model?: string }) {
  const body: Record<string, unknown> = {
    prompt,
    model: opts?.model || 'deepseek',
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

/** Server-side headers â€” use service role key to bypass RLS, or forward
 *  the caller's JWT so RLS resolves as the authenticated user. */
function sbHeaders(userJwt?: string | null): Record<string, string> {
  if (SUPABASE_SERVICE_KEY) {
    return { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
  }
  // No service key â€” use the caller's JWT so RLS sees the real user
  const token = userJwt || SUPABASE_ANON_KEY
  if (!userJwt) console.warn('[INTAKE] SUPABASE_SERVICE_ROLE_KEY not set and no user JWT â€” RLS may block queries')
  return { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
}

/** Resolve upload_id from project record (single source of truth) */
async function resolveProjectUploadId(projectId: string, userJwt?: string | null): Promise<string | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=upload_id&limit=1`,
      { headers: sbHeaders(userJwt) }
    )
    if (!res.ok) return null
    const rows = await res.json()
    return rows?.[0]?.upload_id || null
  } catch { return null }
}

async function fetchUploadSummary(uploadId: string, userJwt?: string | null): Promise<string | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_uploads?id=eq.${encodeURIComponent(uploadId)}&limit=1`,
      { headers: sbHeaders(userJwt) }
    )
    if (!res.ok) return null
    const rows = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) return null
    const upload = rows[0]
    const columns = upload.columns || Object.keys(upload.column_schema || {})
    const sampleRows = Array.isArray(upload.sample_data) ? upload.sample_data.slice(0, 10) : []
    return `[ATTACHED FILE DATA â€” "${upload.original_filename || upload.table_name}"]\n` +
      `Columns: ${JSON.stringify(columns)}\n` +
      `Total rows: ${upload.row_count}\n` +
      `Sample data (first ${sampleRows.length} rows):\n${JSON.stringify(sampleRows, null, 2)}\n` +
      `[END FILE DATA]`
  } catch { return null }
}

export async function POST(request: Request) {
  // Extract user JWT from incoming request for authenticated Supabase calls
  const userJwt = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || null
  let messages, build, edit, editPrompt, context, project_id, upload_id, team_id, user_id, org_id, preferred_model
  try {
    ({ messages, build, edit, prompt: editPrompt, context, project_id, upload_id, team_id, user_id, org_id, preferred_model } = await request.json())
    // Use client-provided model preference, default to deepseek
    const llmModel = ['deepseek', 'claude', 'gpt', 'gemini', 'fireworks'].includes(preferred_model) ? preferred_model : 'deepseek'
    if (edit) {
      const prompt = editPrompt || messages?.[messages.length - 1]?.content || ''
      let trimmedContext = context ?? ''
      // Limit context to 30K chars to avoid timeouts on large dashboards
      if (trimmedContext.length > 30000) {
        trimmedContext = trimmedContext.slice(0, 30000) + '\n<!-- HTML truncated for size -->'
      }
      const editSystem = 'You are an expert web developer. Make ONLY the requested change to the HTML. Preserve everything else exactly. Return complete HTML starting with <!DOCTYPE html>. No explanations. Raw HTML only.'
      const editMessages = [{ role: 'user', content: trimmedContext ? `Current HTML:\n${trimmedContext}\n\nEdit request: ${prompt}` : prompt }]

      // Use Edge Function as primary — runs on Supabase (150s timeout) with
      // 4-provider failover chain. Avoids Vercel function timeout ("Load failed").
      const edgePrompt = trimmedContext
        ? `Current HTML:\n${trimmedContext}\n\nEdit request: ${prompt}`
        : prompt
      let html = ''
      try {
        const edgeData = await callEdgeFunction(edgePrompt, editSystem, 16000, { mode: 'html', model: llmModel })
        html = edgeData.diff || ''
      } catch (edgeErr: any) {
        console.warn(`[EDIT] Edge Function failed (${edgeErr.message}), falling back to Anthropic direct`)
        try {
          html = await callAnthropic(editMessages, editSystem, 16000)
        } catch (anthropicErr: any) {
          console.error(`[EDIT] Anthropic fallback also failed: ${anthropicErr.message}`)
          return NextResponse.json({ error: `Edit failed: ${edgeErr.message}` }, { status: 502 })
        }
      }

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
            { headers: sbHeaders(userJwt) }
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
              prompt += `\n\nUPLOADED DATA â€” USE THIS DATA, DO NOT HARDCODE ANYTHING:\n` +
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
                `- This works for any uploaded file â€” adapt to whatever columns are present`
            }
          }
        } catch (uploadErr) {
          // Non-fatal: proceed with original prompt if upload lookup fails
          console.error('[VIBE] Failed to fetch upload data:', uploadErr)
        }
      }

      const data = await callEdgeFunction(prompt, APP_SYSTEM, 16000, { model: llmModel })
      let html = data.diff || ''
      if (html.startsWith('```')) {
        html = html.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '')
      }
      if (!html) {
        return NextResponse.json({ error: 'Build returned empty HTML' }, { status: 502 })
      }
      return NextResponse.json({ html, usage: data.usage })
    }

    // Intake Q&A â€” call Anthropic directly for fast responses
    const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: m.content,
    }))

    // Resolve upload_id: request body â†’ project record (single source of truth)
    let resolvedUploadId = upload_id
    if (!resolvedUploadId && project_id) {
      resolvedUploadId = await resolveProjectUploadId(project_id, userJwt)
    }

    // ALWAYS fetch file content when an upload exists â€” every call, not just the first
    let intakeSystem = INTAKE_SYSTEM

    // Inject team + budget context when team_id and user_id are present
    if (!team_id) {
      console.warn('[INTAKE] team_id missing â€” intake will run without team context')
    }
    if (team_id && user_id) {
      try {
        const resolvedOrgId = org_id || process.env.NEXT_PUBLIC_ORG_ID
        if (!resolvedOrgId) {
          console.warn('[INTAKE] No org_id in request and NEXT_PUBLIC_ORG_ID not set â€” skipping kernel context')
          throw new Error('org_id missing')
        }
        const kernelRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://vibeapi-production-fdd1.up.railway.app'}/api/kernel-context/${user_id}/${resolvedOrgId}/${team_id}`,
          { headers: { 'Content-Type': 'application/json' } }
        )
        if (kernelRes.ok) {
          const kernelData = await kernelRes.json()
          const kernelBlock = kernelData?.context || kernelData?.teamContext || JSON.stringify(kernelData)
          intakeSystem += `\n\nTEAM CONTEXT (already resolved â€” do NOT ask the user what team they are on):\n${kernelBlock}\nUse this context to scope all questions and the final enrichedPrompt.`
        }
      } catch (kernelErr) {
        console.warn('[INTAKE] kernel-context fetch failed â€” proceeding without team context:', kernelErr)
      }
    }

    // FIX 1: Check if team has active connectors â€” skip data questions if none connected
    if (team_id) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vibeapi-production-fdd1.up.railway.app'
        const connRes = await fetch(`${apiUrl}/connectors/${team_id}`, {
          headers: { 'Content-Type': 'application/json' },
        })
        const lastUserMsg = messages?.[messages.length - 1]?.content?.toLowerCase() || ''
        const isDashboard = /\b(dashboard|analytics|report|metrics|pipeline|revenue|sales|forecast|crm|data)\b/.test(lastUserMsg)
        let hasActiveConnectors = false
        if (connRes.ok) {
          const connData = await connRes.json()
          const connectors = Array.isArray(connData) ? connData : connData?.connectors || []
          hasActiveConnectors = connectors.some((c: { status?: string }) => c.status === 'active')
        }
        if (isDashboard && !hasActiveConnectors) {
          intakeSystem += `\n\nOVERRIDE — no connectors are active. Ask 1 focused question before building. Use realistic sample data for the build spec. Do not present lettered options. Do not mention CSV or file upload. IMPORTANT: In the enrichedPrompt, include the phrase “sample data” so the builder knows to hardcode realistic data into charts instead of querying empty databases. Include this Guided Next Step in the enrichedPrompt: 'Connect your CRM to use live data.'`
        }
      } catch (connErr) {
        console.warn('[INTAKE] connector check failed â€” proceeding without:', connErr)
      }
    }

    // ── Onboarding Intent Detection ──────────────────────────────
    // If user prompt signals onboarding intent, redirect to /onboarding
    const onboardingPhrases = [
      'onboard', 'set us up', 'set me up', 'get us started', 'get me started',
      'we\'re new', 'first time', 'just signed up', 'getting started',
      'activate', 'set up our account', 'configure our', 'initialize',
      'help us get started', 'walk me through setup', 'new customer',
      'new enterprise', 'enterprise setup', 'company setup',
    ]
    const promptLower = (messages?.[0]?.content || '').toLowerCase()
    const isOnboardingIntent = onboardingPhrases.some(p => promptLower.includes(p))
    if (isOnboardingIntent) {
      return NextResponse.json({
        reply: 'Let\'s get you set up! Redirecting to your onboarding wizard...',
        redirect: '/onboarding',
        ready: true,
      })
    }

    if (resolvedUploadId) {
      const fileSummary = await fetchUploadSummary(resolvedUploadId, userJwt)
      if (fileSummary) {
        intakeSystem += `\n\nA file is attached to this project. Here is its content:\n${fileSummary}\nDo NOT ask questions that are answered by this data. Read it first, then respond.`
      } else {
        console.warn(`[INTAKE] Could not fetch upload ${resolvedUploadId} â€” proceeding without file context`)
      }
    }

    // 2000 tokens to ensure enrichedPrompt JSON isn't truncated mid-response
    const text = await callAnthropic(anthropicMessages, intakeSystem, 2000)

    // Detect ready signal in Claude's response and return structured data
    // so the client never sees raw JSON in the chat
    // Strategy: try strict parse first, then brace-matching for embedded JSON
    let readySignal: { ready: boolean; enrichedPrompt: string; summary?: string } | null = null
    // 1. Direct JSON.parse
    try {
      const stripped = text.replace(/```(?:json)?\s*\n?/g, '').replace(/\n?```\s*$/g, '').trim()
      const parsed = JSON.parse(stripped)
      if (parsed.ready && parsed.enrichedPrompt) readySignal = parsed
    } catch {}
    // 2. Brace-matching fallback (handles extra text around JSON)
    if (!readySignal) {
      const start = text.indexOf('{')
      if (start >= 0) {
        let depth = 0, inStr = false, esc = false
        for (let i = start; i < text.length; i++) {
          const ch = text[i]
          if (esc) { esc = false; continue }
          if (ch === '\\' && inStr) { esc = true; continue }
          if (ch === '"') { inStr = !inStr; continue }
          if (inStr) continue
          if (ch === '{') depth++
          else if (ch === '}') { depth--; if (depth === 0) {
            try { const p = JSON.parse(text.slice(start, i + 1)); if (p.ready && p.enrichedPrompt) readySignal = p } catch {}
            break
          }}
        }
      }
    }
    // 3. Last resort: if response contains ready markers but JSON is truncated,
    //    extract enrichedPrompt via regex so raw JSON never reaches the user
    if (!readySignal && text.includes('"ready"') && text.includes('"enrichedPrompt"')) {
      const epMatch = text.match(/"enrichedPrompt"\s*:\s*"([\s\S]+?)(?:"\s*[,}]|$)/)
      const sumMatch = text.match(/"summary"\s*:\s*"([\s\S]+?)(?:"\s*[,}]|$)/)
      if (epMatch) {
        readySignal = {
          ready: true,
          enrichedPrompt: epMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
          summary: sumMatch ? sumMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '',
        }
      }
    }

    if (readySignal) {
      return NextResponse.json({
        text: readySignal.summary ? `Got it — building: ${readySignal.summary}` : 'Starting your build...',
        ready: true,
        enrichedPrompt: readySignal.enrichedPrompt,
        summary: readySignal.summary || '',
      })
    }

    // Final safety net: never return raw JSON-like text to the client
    if (text.trimStart().startsWith('{') && text.includes('"enrichedPrompt"')) {
      // Truncated or malformed ready signal — extract what we can from conversation
      const collectedPrompt = messages
        .filter((m: { role: string }) => m.role === 'user')
        .map((m: { content: string }) => m.content)
        .join('\n\n')
      return NextResponse.json({
        text: 'Starting your build...',
        ready: true,
        enrichedPrompt: collectedPrompt,
        summary: 'Building from your conversation',
      })
    }

    return NextResponse.json({ text })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[VIBE] /api/intake error:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
