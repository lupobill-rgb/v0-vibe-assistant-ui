"use client"

import { use, useCallback, useEffect, useMemo, useRef, useState, useReducer } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, ChevronUp, ClipboardCopy, ExternalLink, Globe, Loader2, Lock, Terminal, X } from "lucide-react"
import { PipelineTracker } from "@/components/task/pipeline-tracker"
import { TerminalConsole } from "@/components/task/terminal-console"
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase"
import { createJob, publishJob, API_URL, TENANT_ID } from "@/lib/api"

// ── Thought stream data ──────────────────────────────────────────────────────
const STAGE_TOOLS: Record<string, { label: string; thought: string; pct: number }> = {
  default:     { label: 'Starting...',   thought: 'Initialising build environment...',                     pct: 5  },
  calling_llm: { label: 'Connecting...', thought: 'Connecting to AI and loading skill registry...',        pct: 12 },
  planning:    { label: 'Planning...',   thought: 'Parsing intent and resolving matched skills...',         pct: 28 },
  building:    { label: 'Building...',   thought: 'Generating UI components and wiring data bindings...',  pct: 55 },
  validating:  { label: 'Validating...', thought: 'Verifying schema integrity and component props...',     pct: 72 },
  ux:          { label: 'UX review...',  thought: 'Applying design-intelligence patterns from registry...', pct: 88 },
}

// Tool panel entries — shown in right column during build
const TOOL_STEPS = ['calling_llm', 'planning', 'building', 'validating', 'ux'] as const
type ToolStep = typeof TOOL_STEPS[number]
const TOOL_LABELS: Record<ToolStep, string> = {
  calling_llm: 'AI connect',
  planning:    'Skill match',
  building:    'UI gen',
  validating:  'Validate',
  ux:          'UX pass',
}

interface ThoughtEntry { id: number; text: string; done: boolean }
type ThoughtAction = { type: 'push'; text: string } | { type: 'resolve' }
function thoughtReducer(state: ThoughtEntry[], action: ThoughtAction): ThoughtEntry[] {
  if (action.type === 'push') {
    const prev = state.map(t => ({ ...t, done: true }))
    return [...prev, { id: Date.now(), text: action.text, done: false }]
  }
  if (action.type === 'resolve') return state.map(t => ({ ...t, done: true }))
  return state
}

