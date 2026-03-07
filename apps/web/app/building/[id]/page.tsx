"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ExternalLink, Loader2, Pencil, Plus, Terminal, X } from "lucide-react"
import { PipelineTracker } from "@/components/task/pipeline-tracker"
import { TerminalConsole } from "@/components/task/terminal-console"
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase"
import { createJob } from "@/lib/api"

interface Task { task_id: string; execution_state: string; pull_request_link?: string; preview_url?: string; last_diff?: string; user_prompt?: string; job_timeline?: any[]; agent_results?: any[]; project_id?: string; [key: string]: unknown }

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
  if (!html.trim()) return []
  return [{ name: 'Preview', filename: 'index.html', html }]
}

function buildBlobUrl(pages: PageData[], activeFile: string): string | null {
  const page = pages.find((p) => p.filename === activeFile) || pages[0]
  if (!page) return null
  // Inject router script to handle #filename.html navigation
  const routerScript = pages.length > 1 ? '<script>' +
    'window.addEventListener("hashchange",function(){' +
    'var f=location.hash.slice(1);if(f)window.parent.postMessage({vibeNavigate:f},"*");' +
    '});' +
    'document.addEventListener("click",function(e){' +
    'var a=e.target.closest("a");if(!a)return;var h=a.getAttribute("href");' +
    'if(h&&h.startsWith("#")&&h.endsWith(".html")){' +
    'e.preventDefault();window.parent.postMessage({vibeNavigate:h.slice(1)},"*");' +
    '}});' +
    '</script>' : ''
  const html = page.html.replace('</body>', routerScript + '</body>')
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
  const [updatePrompt, setUpdatePrompt] = useState('')
  const [updatingJob, setUpdatingJob] = useState(false)
  const router = useRouter()


  useEffect(() => {
    let cancelled = false

    async function resolveJobId(): Promise<string | null> {
      // Always treat id as a project_id, get latest job
      const { data: latest } = await supabase
        .from('jobs')
        .select('id')
        .eq('project_id', id)
        .order('initiated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return latest?.id ?? null
    }

    const poll = async () => {
      const resolvedId = await resolveJobId()
      if (!resolvedId || cancelled) return
      setJobId(resolvedId)
      while (!cancelled) {
        const { data } = await supabase
          .from('jobs')
          .select('execution_state, last_diff, project_id')
          .eq('id', resolvedId)
          .maybeSingle()
        if (data) {
          setTask(prev => ({ ...(prev ?? {}), task_id: id, ...data } as Task))
          if (data.last_diff) setDiff(data.last_diff)
          if (data.execution_state === 'completed' ||
              data.execution_state === 'failed') break
        }
        await new Promise(r => setTimeout(r, 2000))
      }
    }
    poll()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    const channel = supabase.channel("build-" + id)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs", filter: "id=eq." + id },
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
    const handler = (e: MessageEvent) => {
      if (e.data?.vibeNavigate) setActiveFile(e.data.vibeNavigate)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const pages = useMemo(() => {
    const raw = diff || (typeof task?.last_diff === 'string' ? task.last_diff : null)
    return raw ? parseDiff(raw) : []
  }, [diff, task?.last_diff])
  const previewUrl = useMemo(() => {
    if (pages.length === 0) return null
    const url = buildBlobUrl(pages, activeFile)
    console.log('[preview url]', url)
    return url
  }, [pages, activeFile])

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  const isComplete = task?.execution_state === "completed" || task?.execution_state === "failed"
  const isMultiPage = pages.length > 1

  const handleAddPage = useCallback(async (description: string) => {
    setAddingPage(true)
    setAddPageError(null)
    try {
      const url = EDGE_FN_URL
      const body = { prompt: description, model: 'claude-sonnet-4-20250514', mode: 'single' }

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
      setTimeout(() => setSuccessToast(null), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[VIBE] Failed to generate page:', message)
      setAddPageError(message)
    } finally {
      setAddingPage(false)
}
  }, [pages])

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
    <div className="flex h-screen overflow-hidden bg-slate-900 relative">
      <div className="flex-[2] flex flex-col min-w-0 border-r border-slate-700">
        {isMultiPage && (
          <div className="flex items-center gap-1 px-3 h-10 border-b border-slate-700 bg-slate-800 overflow-x-auto">
            {pages.map((p) => (
              <button key={p.filename} onClick={() => setActiveFile(p.filename)}
                className={"px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap " +
                  (activeFile === p.filename
                    ? "bg-violet-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-700")}>
                {p.name}
              </button>
            ))}
          </div>
        )}
        {previewUrl ? (
          <>
            <div className="flex items-center gap-2 px-4 h-11 border-b border-slate-700 flex-shrink-0 bg-slate-800">
              <span className="text-xs font-medium text-slate-400">Preview</span>
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              {isMultiPage && <span className="text-xs text-slate-500">{activeFile}</span>}
              <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                className="ml-auto text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Open
              </a>
            </div>
            <iframe src={previewUrl} sandbox="allow-scripts allow-same-origin"
              className="flex-1 w-full border-0 bg-white" title="Generated website preview" />
          </>
        ) : isComplete ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-slate-400 font-medium">{task?.execution_state === "failed" ? "Build failed" : "Build complete"}</p>
            <p className="text-slate-500 text-sm">No preview available</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
            <p className="text-slate-300 font-medium">Building your page...</p>
            <p className="text-slate-500 text-sm">Preview will appear here when ready</p>
          </div>
        )}
      </div>
      <div className="w-[340px] flex-shrink-0 flex flex-col bg-slate-900">
        {/* ── PROGRESS SECTION ── */}
        <div className="flex-shrink-0 border-b border-slate-700">
          <PipelineTracker taskId={id} task={task as any} />
          {isComplete && (
            <div className="px-4 pb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Build complete
              </span>
            </div>
          )}
        </div>

        {/* ── PAGE MANAGEMENT SECTION ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {successToast && (
            <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 animate-pulse">
              {successToast}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Pages</span>
            <button
              type="button"
              disabled={!isComplete}
              onClick={() => setShowAddPage(true)}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> {isComplete ? 'Add Page' : 'Building...'}
            </button>
          </div>
          {pages.map((p, i) => (
            <div key={p.filename}>
              <div className="flex items-center justify-between rounded-lg bg-slate-800 border border-slate-700 px-3 py-2">
                <button
                  onClick={() => setActiveFile(p.filename)}
                  className={"text-xs font-medium truncate " + (activeFile === p.filename ? "text-violet-400" : "text-slate-300")}
                >
                  {p.name}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editingPageIndex === i) {
                      setEditingPageIndex(null)
                    } else {
                      setEditingPageIndex(i)
                      setEditingHtml(p.html)
                    }
                  }}
                  className="ml-2 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  title={`Edit ${p.name}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              {editingPageIndex === i && (
                <div className="mt-1 rounded-lg border border-slate-700 overflow-hidden">
                  <textarea
                    value={editingHtml}
                    onChange={(e) => setEditingHtml(e.target.value)}
                    spellCheck={false}
                    className="w-full h-48 bg-slate-950 text-slate-200 text-xs font-mono p-3 resize-y focus:outline-none focus:ring-1 focus:ring-violet-500 border-0"
                  />
                  <div className="flex items-center justify-end gap-2 px-3 py-2 bg-slate-900 border-t border-slate-700">
                    <button
                      onClick={() => setEditingPageIndex(null)}
                      className="h-7 px-3 rounded text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const updated = pages.map((pg, idx) => idx === i ? { ...pg, html: editingHtml } : pg)
                        setDiff(JSON.stringify(updated))
                        setEditingPageIndex(null)
                      }}
                      className="h-7 px-3 rounded bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── ACTIONS SECTION ── */}
        <div className="px-4 py-3 border-t border-slate-700 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => console.log('[VIBE] Push Live clicked')}
            disabled={!isComplete}
            className="flex items-center justify-center gap-2 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            Push Live
          </button>
          {task?.pull_request_link && (
            <a href={task.pull_request_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 h-9 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> View PR
            </a>
          )}
          <button onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-2 w-full h-8 px-3 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-all">
            <Terminal className="w-3.5 h-3.5" /> {showLogs ? "Hide Logs" : "Show Logs"}
          </button>
          <Link href="/" className="flex items-center justify-center h-9 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-colors">
            Build Another
          </Link>
        </div>
        <div className="px-4 py-3 border-t border-slate-700">
          <label className="text-xs font-medium text-slate-400 mb-2 block">Edit current page</label>
          <div className="flex gap-2">
            <input
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && editPrompt.trim()) { console.log("[VIBE] Edit request:", editPrompt, "for page:", activeFile); setEditPrompt(""); } }}
              placeholder="e.g. Make the hero section taller"
              disabled={!isComplete}
              className="flex-1 h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
            />
            <button
              onClick={() => { if (editPrompt.trim()) { console.log("[VIBE] Edit request:", editPrompt, "for page:", activeFile); setEditPrompt(""); } }}
              disabled={!editPrompt.trim() || !isComplete}
              className="h-9 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors">
              Apply
            </button>
          </div>
        </div>
        {task?.execution_state === 'completed' && task?.project_id && (
          <div className="px-4 py-3 border-t border-slate-700">
            <label className="text-xs font-medium text-slate-400 mb-2 block">Iterate on this build</label>
            <div className="flex gap-2">
              <input
                value={updatePrompt}
                onChange={(e) => setUpdatePrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && updatePrompt.trim() && !updatingJob) handleUpdate() }}
                placeholder="Describe what to change..."
                disabled={updatingJob}
                className="flex-1 h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
              />
              <button
                onClick={handleUpdate}
                disabled={!updatePrompt.trim() || updatingJob}
                className="h-9 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                {updatingJob ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Update
              </button>
            </div>
          </div>
        )}
      </div>
      {showLogs && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-end justify-center pb-6 px-6">
          <div className="w-full max-w-4xl h-[50vh] rounded-2xl border border-slate-700 overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-10 border-b border-slate-700 flex-shrink-0 bg-slate-800">
              <span className="text-xs font-medium text-slate-400">Build Logs</span>
              <button onClick={() => setShowLogs(false)}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
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
