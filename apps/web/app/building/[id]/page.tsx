"use client"

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, ChevronUp, ClipboardCopy, ExternalLink, Globe, Loader2, Lock, Pencil, Plus, Terminal, X } from "lucide-react"
import { PipelineTracker } from "@/components/task/pipeline-tracker"
import { TerminalConsole } from "@/components/task/terminal-console"
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase"
import { createJob, publishJob } from "@/lib/api"

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

const EDGE_FN_URL = SUPABASE_URL + '/functions/v1/generate-diff'

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

function AddPageModal({ onSubmit, onClose, isLoading, error }: { onSubmit: (desc: string) => void; onClose: () => void; isLoading: boolean; error: string | null }) {
  const [desc, setDesc] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 border border-slate-700 p-6 shadow-2xl">
        <h3 className="text-sm font-semibold text-white mb-3">Add a new page</h3>
        <input
          autoFocus
          value={desc}
          onChange={(e) => { setDesc(e.target.value) }}
          onKeyDown={(e) => { if (e.key === 'Enter' && desc.trim() && !isLoading) onSubmit(desc.trim()) }}
          placeholder="e.g. A careers page with open positions and an apply form"
          className="w-full h-10 rounded-lg bg-slate-900 border border-slate-600 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
        />
        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onClose} disabled={isLoading}
            className="h-9 px-4 rounded-lg text-sm text-slate-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={() => { if (desc.trim()) onSubmit(desc.trim()) }} disabled={isLoading || !desc.trim()}
            className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center gap-2">
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : 'Generate Page'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface BuildingPageProps { params: Promise<{ id: string }> }