function ThoughtStream({ executionState }: { executionState: string | undefined }) {
  const [thoughts, dispatch] = useReducer(thoughtReducer, [])
  const prevState = useRef<string | undefined>(undefined)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (executionState === prevState.current) return
    prevState.current = executionState
    const entry = STAGE_TOOLS[executionState ?? ''] ?? STAGE_TOOLS.default
    dispatch({ type: 'push', text: entry.thought })
  }, [executionState])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thoughts])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
      {thoughts.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, opacity: t.done ? 0.45 : 1, transition: 'opacity 0.4s ease' }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="7" cy="7" r="6" stroke={t.done ? '#6b7280' : '#6366f1'} strokeWidth="1.2"/>
            <path d="M7 4v3.2l1.8 1.3" stroke={t.done ? '#6b7280' : '#6366f1'} strokeWidth="1.1" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 12, color: t.done ? '#6b7280' : '#a5b4fc', lineHeight: 1.5, fontStyle: 'italic' }}>
            {t.text}
          </span>
          {!t.done && (
            <Loader2 style={{ width: 11, height: 11, color: '#6366f1', flexShrink: 0, marginTop: 2 }} className="animate-spin" />
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
// ────────────────────────────────────────────────────────────────────────────

type ChatRole = 'vibe' | 'user'
interface ChatMessage { id: number; role: ChatRole; text: string; thought?: string }

interface Task { task_id: string; execution_state: string; pull_request_link?: string; preview_url?: string; last_diff?: string; user_prompt?: string; job_timeline?: any[]; agent_results?: any[]; project_id?: string; guided_next_steps?: string[]; [key: string]: unknown }

function getGuidedNextSteps(prompt: string): string[] {
  const lower = prompt.toLowerCase()
  const dataKeywords = /\b(revenue|pipeline|sales|dashboard|analytics|data|metrics|performance|report|forecast|crm|contacts|deals)\b/
  const alreadyConnected = /\b(uploaded|csv|connected|hubspot|salesforce|airtable)\b/
  if (dataKeywords.test(lower) && !alreadyConnected.test(lower)) {
    return [
      'Connect your CRM (HubSpot or Salesforce) to populate this dashboard with live data',
      'Upload a CSV file with your data to see real numbers instead of placeholders',
      'Go to Marketplace \u2192 Connectors to set up your data sources',
    ]
  }
  return []
}

interface PageData { name: string; filename: string; html: string }

function parseDiff(raw: string): PageData[] {
  const trimmed = raw.trim()
  // Try JSON array first (multi-page)
  if (trimmed.startsWith('[')) {
    try {
      const pages = JSON.parse(trimmed) as PageData[]
      if (Array.isArray(pages) && pages.length > 0 && pages[0].html) return pages
    } catch {}
  }
  // Try JSON that's wrapped in markdown fences
  const fenceMatch = trimmed.match(/`(?:json)?\s*\n?([\s\S]*?)\n?`/)
  if (fenceMatch) {
    try {
      const pages = JSON.parse(fenceMatch[1]) as PageData[]
      if (Array.isArray(pages) && pages.length > 0 && pages[0].html) return pages
    } catch {}
  }
  // Single page: extract HTML from diff lines
  let html = trimmed
  if (!html.startsWith('<!DOCTYPE') && html.includes('+<!DOCTYPE')) {
    html = html.split('\n')
      .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
      .map((l) => l.slice(1)).join('\n')
  }
  // Strip markdown fences
  html = html.replace(/^`html?\s*\n?/i, '').replace(/\n?`\s*$/i, '')
  // Strip LLM preamble text before the first HTML tag
  const firstTagIdx = html.indexOf('<')
  if (firstTagIdx > 0) html = html.substring(firstTagIdx)
  if (!html.trim()) return []
  return [{ name: 'Preview', filename: 'index.html', html }]
}

function buildBlobUrl(pages: PageData[], activeFile: string, teamId?: string): string | null {
  const page = pages.find((p) => p.filename === activeFile) || pages[0]
  if (!page) return null

  // Substitute template placeholders with real values
  let html = page.html
    .replace(/__SUPABASE_URL__/g, SUPABASE_URL)
    .replace(/__SUPABASE_ANON_KEY__/g, SUPABASE_ANON_KEY)
    .replace(/__TEAM_ID__/g, teamId || '')

  // Inject credentials fallback script for HTML that doesn't use placeholders
  const credentialsScript = '<script>' +
    'window.__VIBE_SUPABASE_URL__=window.__VIBE_SUPABASE_URL__||' + JSON.stringify(SUPABASE_URL) + ';' +
    'window.__VIBE_SUPABASE_ANON_KEY__=window.__VIBE_SUPABASE_ANON_KEY__||' + JSON.stringify(SUPABASE_ANON_KEY) + ';' +
    (teamId ? 'window.__VIBE_TEAM_ID__=window.__VIBE_TEAM_ID__||' + JSON.stringify(teamId) + ';' : '') +
    '</script>'
  if (html.toLowerCase().includes('<head>')) {
    html = html.replace(/(<head[^>]*>)/i, `$1\n${credentialsScript}`)
  } else if (html.toLowerCase().includes('<html')) {
    html = html.replace(/(<html[^>]*>)/i, `$1\n${credentialsScript}`)
  } else {
    html = credentialsScript + '\n' + html
  }

  // Inject router script to handle #filename.html navigation
  const routerScript = pages.length > 1 ? '<script>' +
    'window.addEventListener("hashchange",function(){' +
    'var f=location.hash.slice(1);if(f)window.parent.postMessage({vibeNavigate:f},window.location.origin);' +
    '});' +
    'document.addEventListener("click",function(e){' +
    'var a=e.target.closest("a");if(!a)return;var h=a.getAttribute("href");' +
    'if(h&&h.startsWith("#")&&h.endsWith(".html")){' +
    'e.preventDefault();window.parent.postMessage({vibeNavigate:h.slice(1)},window.location.origin);' +
    '}});' +
    '</script>' : ''
  html = html.replace('</body>', routerScript + '</body>')
  const blob = new Blob([html], { type: 'text/html' })
  return URL.createObjectURL(blob)
}

interface BuildingPageProps { params: Promise<{ id: string }> }

export default function BuildingPage({ params }: BuildingPageProps) {
  const { id } = use(params)
  const [task, setTask] = useState<Task | null>(null)
  const [diff, setDiff] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [activeFile, setActiveFile] = useState('index.html')
  const [editPrompt, setEditPrompt] = useState('')
  const [editInput, setEditInput] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [updatePrompt, setUpdatePrompt] = useState('')
  const [updatingJob, setUpdatingJob] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showDomainModal, setShowDomainModal] = useState(false)
  const [customDomain, setCustomDomain] = useState('')
  const [dnsInstructions, setDnsInstructions] = useState<{ cname: { type: string; name: string; value: string }; txt: { type: string; name: string; value: string } } | null>(null)
  const [domainVerified, setDomainVerified] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [connectingDomain, setConnectingDomain] = useState(false)
  const [domainCopied, setDomainCopied] = useState<string | null>(null)
  const [projectName, setProjectName] = useState('')
  const [projectTeamId, setProjectTeamId] = useState<string | undefined>()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const [feedRecs, setFeedRecs] = useState<{ assetId: string; feedName: string; publisherTeam: string; reason: string }[]>([])
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set())
  const router = useRouter()
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Helper to track timeouts and auto-clean on unmount
  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms)
    timersRef.current.push(t)
    return t
  }, [])

  const handleConnectDomain = async () => {
    if (!customDomain.trim() || !projectTeamId) return
    setConnectingDomain(true)
    setPublishError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${API_URL}/teams/${projectTeamId}/domain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': TENANT_ID,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ domain: customDomain.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      setDnsInstructions(data.instructions)
    } catch (err: any) {
      setPublishError(err.message)
    } finally {
      setConnectingDomain(false)
    }
  }

  const handleVerifyDomain = async () => {
    if (!projectTeamId || !jobId) return
    setVerifying(true)
    setPublishError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${API_URL}/teams/${projectTeamId}/domain/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': TENANT_ID,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 422) {
          setPublishError('DNS not found yet, may take up to 48 hours to propagate')
        } else {
          throw new Error(data.error || `Verification failed (${res.status})`)
        }
        return
      }
      setDomainVerified(true)
      // Domain verified — now publish the site
      setPublishing(true)
      try {
        const result = await publishJob(jobId)
        if (result.error) { setPublishError(result.error) }
        else if (result.published_url) { setPublishedUrl(result.published_url); setShowDomainModal(false) }
      } catch (err: any) { setPublishError(err.message || 'Publish failed') }
      finally { setPublishing(false) }
    } catch (err: any) {
      setPublishError(err.message)
    } finally {
      setVerifying(false)
    }
  }

  // Clean up all tracked timeouts on unmount
  useEffect(() => {
    return () => { timersRef.current.forEach(clearTimeout) }
  }, [])

  useEffect(() => {
    let cancelled = false

    // Wait for Supabase auth session to restore (critical on mobile refresh where
    // session restore from storage is async — without this, RLS blocks all queries
    // and the page appears blank / crashes)
    async function waitForSession(retries = 8): Promise<boolean> {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) return true
      if (retries <= 0) return false
      await new Promise(r => setTimeout(r, 400))
      return waitForSession(retries - 1)
    }

    async function resolveJobId(): Promise<string | null> {
      // First check if id is directly a job id
      const { data: directJob } = await supabase
        .from('jobs')
        .select('id')
        .eq('id', id)
        .maybeSingle()
      if (directJob?.id) return directJob.id
      // Fall back to project_id lookup (latest job for that project)
      const { data: latest, error } = await supabase
        .from('jobs')
        .select('id')
        .eq('project_id', id)
        .order('initiated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) { console.error('[VIBE] resolveJobId error:', error.message); return null }
      return latest?.id ?? null
    }

    const poll = async () => {
      try {
        const hasSession = await waitForSession()
        if (cancelled) return
        if (!hasSession) { console.warn('[VIBE] No auth session after retries'); return }

        const { data: proj } = await supabase.from('projects').select('name, team_id').eq('id', id).maybeSingle()
        if (!cancelled && proj?.name) setProjectName(proj.name)
        if (!cancelled && proj?.team_id) setProjectTeamId(proj.team_id)

        const resolvedId = await resolveJobId()
        if (!resolvedId || cancelled) return
        if (!cancelled) setJobId(resolvedId)

        // Immediately fetch current job state before entering poll loop
        {
          const { data: initial } = await supabase
            .from('jobs')
            .select('execution_state, last_diff, project_id, user_prompt')
            .eq('id', resolvedId)
            .maybeSingle()
          if (cancelled) return
          if (initial) {
            setTask(prev => ({ ...(prev ?? {}), task_id: id, ...initial } as Task))
            if (initial.last_diff) setDiff(initial.last_diff)
            if (initial.execution_state === 'completed' ||
                initial.execution_state === 'failed') return
          }
        }

        while (!cancelled) {
          try {
            const { data } = await supabase
              .from('jobs')
              .select('execution_state, last_diff, project_id, user_prompt')
              .eq('id', resolvedId)
              .maybeSingle()
            if (cancelled) break
            if (data) {
              setTask(prev => ({ ...(prev ?? {}), task_id: id, ...data } as Task))
              if (data.last_diff) setDiff(data.last_diff)
              if (data.execution_state === 'completed' ||
                  data.execution_state === 'failed') break
            }
          } catch (err) {
            if (cancelled) break
            console.error('[VIBE] Poll iteration error:', err)
          }
          await new Promise(r => setTimeout(r, 2000))
        }
      } catch (err) {
        if (!cancelled) console.error('[VIBE] Poll setup error:', err)
      }
    }
    poll().catch(err => { if (!cancelled) console.error('[VIBE] Poll unhandled:', err) })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!jobId) return
    const channel = supabase.channel("build-" + jobId)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs", filter: "id=eq." + jobId },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          if (row.execution_state) setTask((prev) => {
            const base = prev ?? { task_id: id } as Task
            return { ...base, execution_state: row.execution_state as string }
          })
          if (row.last_diff) setDiff(row.last_diff as string)
        }
      ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [jobId])

  // Listen for navigation messages from iframe
  useEffect(() => {
    const iframeOrigin = window.location.origin;
    const handler = (e: MessageEvent) => {
      if (e.origin !== iframeOrigin && e.origin !== 'null') return;
      if (e.data?.vibeNavigate) setActiveFile(e.data.vibeNavigate)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const pages = useMemo(() => {
    const raw = diff || (typeof task?.last_diff === 'string' ? task.last_diff : null)
    return raw ? parseDiff(raw) : []
  }, [diff, task?.last_diff])
  const prevBlobRef = useRef<string | null>(null)
  const previewUrl = useMemo(() => {
    // Revoke previous blob URL before creating a new one
    if (prevBlobRef.current) { URL.revokeObjectURL(prevBlobRef.current); prevBlobRef.current = null }
    if (pages.length === 0) return null
    const url = buildBlobUrl(pages, activeFile, projectTeamId)
    prevBlobRef.current = url
    return url
  }, [pages, activeFile, projectTeamId])

  // Revoke on final unmount
  useEffect(() => {
    return () => { if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current) }
  }, [])

  const guidedNextSteps = useMemo(() => task?.guided_next_steps ?? getGuidedNextSteps(task?.user_prompt ?? ''), [task?.guided_next_steps, task?.user_prompt])
  const isComplete = task?.execution_state === "completed" || task?.execution_state === "failed"
  const isMultiPage = pages.length > 1

  // Set document title to project name when build completes successfully
  useEffect(() => {
    if (task?.execution_state === 'completed' && projectName) {
      document.title = projectName
    }
    return () => { document.title = 'VIBE - AI Coding Assistant' }
  }, [task?.execution_state, projectName])

  const [editError, setEditError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatThought, setChatThought] = useState<string | null>(null)
  const [completedTools, setCompletedTools] = useState<ToolStep[]>([])
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const welcomeSentRef = useRef(false)

  // Track which tool steps have completed based on execution_state progression
  useEffect(() => {
    const state = task?.execution_state as ToolStep | undefined
    if (!state || !TOOL_STEPS.includes(state as ToolStep)) return
    setCompletedTools(prev => {
      const idx = TOOL_STEPS.indexOf(state as ToolStep)
      const done = TOOL_STEPS.slice(0, idx) as unknown as ToolStep[]
      return [...new Set([...prev, ...done])]
    })
  }, [task?.execution_state])

  // Fire welcome message once when build completes
  useEffect(() => {
    if (task?.execution_state !== 'completed' || welcomeSentRef.current) return
    welcomeSentRef.current = true
    const prompt = task?.user_prompt ?? ''
    // Truncate at word boundary
    const words = prompt.split(' ')
    let truncated = ''
    for (const w of words) {
      if ((truncated + ' ' + w).length > 80) break
      truncated += (truncated ? ' ' : '') + w
    }
    const appName = projectName || 'your app'
    setChatMessages([{
      id: Date.now(),
      role: 'vibe',
      text: `${appName} is ready${truncated ? ` — built from "${truncated}${prompt.split(' ').length > truncated.split(' ').length ? '...' : ''}"` : ''}. If any charts or sections are missing, just ask me to add them. Ask me to change anything — layout, data, pages, or logic.`,
    }])
  }, [task?.execution_state, task?.user_prompt, projectName])

  // Fetch feed recommendations after build completes (once)
  const feedRecsFetchedRef = useRef(false)
  useEffect(() => {
    if (task?.execution_state !== 'completed' || !jobId || !projectTeamId) return
    if (feedRecsFetchedRef.current) return
    feedRecsFetchedRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        const res = await fetch(`${API_URL}/api/feeds/recommendations?jobId=${jobId}&teamId=${projectTeamId}`, {
          headers: {
            'X-Tenant-Id': TENANT_ID,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
          setFeedRecs(data.recommendations.slice(0, 2))
        }
      } catch { /* non-blocking — empty recs is fine */ }
    })()
    return () => { cancelled = true }
  }, [task?.execution_state, jobId, projectTeamId])

  const handleSubscribeFeed = useCallback(async (assetId: string, feedName: string) => {
    if (!projectTeamId || subscribedIds.has(assetId)) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${API_URL}/api/feeds/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': TENANT_ID,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ assetId, teamId: projectTeamId }),
      })
      if (!res.ok) return
      setSubscribedIds(prev => new Set(prev).add(assetId))
      const projectType = task?.user_prompt?.split(' ').slice(0, 4).join(' ') || 'project'
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        role: 'vibe' as const,
        text: `Subscribed to ${feedName}. Try: "Rebuild this ${projectType} with ${feedName} data included"`,
      }])
    } catch { /* silent — button stays enabled for retry */ }
  }, [projectTeamId, subscribedIds, task?.user_prompt])

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatThought])

  const handleChat = useCallback(async (input: string) => {
    if (!input.trim() || !diff || isEditing) return
    const userMsg: ChatMessage = { id: Date.now(), role: 'user', text: input }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setIsEditing(true)
    setEditError(null)
    setChatThought('Reading current page and preparing edit...')
    try {
      const currentPages = parseDiff(diff)
      const activeIdx = currentPages.findIndex(p => p.filename === activeFile)
      const targetIdx = activeIdx >= 0 ? activeIdx : 0
      const currentHtml = currentPages[targetIdx]?.html ?? ''
      const { data: { session } } = await supabase.auth.getSession()
      setChatThought('Applying your changes to the UI...')
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          edit: true,
          context: currentHtml,
          messages: [{ role: 'user', content: input }],
        }),
      })
      const json = await res.json()
      setChatThought(null)
      if (!res.ok) {
        const errMsg = json.error || `Request failed (${res.status})`
        setEditError(errMsg)
        setChatMessages(prev => [...prev, { id: Date.now(), role: 'vibe', text: `I ran into an issue: ${errMsg}. Try rephrasing or simplify the request.` }])
        return
      }
      const editedHtml = json.html || ''
      // VIBE returned a clarifying question
      if (editedHtml && !editedHtml.trim().toLowerCase().startsWith('<!doctype') && !editedHtml.trim().startsWith('<html')) {
        setChatMessages(prev => [...prev, { id: Date.now(), role: 'vibe', text: editedHtml.trim() }])
        return
      }
      if (!editedHtml) {
        setChatMessages(prev => [...prev, { id: Date.now(), role: 'vibe', text: 'No updated HTML received. Try again.' }])
        return
      }
      if (currentHtml.length > 1000 && editedHtml.length < currentHtml.length * 0.6) {
        setChatMessages(prev => [...prev, { id: Date.now(), role: 'vibe', text: 'Edit appeared truncated so I kept the original. Try a simpler change.' }])
        return
      }
      const updatedPages = currentPages.map((p, i) => i === targetIdx ? { ...p, html: editedHtml } : p)
      const newDiff = JSON.stringify(updatedPages)
      setDiff(newDiff)
      if (jobId) {
        await supabase.from('jobs').update({ last_diff: newDiff, previous_diff: diff }).eq('id', jobId)
      }
      setChatMessages(prev => [...prev, { id: Date.now(), role: 'vibe', text: 'Done — preview updated. What else would you like to change?' }])
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setChatThought(null)
      setChatMessages(prev => [...prev, { id: Date.now(), role: 'vibe', text: `Edit failed: ${message}` }])
    } finally {
      setIsEditing(false)
      setChatThought(null)
    }
  }, [diff, isEditing, activeFile, jobId])

  const handleEdit = async (promptOverride?: string) => {
    const prompt = promptOverride || editInput.trim()
    if (!prompt || !diff || isEditing) return
    setIsEditing(true)
    setEditError(null)
    try {
      const currentPages = parseDiff(diff)
      // Edit the currently active page, not always the first one
      const activeIdx = currentPages.findIndex((p) => p.filename === activeFile)
      const targetIdx = activeIdx >= 0 ? activeIdx : 0
      const currentHtml = currentPages[targetIdx]?.html ?? ''
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({
          edit: true,
          context: currentHtml,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setEditError(json.error || 'Request failed (' + res.status + ')')
        return
      }
      const editedHtml = json.html || ''
      // If VIBE returned a clarifying question instead of HTML, show it to the user
      if (editedHtml && !editedHtml.trim().toLowerCase().startsWith('<!doctype') && !editedHtml.trim().startsWith('<html')) {
        setEditPrompt(editedHtml.trim())
        setIsEditing(false)
        return
      }
      if (editedHtml) {
        const trimmedDiff = editedHtml.trim()
        if (!trimmedDiff.startsWith('<!DOCTYPE') && !trimmedDiff.startsWith('<!doctype') && !trimmedDiff.startsWith('<html')) {
          setEditError('LLM returned invalid HTML. Try a simpler edit.')
          return
        }
        // Validate edit didn't truncate: edited HTML should be at least 60% of original size
        if (currentHtml.length > 1000 && trimmedDiff.length < currentHtml.length * 0.6) {
          setEditError(`Edit appears truncated (${trimmedDiff.length} chars vs original ${currentHtml.length}). Original preserved. Try a simpler edit.`)
          return
        }
        // Merge edited page back into existing pages array at the active index
        const updatedPages = currentPages.map((p, i) =>
          i === targetIdx ? { ...p, html: editedHtml } : p
        )
        const newDiff = JSON.stringify(updatedPages)
        setDiff(newDiff)
        // Back up pre-edit version, then persist new version
        if (jobId) {
          await supabase
            .from('jobs')
            .update({ last_diff: newDiff, previous_diff: diff })
            .eq('id', jobId)
        }
        setEditInput('')
        setEditPrompt('')
      } else {
        setEditError('No updated HTML received. Try again.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[VIBE] Edit failed:', message)
      setEditError('Edit failed: ' + message)
    } finally {
      setIsEditing(false)
    }
  }

  const handleUpdate = useCallback(async () => {
    const projectId = task?.project_id
    if (!updatePrompt.trim() || !projectId || updatingJob) return
    setUpdatingJob(true)
    try {
      const result = await createJob({ prompt: updatePrompt.trim(), project_id: projectId, base_branch: 'main' })
      if (result.task_id) {
        router.push(`/building/${result.task_id}`)
      }
    } catch (err) {
      console.error('[VIBE] Update job failed:', err)
    } finally {
      setUpdatingJob(false)
    }
  }, [task?.project_id, updatePrompt, updatingJob, router])

  return (
    <div className="flex h-[100dvh] overflow-hidden relative flex-col md:flex-row-reverse" style={{ background: '#0d0d12' }}>
      <div className="flex-1 flex flex-col min-w-0" style={{ borderLeft: '1px solid #1e1e2a' }}>
        {isMultiPage && (
          <div className="flex items-center gap-1 px-3 min-h-[44px] overflow-x-auto" style={{ borderBottom: '1px solid #1e1e2a', background: '#13131a' }}>
            {pages.map((p) => (
              <button key={p.filename} onClick={() => setActiveFile(p.filename)}
                style={{
                  padding: '0 12px', minHeight: 44, fontSize: 13, borderRadius: 6,
                  whiteSpace: 'nowrap', transition: 'all 0.15s ease', border: 'none', cursor: 'pointer',
                  background: activeFile === p.filename ? '#6366f1' : 'transparent',
                  color: activeFile === p.filename ? '#fff' : '#6b7280',
                  fontFamily: 'Inter, sans-serif'
                }}>
                {p.name}
              </button>
            ))}
          </div>
        )}
        {previewUrl ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 px-4 h-11 flex-shrink-0" style={{ borderBottom: '1px solid #1e1e2a', background: '#13131a' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>Preview</span>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
              {isMultiPage && <span style={{ fontSize: 12, color: '#6b7280' }}>{activeFile}</span>}
              <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Inter, sans-serif' }}>
                <ExternalLink className="w-3 h-3" /> Open
              </a>
            </div>
            <iframe key={previewUrl} src={previewUrl} sandbox="allow-scripts"
              className="flex-1 w-full border-0 bg-white" title="Generated website preview" />
            {task?.execution_state === 'completed' && guidedNextSteps.length > 0 && !nudgeDismissed && (
              <div style={{
                padding: '14px 20px', borderTop: '1px solid #1e1e2a',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(56,189,248,0.08))',
                fontFamily: 'Inter, sans-serif', position: 'relative', flexShrink: 0
              }}>
                <button onClick={() => setNudgeDismissed(true)} style={{
                  position: 'absolute', top: 10, right: 10, background: 'none', border: 'none',
                  color: '#6b7280', cursor: 'pointer', padding: 4
                }}><X className="w-3.5 h-3.5" /></button>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#f0f0ff', marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {'💡 Make this dashboard live with real data'}
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {guidedNextSteps.map((step, i) => (
                    <li key={i} style={{ fontSize: 12, color: '#a5b4fc', lineHeight: 1.5 }}>
                      {step.includes('Marketplace') ? (
                        <Link href="/marketplace" style={{ color: '#818cf8', textDecoration: 'underline', textUnderlineOffset: 2 }}>{step}</Link>
                      ) : step}
                    </li>
                  ))}
                </ul>
                <Link href="/marketplace" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
                  fontSize: 12, fontWeight: 600, color: '#fff', background: '#6366f1',
                  borderRadius: 6, padding: '6px 14px', textDecoration: 'none',
                }}>Connect Now</Link>
              </div>
            )}
          </div>
        ) : isComplete ? (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col items-center justify-center gap-4">
            <p style={{ color: '#6b7280', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>{task?.execution_state === "failed" ? "Build failed" : "Build complete"}</p>
            <p style={{ color: '#6b7280', fontSize: 14 }}>No preview available</p>
          </div>
        ) : !previewUrl && task?.execution_state !== 'completed' ? (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col items-center justify-center gap-4">
            <div style={{ width: 64, height: 64, borderRadius: 16, background: '#13131a', border: '1px solid #1e1e2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #6366f1', borderTopColor: 'transparent' }} className="animate-spin" />
            </div>
            <p style={{ color: '#f0f0ff', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>Building your app...</p>
            <p style={{ color: '#6b7280', fontSize: 14 }}>Preview will appear here when ready</p>
          </div>
        ) : null}
      </div>
      <div className="w-full md:w-[560px] flex-shrink-0 flex flex-col order-first md:order-none" style={{ background: '#13131a', fontFamily: 'Inter, sans-serif' }}>
        {/* ── [1] MOBILE TOGGLE ── */}
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex md:hidden items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid #1e1e2a' }}
        >
          <span style={{ fontSize: 13, fontWeight: 500, color: '#f0f0ff' }}>
            {projectName || 'Untitled App'}
          </span>
          {sidebarOpen ? <ChevronUp className="w-4 h-4" style={{ color: '#6b7280' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#6b7280' }} />}
        </button>

        {/* ── [2] TOPBAR — single row: back, name, progress, status ── */}
        <div className={(sidebarOpen ? "flex" : "hidden md:flex")}
          style={{ alignItems: 'center', gap: 10, height: 44, padding: '0 16px', borderBottom: '1px solid #1e1e2a', flexShrink: 0 }}>
          <Link href="/" style={{ color: '#6b7280', display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Link>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#f0f0ff', fontFamily: "'Space Grotesk', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>
            {projectName || 'Untitled App'}
          </span>
          {!isComplete && (
            <>
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#1e1e2a', overflow: 'hidden', minWidth: 40 }}>
                <div style={{
                  height: '100%', borderRadius: 2, background: '#6366f1',
                  transition: 'width 0.6s ease',
                  width: `${(STAGE_TOOLS[task?.execution_state ?? ''] ?? STAGE_TOOLS.default).pct}%`
                }} />
              </div>
              <span style={{ fontSize: 11, color: '#6366f1', flexShrink: 0, fontWeight: 500 }}>
                {(STAGE_TOOLS[task?.execution_state ?? ''] ?? STAGE_TOOLS.default).pct}%
              </span>
            </>
          )}
          {task?.execution_state === 'failed' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 100, padding: '2px 9px', flexShrink: 0, marginLeft: 'auto' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444' }} /> Failed
            </span>
          ) : isComplete ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 100, padding: '2px 9px', flexShrink: 0, marginLeft: 'auto' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} /> Ready
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 100, padding: '2px 9px', flexShrink: 0 }}>
              <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#f59e0b' }} /> Building...
            </span>
          )}
        </div>

        {/* ── [3a] BUILD BODY — two-column + input bar (while building) ── */}
        {!isComplete && (
          <div className={(sidebarOpen ? "flex" : "hidden md:flex")} style={{ flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
            {/* LEFT COLUMN — user bubble + VIBE bubble + thought stream + typing dots */}
            <div style={{ flex: 1, padding: '14px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, scrollbarWidth: 'none' }}>
              {/* User prompt bubble */}
              {task?.user_prompt && (
                <div style={{ display: 'flex', gap: 8, flexDirection: 'row-reverse', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 600, background: '#1e1e2a', color: '#6b7280',
                  }}>BL</div>
                  <div style={{
                    maxWidth: '78%', padding: '8px 12px', borderRadius: '10px 0 10px 10px',
                    background: 'rgba(99,102,241,0.1)', border: '1px solid #1e1e2a',
                    fontSize: 13, lineHeight: 1.55, color: '#f0f0ff',
                  }}>
                    {task.user_prompt.length > 120
                      ? task.user_prompt.slice(0, task.user_prompt.lastIndexOf(' ', 120)).trimEnd() + '...'
                      : task.user_prompt}
                  </div>
                </div>
              )}
              {/* VIBE response bubble */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600,
                  background: 'rgba(99,102,241,0.15)', color: '#6366f1',
                }}>V</div>
                <div style={{
                  padding: '8px 12px', borderRadius: '0 10px 10px 10px',
                  background: 'rgba(99,102,241,0.15)', border: '1px solid #1e1e2a',
                  fontSize: 13, lineHeight: 1.55, color: '#a5b4fc',
                }}>
                  Got it. Building your app now...
                </div>
              </div>
              <ThoughtStream executionState={task?.execution_state} />
              {/* Typing indicator — 3 animated purple dots */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 36 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#6366f1',
                    animation: 'pulse 1.4s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`, opacity: 0.6,
                  }} />
                ))}
                <style>{`@keyframes pulse { 0%,80%,100% { opacity:0.3; transform:scale(0.8) } 40% { opacity:1; transform:scale(1.1) } }`}</style>
              </div>
            </div>
            {/* RIGHT COLUMN — tool panel */}
            <div style={{ width: 180, flexShrink: 0, borderLeft: '1px solid #1e1e2a', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
              <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', marginBottom: 2 }}>Tools used</span>
              {TOOL_STEPS.map(step => {
                const isDone = completedTools.includes(step)
                const isActive = task?.execution_state === step
                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 7px', borderRadius: 6, border: '1px solid #1e1e2a', background: isActive ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9,
                      background: isDone ? 'rgba(16,185,129,0.15)' : isActive ? 'rgba(99,102,241,0.15)' : '#1e1e2a',
                      color: isDone ? '#10b981' : isActive ? '#6366f1' : '#6b7280',
                    }}>
                      {isDone ? '\u2713' : isActive ? <Loader2 style={{ width: 9, height: 9 }} className="animate-spin" /> : '\u2014'}
                    </div>
                    <span style={{ fontSize: 11, color: isDone ? '#6b7280' : isActive ? '#a5b4fc' : '#4b5563', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {TOOL_LABELS[step]}
                    </span>
                    <span style={{ fontSize: 10, flexShrink: 0, color: isDone ? '#10b981' : isActive ? '#6366f1' : '#4b5563' }}>
                      {isDone ? 'done' : isActive ? 'live' : 'next'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          {/* Build-phase input bar */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid #1e1e2a', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <input
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editPrompt.trim() && !isEditing) { const p = editPrompt.trim(); setEditPrompt(''); handleEdit(p) }
                }}
                placeholder="Steer the build or ask a question..."
                disabled={isEditing}
                style={{
                  width: '100%', height: 34, borderRadius: 8,
                  background: '#0d0d12', border: '1px solid #1e1e2a',
                  padding: '0 38px 0 12px', fontSize: 13, color: '#f0f0ff',
                  outline: 'none',
                  opacity: isEditing ? 0.4 : 1,
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#6366f1' }}
                onBlur={(e) => { e.target.style.borderColor = '#1e1e2a' }}
              />
              <button
                onClick={() => { if (editPrompt.trim() && !isEditing) { const p = editPrompt.trim(); setEditPrompt(''); handleEdit(p) } }}
                disabled={isEditing || !editPrompt.trim()}
                style={{
                  position: 'absolute', right: 3, top: 2, width: 30, height: 30,
                  borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: editPrompt.trim() ? '#6366f1' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: editPrompt.trim() ? '#fff' : '#6b7280',
                  transition: 'all 0.15s ease',
                }}>
                {isEditing
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
              </button>
            </div>
          </div>
          </div>
        )}

        {/* ── [3b] COMPLETE BODY — actions, chat ── */}
        {isComplete && (
          <div className={(sidebarOpen ? "flex" : "hidden md:flex")} style={{ flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* TOP SECTION — Open App + Push Live + publishError */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e1e2a', flexShrink: 0 }}>
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', height: 44, borderRadius: 8, border: 'none',
                    background: '#6366f1', color: '#fff', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', textDecoration: 'none', marginBottom: 8
                  }}>
                  <ExternalLink className="w-4 h-4" /> Open App
                </a>
              )}
              {publishedUrl ? (() => {
                const shareUrl = domainVerified && customDomain
                  ? `https://${customDomain}`
                  : typeof window !== 'undefined'
                    ? `${window.location.origin}/s/${jobId}`
                    : `/s/${jobId}`
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      <Check className="w-3.5 h-3.5" style={{ color: '#10b981', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#10b981', fontWeight: 500 }}>Live{domainVerified ? ' \u2014 Custom Domain' : ''}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a href={shareUrl} target="_blank" rel="noopener noreferrer"
                        style={{
                          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6,
                          padding: '0 10px', height: 38, borderRadius: 8,
                          background: '#0d0d12', border: '1px solid #1e1e2a',
                          fontSize: 12, color: '#6366f1', textDecoration: 'none', overflow: 'hidden'
                        }}>
                        <Globe className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shareUrl.replace(/^https?:\/\//, '')}</span>
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(shareUrl)
                          setCopied(true)
                          safeTimeout(() => setCopied(false), 2000)
                        }}
                        style={{
                          flexShrink: 0, height: 38, padding: '0 12px', borderRadius: 8,
                          background: '#0d0d12', border: '1px solid #1e1e2a',
                          fontSize: 12, fontWeight: 500, color: '#f0f0ff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6
                        }}>
                        {copied ? <><Check className="w-3 h-3" style={{ color: '#10b981' }} /> Copied</> : <><ClipboardCopy className="w-3 h-3" /> Copy</>}
                      </button>
                    </div>
                  </div>
                )
              })() : (
                <button
                  type="button"
                  onClick={() => setShowDomainModal(true)}
                  disabled={publishing}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', height: 44, borderRadius: 8,
                    background: 'transparent', border: '1px solid #1e1e2a',
                    color: '#f0f0ff', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', opacity: publishing ? 0.5 : 1
                  }}>
                  {publishing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publishing...</> : 'Push Live'}
                </button>
              )}
              {publishError && (
                <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{publishError}</p>
              )}

              {/* ── Push Live modal (portal to body to escape overflow:hidden) ── */}
              {showDomainModal && createPortal(
                <div
                  role="dialog"
                  aria-modal="true"
                  style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
                >
                  <div style={{ width: '100%', maxWidth: 448, borderRadius: 16, background: '#1e293b', border: '1px solid #334155', padding: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 className="text-sm font-semibold text-white">Push Live</h3>
                      <button type="button" onClick={() => { setShowDomainModal(false); setDnsInstructions(null); setPublishError(null) }}
                        className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>

                    {!dnsInstructions ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <button type="button"
                          onClick={async () => {
                            if (!jobId) return
                            setPublishing(true)
                            setPublishError(null)
                            try {
                              const result = await publishJob(jobId)
                              if (result.error) { setPublishError(result.error) }
                              else if (result.published_url) { setPublishedUrl(result.published_url); setShowDomainModal(false) }
                            } catch (err: any) { setPublishError(err.message || 'Publish failed') }
                            finally { setPublishing(false) }
                          }}
                          disabled={publishing}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                            padding: '12px 16px', borderRadius: 12,
                            background: '#0d0d12', border: '1px solid #1e1e2a',
                            color: '#f0f0ff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                            textAlign: 'left', opacity: publishing ? 0.5 : 1
                          }}>
                          <Globe className="w-4 h-4" style={{ color: '#6366f1', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 600 }}>Publish to VIBE URL</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Get a shareable link instantly</div>
                          </div>
                          {publishing && <Loader2 className="w-4 h-4 animate-spin" style={{ marginLeft: 'auto' }} />}
                        </button>

                        <div style={{
                          display: 'flex', flexDirection: 'column', gap: 10, width: '100%',
                          padding: '12px 16px', borderRadius: 12,
                          background: '#0d0d12', border: '1px solid #1e1e2a',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Lock className="w-4 h-4" style={{ color: '#a855f7', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: '#f0f0ff' }}>Use my own domain</div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Point your domain to this app</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input
                              value={customDomain}
                              onChange={(e) => setCustomDomain(e.target.value)}
                              placeholder="app.yourdomain.com"
                              onKeyDown={(e) => { if (e.key === 'Enter' && customDomain.trim() && !connectingDomain) handleConnectDomain() }}
                              className="flex-1 h-9 rounded-lg bg-slate-900 border border-slate-600 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                            />
                            <button
                              type="button"
                              onClick={handleConnectDomain}
                              disabled={connectingDomain || !customDomain.trim()}
                              style={{
                                height: 36, padding: '0 14px', borderRadius: 8,
                                background: '#a855f7', border: 'none', color: '#fff',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                opacity: (connectingDomain || !customDomain.trim()) ? 0.5 : 1,
                                display: 'flex', alignItems: 'center', gap: 6
                              }}>
                              {connectingDomain ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Connect'}
                            </button>
                          </div>
                        </div>

                        {publishError && (
                          <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{publishError}</p>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <p style={{ fontSize: 12, color: '#94a3b8' }}>
                          Add these DNS records with your domain provider:
                        </p>
                        {[dnsInstructions.cname, dnsInstructions.txt].map((rec) => {
                          const key = `${rec.type}-${rec.name}`
                          return (
                            <div key={key} style={{
                              position: 'relative', padding: '10px 14px', borderRadius: 8,
                              background: '#0d0d12', border: '1px solid #1e1e2a', fontFamily: 'monospace', fontSize: 11
                            }}>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${rec.type}\t${rec.name}\t${rec.value}`)
                                  setDomainCopied(key)
                                  safeTimeout(() => setDomainCopied(null), 2000)
                                }}
                                style={{
                                  position: 'absolute', top: 6, right: 6, background: 'none', border: 'none',
                                  cursor: 'pointer', padding: 2
                                }}>
                                {domainCopied === key
                                  ? <Check className="w-3 h-3" style={{ color: '#10b981' }} />
                                  : <ClipboardCopy className="w-3 h-3" style={{ color: '#64748b' }} />}
                              </button>
                              <div style={{ display: 'flex', gap: 8, color: '#94a3b8' }}>
                                <span style={{ width: 40 }}>Type</span>
                                <span style={{ color: '#f0f0ff', fontWeight: 600 }}>{rec.type}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8, color: '#94a3b8', marginTop: 4 }}>
                                <span style={{ width: 40 }}>Name</span>
                                <span style={{ color: '#f0f0ff', wordBreak: 'break-all' }}>{rec.name}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8, color: '#94a3b8', marginTop: 4 }}>
                                <span style={{ width: 40 }}>Value</span>
                                <span style={{ color: '#f0f0ff', wordBreak: 'break-all' }}>{rec.value}</span>
                              </div>
                            </div>
                          )
                        })}
                        <button
                          type="button"
                          onClick={handleVerifyDomain}
                          disabled={verifying}
                          style={{
                            height: 40, borderRadius: 8, border: '1px solid rgba(168,85,247,0.4)',
                            background: 'rgba(168,85,247,0.1)', color: '#a855f7',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            opacity: verifying ? 0.5 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                          }}>
                          {verifying
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking DNS...</>
                            : "I've added these records \u2014 Verify"}
                        </button>
                        {publishError && (
                          <p style={{ fontSize: 12, color: '#ef4444' }}>{publishError}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </div>

            {/* CHAT SECTION — fills remaining space */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Message history scrollable */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12, scrollbarWidth: 'none' }}>
                {chatMessages.map(msg => (
                  <div key={msg.id} style={{ display: 'flex', gap: 8, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 600,
                      background: msg.role === 'vibe' ? 'rgba(99,102,241,0.15)' : '#1e1e2a',
                      color: msg.role === 'vibe' ? '#6366f1' : '#6b7280',
                    }}>
                      {msg.role === 'vibe' ? 'V' : 'BL'}
                    </div>
                    <div style={{
                      maxWidth: '78%', padding: '8px 12px',
                      borderRadius: msg.role === 'vibe' ? '0 10px 10px 10px' : '10px 0 10px 10px',
                      fontSize: 13, lineHeight: 1.55,
                      background: msg.role === 'vibe' ? '#13131a' : 'rgba(99,102,241,0.1)',
                      border: '1px solid #1e1e2a',
                      color: msg.role === 'vibe' ? '#a5b4fc' : '#f0f0ff',
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {/* Feed recommendations card */}
                {feedRecs.length > 0 && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc', marginBottom: 8 }}>
                      📡 Teams sharing data you might use:
                    </div>
                    {feedRecs.map(rec => (
                      <div key={rec.assetId} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 0', gap: 8,
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#f0f0ff' }}>{rec.feedName}</span>
                          <span style={{ fontSize: 12, color: '#6b7280' }}> from {rec.publisherTeam}</span>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{rec.reason}</div>
                        </div>
                        <button
                          onClick={() => handleSubscribeFeed(rec.assetId, rec.feedName)}
                          disabled={subscribedIds.has(rec.assetId)}
                          style={{
                            flexShrink: 0, padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                            border: 'none', cursor: subscribedIds.has(rec.assetId) ? 'default' : 'pointer',
                            background: subscribedIds.has(rec.assetId) ? 'rgba(16,185,129,0.1)' : '#6366f1',
                            color: subscribedIds.has(rec.assetId) ? '#10b981' : '#fff',
                            transition: 'all 0.15s ease',
                          }}>
                          {subscribedIds.has(rec.assetId) ? '✓ Subscribed' : 'Subscribe'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Active thought line */}
                {chatThought && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 32 }}>
                    <Loader2 style={{ width: 11, height: 11, color: '#6366f1', flexShrink: 0 }} className="animate-spin" />
                    <span style={{ fontSize: 12, color: '#6366f1', fontStyle: 'italic' }}>{chatThought}</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Single input bar */}
              <div style={{ padding: '10px 20px', borderTop: '1px solid #1e1e2a', flexShrink: 0 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && chatInput.trim() && !isEditing) handleChat(chatInput.trim())
                    }}
                    placeholder="Steer the build or ask a question..."
                    disabled={isEditing}
                    style={{
                      width: '100%', height: 34, borderRadius: 8,
                      background: '#0d0d12', border: '1px solid #1e1e2a',
                      padding: '0 38px 0 12px', fontSize: 13, color: '#f0f0ff',
                      outline: 'none',
                      opacity: isEditing ? 0.4 : 1,
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#6366f1' }}
                    onBlur={(e) => { e.target.style.borderColor = '#1e1e2a' }}
                  />
                  <button
                    onClick={() => { if (chatInput.trim() && !isEditing) handleChat(chatInput.trim()) }}
                    disabled={isEditing || !chatInput.trim()}
                    style={{
                      position: 'absolute', right: 3, top: 2, width: 30, height: 30,
                      borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: chatInput.trim() ? '#6366f1' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: chatInput.trim() ? '#fff' : '#6b7280',
                      transition: 'all 0.15s ease',
                    }}>
                    {isEditing
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
                  </button>
                </div>

                {/* Footer links */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid #1e1e2a' }}>
                  <button onClick={() => setShowLogs(!showLogs)}
                    style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Terminal className="w-3 h-3" /> {showLogs ? 'Hide logs' : 'Logs'}
                  </button>
                  {task?.pull_request_link && (
                    <a href={task.pull_request_link} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ExternalLink className="w-3 h-3" /> PR
                    </a>
                  )}
                  <Link href="/" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>
                    Build something new
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {showLogs && (
        <div className="absolute inset-0 z-50 flex items-end justify-center pb-6 px-6" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-4xl h-[50vh] overflow-hidden shadow-2xl flex flex-col" style={{ borderRadius: 12, border: '1px solid #1e1e2a' }}>
            <div className="flex items-center justify-between px-4 h-10 flex-shrink-0" style={{ borderBottom: '1px solid #1e1e2a', background: '#13131a' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>Build Logs</span>
              <button onClick={() => setShowLogs(false)}
                style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden"><TerminalConsole taskId={id} /></div>
          </div>
        </div>
      )}
    </div>
  )
}
