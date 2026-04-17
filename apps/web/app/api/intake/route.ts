import { NextResponse } from 'next/server'

export const maxDuration = 120

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ptaqytvztkhjpuawdxng.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const EDGE_FN_URL = SUPABASE_URL + '/functions/v1/generate-diff'

const INTAKE_SYSTEM = `You are VIBE, an AI product assistant. You guide the user through a short intake before building.

You have TWO jobs: (1) clarify what to build if vague, (2) ALWAYS ask for data source before building.

## FLOW

STEP 1 — CLARITY CHECK
Read the user's message. Decide:
- SPECIFIC: They named a concrete artifact (dashboard, tracker, pipeline, landing page, CRM, report, analytics, inventory, etc.)
  → Skip to STEP 2 immediately. Do NOT ask what they want to build.
- VAGUE: (e.g. “build something”, “help me”, “I need a tool”)
  → Ask ONE short clarifying question. When they answer, proceed to STEP 2.

STEP 2 — DATA SOURCE (MANDATORY — never skip this step)
Ask exactly: “Would you like to upload a CSV with your data, or build with sample data?”
Nothing else. Wait for their answer.

STEP 3 — OUTPUT
When the user answers the data source question (picks “sample data”, “csv”, uploads a file, etc.):
Output ONLY this JSON, no other text before or after:
{“ready”: true, “enrichedPrompt”: “<see rules below>”, “summary”: “<one-line description>”}

## RULES
- The data source question in STEP 2 is MANDATORY. You must ask it before outputting ready JSON.
- NEVER output ready JSON without first asking and receiving an answer to the data source question.
- NEVER ask “what would you like to build” when the user already named a specific artifact.
- ONE clarifying question max (Step 1), then the data source question (Step 2). That's it — two questions maximum, ever.
- Be conversational, not formal. Keep questions to one sentence.
- If a file is attached below, READ IT FIRST. The data source question is already answered — skip to STEP 3.
- CRITICAL: When ready=true, set enrichedPrompt to the user's EXACT original prompt — their first message, word for word. Do not rewrite, summarize, add context, or enhance it. The downstream system handles enrichment.
- SAMPLE-DATA EXCEPTION (overrides the "EXACT original prompt" rule): If the user picked sample data in STEP 2 — whether or not any data connectors (HubSpot, Salesforce, etc.) are active on their team — you MUST prepend the literal sentinel "[VIBE_DATA_STATE=sample] sample data — " to the enrichedPrompt, before the user's original prompt text. This sentinel is the canonical signal the backend uses to honor the user's explicit sample choice and skip live-connector data injection. Example: user's original prompt is "show me my pipeline", user answered "sample" in STEP 2 → enrichedPrompt is "[VIBE_DATA_STATE=sample] sample data — show me my pipeline". Do not emit this sentinel when the user picks CSV/upload or live/connected data.`

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
          temperature: 0.3,
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

      // ── Detect JSON dashboard vs HTML context ──
      // Strip markdown fences if present, check for DashboardData shape
      let isDashboardEdit = false
      let dashboardContext = ''
      try {
        let probe = trimmedContext.trim()
        const fenceMatch = probe.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/)
        if (fenceMatch) probe = fenceMatch[1].trim()
        if (probe.startsWith('{') || probe.startsWith('[')) {
          let parsed: unknown = JSON.parse(probe)
          if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed) } catch {} }
          // Unwrap pages array if this came from parseDiff output
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
            const first = parsed[0] as Record<string, unknown>
            if ('html' in first && typeof first.html === 'string') {
              // Pages array — try to parse the first page's content as JSON
              try {
                const inner = JSON.parse(first.html as string)
                if (inner && typeof inner === 'object' && 'meta' in inner && 'kpis' in inner) {
                  parsed = inner
                }
              } catch {}
            }
          }
          if (parsed && typeof parsed === 'object') {
            const obj = parsed as Record<string, unknown>
            if ('dashboard_data' in obj) {
              isDashboardEdit = true
              dashboardContext = JSON.stringify(obj.dashboard_data, null, 2)
            } else if ('meta' in obj && 'kpis' in obj) {
              isDashboardEdit = true
              dashboardContext = JSON.stringify(obj, null, 2)
            }
          }
        }
      } catch {
        // Not JSON — fall through to HTML edit path
      }

      // ── Dashboard JSON edit path ──
      if (isDashboardEdit) {
        // For connected dashboards, fetch raw CRM records so the LLM can
        // compute new aggregations (e.g. "win rate by rep") using real data
        let liveDataContext = ''
        try {
          const parsed = JSON.parse(dashboardContext)
          const isConnected = parsed?.meta?.data_source === 'connected'
          if (isConnected && team_id && SUPABASE_SERVICE_KEY) {
            const cacheRes = await fetch(
              `${SUPABASE_URL}/rest/v1/team_connector_data?team_id=eq.${encodeURIComponent(team_id)}&select=provider,model,records,record_count,fetched_at&stale_after=gt.${encodeURIComponent(new Date().toISOString())}`,
              { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
            )
            if (cacheRes.ok) {
              const rows: Array<{ provider: string; model: string; records: unknown[]; record_count: number }> = await cacheRes.json()
              if (rows.length > 0) {
                const samples = rows.map((r) => {
                  // Cap each provider at 50 records to keep context tractable
                  const sample = Array.isArray(r.records) ? r.records.slice(0, 50) : []
                  return `## ${r.provider.toUpperCase()} ${r.model} (${r.record_count} total, showing ${sample.length})\n${JSON.stringify(sample, null, 2)}`
                }).join('\n\n')
                liveDataContext = `\n\n=== LIVE CRM DATA (use these records for any new charts, KPIs, or tables) ===\n${samples}`
              }
            }
          }
        } catch {
          // Non-fatal — proceed with just the dashboard JSON
        }

        // Limit to 25K chars — JSON is denser than HTML
        if (dashboardContext.length > 25000) {
          dashboardContext = dashboardContext.slice(0, 25000) + '\n/* ...truncated... */'
        }
        // Append live data (capped separately to keep combined context under ~60K)
        if (liveDataContext.length > 35000) {
          liveDataContext = liveDataContext.slice(0, 35000) + '\n/* ...records truncated... */'
        }
        dashboardContext = dashboardContext + liveDataContext

        let jsonOut = ''
        try {
          const edgeData = await callEdgeFunction(prompt, '', 8000, {
            mode: 'edit-dashboard',
            model: llmModel,
            context: dashboardContext,
          })
          // edit-dashboard returns { dashboard_data: {...} } shape from edge function
          // but mode was wired through; the result.diff contains the raw JSON output
          jsonOut = edgeData.diff || (edgeData.dashboard_data ? JSON.stringify(edgeData.dashboard_data) : '')
        } catch (edgeErr: any) {
          console.error(`[EDIT-DASHBOARD] Edge Function failed: ${edgeErr.message}`)
          return NextResponse.json({ error: `Dashboard edit failed: ${edgeErr.message}` }, { status: 502 })
        }

        // Strip fences
        if (jsonOut.startsWith('```')) {
          jsonOut = jsonOut.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
        }
        if (!jsonOut) {
          return NextResponse.json({ error: 'LLM returned empty response' }, { status: 502 })
        }

        // Validate it parses and has DashboardData shape
        try {
          const parsed = JSON.parse(jsonOut)
          if (!parsed || typeof parsed !== 'object' || !('meta' in parsed) || !('kpis' in parsed)) {
            return NextResponse.json({ error: 'LLM returned invalid dashboard JSON' }, { status: 502 })
          }
        } catch {
          return NextResponse.json({ error: 'LLM returned malformed JSON' }, { status: 502 })
        }

        return NextResponse.json({ dashboard_json: jsonOut })
      }

      // ── HTML edit path (existing) ──
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

    // Always pass connector status so the LLM can ask smart, contextual questions
    if (team_id) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vibeapi-production-fdd1.up.railway.app'
        const connRes = await fetch(`${apiUrl}/connectors/${team_id}`, {
          headers: { 'Content-Type': 'application/json' },
        })
        let activeConnectorNames: string[] = []
        if (connRes.ok) {
          const connData = await connRes.json()
          const connectors = Array.isArray(connData) ? connData : connData?.connectors || []
          activeConnectorNames = connectors
            .filter((c: { status?: string }) => c.status === 'active')
            .map((c: { connector_type?: string }) => c.connector_type || 'unknown')
        }
        if (activeConnectorNames.length > 0) {
          intakeSystem += `\n\nDATA CONTEXT: The user has active data connectors: ${activeConnectorNames.join(', ')}. Only mention this if relevant to their build request.`
        } else {
          const lastUserMsg = messages?.[messages.length - 1]?.content?.toLowerCase() || ''
          const needsData = /\b(dashboard|analytics|report|metrics|pipeline|revenue|sales|forecast|crm|data|tracker|inventory|orders)\b/.test(lastUserMsg)
          if (needsData) {
            intakeSystem += `\n\nDATA CONTEXT: No data connectors are active. Use realistic sample data for the build spec. Do not present lettered options. Do not mention CSV or file upload. IMPORTANT: In the enrichedPrompt, include the phrase “sample data” so the builder knows to hardcode realistic data into charts instead of querying empty databases. Include this Guided Next Step in the enrichedPrompt: 'Connect your CRM to use live data.'`
          }
        }
      } catch (connErr) {
        console.warn('[INTAKE] connector check failed â€” proceeding without:', connErr)
      }
    }

    // Onboarding intent detection removed — phrases like "get me started",
    // "getting started", "activate" are too broad and hijack normal build
    // conversations. Onboarding should only be triggered via explicit UI navigation.

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