export default function BuildingPage({ params }: BuildingPageProps) {
  const { id } = use(params)
  const [task, setTask] = useState<Task | null>(null)
  const [diff, setDiff] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [activeFile, setActiveFile] = useState('index.html')
  const [showAddPage, setShowAddPage] = useState(false)
  const [addingPage, setAddingPage] = useState(false)
  const [addPageError, setAddPageError] = useState<string | null>(null)
  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null)
  const [editingHtml, setEditingHtml] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [editInput, setEditInput] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [updatePrompt, setUpdatePrompt] = useState('')
  const [updatingJob, setUpdatingJob] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectTeamId, setProjectTeamId] = useState<string | undefined>()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const router = useRouter()
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Helper to track timeouts and auto-clean on unmount
  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms)
    timersRef.current.push(t)
    return t
  }, [])

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

  const guidedNextSteps = useMemo(() => getGuidedNextSteps(task?.user_prompt ?? ''), [task?.user_prompt])
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

  const handleAddPage = useCallback(async (description: string) => {
    setAddingPage(true)
    setAddPageError(null)
    try {
      const url = EDGE_FN_URL
      const body = { prompt: description, model: 'claude', mode: 'html' }

      console.log("[VIBE] Add Page request:", url, body)

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + SUPABASE_ANON_KEY },
        body: JSON.stringify(body),
      })

      const text = await res.text()
      console.log("[VIBE] Add Page response:", res.status, text)

      if (!res.ok) throw new Error("Edge Function returned " + res.status)

      let newPage: PageData | null = null
      try {
        const payload = JSON.parse(text)
        if (payload.html) {
          newPage = { name: description.slice(0, 30), filename: description.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.html', html: payload.html }
        } else if (payload.diff) {
          newPage = { name: description.slice(0, 30), filename: description.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.html', html: payload.diff }
        } else if (Array.isArray(payload) && payload[0]?.html) {
          newPage = payload[0]
        } else if (payload.pages && Array.isArray(payload.pages)) {
          newPage = payload.pages[0]
        }
      } catch {
        if (text.trim().startsWith('<') || text.trim().startsWith('<!')) {
          newPage = { name: description.slice(0, 30), filename: description.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.html', html: text }
        }
      }

      if (!newPage) {
        setAddPageError('No page could be parsed from the response. Check console for details.')
        return
      }

      const merged = [...pages, newPage]
      setDiff(JSON.stringify(merged))
      setActiveFile(newPage.filename)
      setShowAddPage(false)
      setAddPageError(null)
      setSuccessToast('Page added successfully')
      safeTimeout(() => setSuccessToast(null), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[VIBE] Failed to generate page:', message)
      setAddPageError(message)
    } finally {
      setAddingPage(false)
}
  }, [pages, safeTimeout])

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
            <iframe src={previewUrl} sandbox="allow-scripts allow-same-origin"
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
      <div className="w-full md:w-[280px] flex-shrink-0 flex flex-col order-first md:order-none" style={{ background: '#13131a', fontFamily: 'Inter, sans-serif' }}>
        {/* ── MOBILE TOGGLE ── */}
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

        {/* ── HEADER: Name + Status + Back ── */}
        <div className={(sidebarOpen ? "block" : "hidden md:block")} style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1e1e2a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Link href="/" style={{ color: '#6b7280', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </Link>
            <h1 style={{ fontSize: 15, fontWeight: 600, color: '#f0f0ff', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {projectName || 'Untitled App'}
            </h1>
          </div>
          {task?.execution_state === 'failed' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 100, padding: '3px 10px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} /> Failed
            </span>
          ) : isComplete ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 100, padding: '3px 10px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> Ready
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 100, padding: '3px 10px' }}>
              <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#f59e0b' }} /> Building...
            </span>
          )}
        </div>

        {/* ── PROGRESS BAR (while building) ── */}
        {!isComplete && (
          <div className={(sidebarOpen ? "block" : "hidden md:block")} style={{ padding: '12px 20px', borderBottom: '1px solid #1e1e2a' }}>
            <span style={{ fontSize: 13, color: '#f0f0ff', display: 'block', marginBottom: 8 }}>
              {task?.execution_state === 'planning' ? 'Planning...' :
               task?.execution_state === 'security' ? 'Security scan...' :
               task?.execution_state === 'building' ? 'Building...' :
               task?.execution_state === 'validating' ? 'Validating...' :
               task?.execution_state === 'testing' ? 'Testing...' :
               task?.execution_state === 'qa' ? 'Quality check...' :
               task?.execution_state === 'ux' ? 'UX review...' :
               task?.execution_state ? String(task.execution_state).replace(/_/g, ' ') : 'Starting...'}
            </span>
            <div style={{ height: 3, borderRadius: 2, background: '#1e1e2a', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2, background: '#6366f1',
                transition: 'width 0.6s ease',
                width: task?.execution_state === 'planning' ? '15%' :
                       task?.execution_state === 'security' ? '25%' :
                       task?.execution_state === 'building' ? '50%' :
                       task?.execution_state === 'validating' ? '65%' :
                       task?.execution_state === 'testing' ? '75%' :
                       task?.execution_state === 'qa' ? '85%' :
                       task?.execution_state === 'ux' ? '92%' : '8%'
              }} />
            </div>
          </div>
        )}

        {/* ── PRIMARY ACTIONS (when complete) ── */}
        {isComplete && (
          <div className={(sidebarOpen ? "block" : "hidden md:block")} style={{ padding: '16px 20px', borderBottom: '1px solid #1e1e2a' }}>
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
              const shareUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/s/${jobId}`
                : `/s/${jobId}`
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <Check className="w-3.5 h-3.5" style={{ color: '#10b981', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#10b981', fontWeight: 500 }}>Live</span>
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
                onClick={async () => {
                  if (!jobId || publishing) return
                  setPublishing(true)
                  setPublishError(null)
                  try {
                    const result = await publishJob(jobId)
                    if (result.error) {
                      setPublishError(result.error)
                    } else if (result.published_url) {
                      setPublishedUrl(result.published_url)
                    }
                  } catch (err: any) {
                    setPublishError(err.message || 'Publish failed')
                  } finally {
                    setPublishing(false)
                  }
                }}
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
          </div>
        )}

        {/* ── PAGES ── */}
        <div className={"flex-1 overflow-y-auto flex flex-col " + (sidebarOpen ? "" : "hidden md:flex")} style={{ padding: '16px 20px', borderBottom: '1px solid #1e1e2a' }}>
          {successToast && (
            <div style={{ fontSize: 12, color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, padding: '6px 10px', marginBottom: 8 }}>
              {successToast}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pages</span>
            {isComplete && (
              <button
                type="button"
                onClick={() => setShowAddPage(true)}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: '#6366f1', cursor: 'pointer' }}
              >
                + Add page
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {pages.map((p, i) => (
              <div key={p.filename}>
                <button
                  onClick={() => setActiveFile(p.filename)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '7px 10px', borderRadius: 6,
                    background: activeFile === p.filename ? 'rgba(99,102,241,0.08)' : 'transparent',
                    border: 'none', cursor: 'pointer', transition: 'background 0.15s ease'
                  }}
                >
                  <span style={{
                    fontSize: 13, fontWeight: activeFile === p.filename ? 500 : 400,
                    color: activeFile === p.filename ? '#f0f0ff' : '#6b7280',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{p.name}</span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      if (editingPageIndex === i) { setEditingPageIndex(null) }
                      else { setEditingPageIndex(i); setEditingHtml(p.html) }
                    }}
                    style={{ flexShrink: 0, marginLeft: 8, color: '#6b7280', cursor: 'pointer', opacity: activeFile === p.filename ? 0.7 : 0 }}
                    title={`Edit ${p.name}`}
                  >
                    <Pencil className="w-3 h-3" />
                  </span>
                </button>
                {editingPageIndex === i && (
                  <div style={{ marginTop: 4, borderRadius: 8, border: '1px solid #1e1e2a', overflow: 'hidden' }}>
                    <textarea
                      value={editingHtml}
                      onChange={(e) => setEditingHtml(e.target.value)}
                      spellCheck={false}
                      style={{
                        width: '100%', height: 192, background: '#0d0d12', color: '#c0c0d0',
                        fontSize: 12, fontFamily: 'monospace', padding: 12, border: 'none',
                        resize: 'vertical', outline: 'none'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '8px 12px', background: '#13131a', borderTop: '1px solid #1e1e2a' }}>
                      <button
                        onClick={() => setEditingPageIndex(null)}
                        style={{ background: 'none', border: 'none', fontSize: 12, color: '#6b7280', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const updated = pages.map((pg, idx) => idx === i ? { ...pg, html: editingHtml } : pg)
                          setDiff(JSON.stringify(updated))
                          setEditingPageIndex(null)
                        }}
                        style={{
                          background: '#6366f1', border: 'none', borderRadius: 6,
                          padding: '4px 12px', fontSize: 12, fontWeight: 500, color: '#fff', cursor: 'pointer'
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── CHAT INPUT ── */}
        <div className={(sidebarOpen ? "block" : "hidden md:block")} style={{ padding: '16px 20px' }}>
          <div style={{ position: 'relative' }}>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && editPrompt.trim() && !isEditing) {
                  e.preventDefault()
                  const p = editPrompt.trim(); setEditPrompt(''); handleEdit(p)
                }
              }}
              placeholder="Ask VIBE to change something..."
              disabled={!isComplete || isEditing}
              rows={2}
              style={{
                width: '100%', borderRadius: 8, resize: 'none',
                background: '#0d0d12', border: '1px solid #1e1e2a',
                padding: '10px 40px 10px 12px', fontSize: 13, color: '#f0f0ff',
                outline: 'none', lineHeight: 1.5,
                opacity: (!isComplete || isEditing) ? 0.4 : 1,
                transition: 'border-color 0.15s ease'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#6366f1' }}
              onBlur={(e) => { e.target.style.borderColor = '#1e1e2a' }}
            />
            <button
              onClick={() => { if (editPrompt.trim() && !isEditing) { const p = editPrompt.trim(); setEditPrompt(''); handleEdit(p) } }}
              disabled={!editPrompt.trim() || !isComplete || isEditing}
              style={{
                position: 'absolute', right: 6, bottom: 6, width: 30, height: 30,
                borderRadius: 6, background: editPrompt.trim() ? '#6366f1' : 'transparent',
                border: 'none', cursor: editPrompt.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: editPrompt.trim() ? '#fff' : '#6b7280', transition: 'all 0.15s ease'
              }}
            >
              {isEditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
            </button>
          </div>
          {editError && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '6px 10px' }}>
              <span>{editError}</span>
              <button onClick={() => setEditError(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: 8 }}>
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {task?.execution_state === 'completed' && task?.project_id && (
            <div style={{ marginTop: 8 }}>
              <div style={{ position: 'relative' }}>
                <input
                  value={updatePrompt}
                  onChange={(e) => setUpdatePrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && updatePrompt.trim() && !updatingJob) handleUpdate() }}
                  placeholder="Start a full rebuild..."
                  disabled={updatingJob}
                  style={{
                    width: '100%', height: 38, borderRadius: 8,
                    background: '#0d0d12', border: '1px solid #1e1e2a',
                    padding: '0 36px 0 12px', fontSize: 13, color: '#f0f0ff',
                    outline: 'none', opacity: updatingJob ? 0.4 : 1,
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#6366f1' }}
                  onBlur={(e) => { e.target.style.borderColor = '#1e1e2a' }}
                />
                <button
                  onClick={handleUpdate}
                  disabled={!updatePrompt.trim() || updatingJob}
                  style={{
                    position: 'absolute', right: 4, top: 4, width: 30, height: 30,
                    borderRadius: 6, background: updatePrompt.trim() ? '#6366f1' : 'transparent',
                    border: 'none', cursor: updatePrompt.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: updatePrompt.trim() ? '#fff' : '#6b7280', transition: 'all 0.15s ease'
                  }}
                >
                  {updatingJob ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2.5 16A10 10 0 0 1 21.5 8M21.5 8A10 10 0 0 1 2.5 16"/></svg>}
                </button>
              </div>
            </div>
          )}
          {/* Footer links */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid #1e1e2a' }}>
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
      {showAddPage && <AddPageModal onSubmit={handleAddPage} onClose={() => { setShowAddPage(false); setAddPageError(null) }} isLoading={addingPage} error={addPageError} />}
    </div>
  )
}
