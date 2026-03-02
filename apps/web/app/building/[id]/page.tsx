"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { ExternalLink, Terminal, X } from "lucide-react"
import { fetchJob, type Task } from "@/lib/api"
import { PipelineTracker } from "@/components/task/pipeline-tracker"
import { TerminalConsole } from "@/components/task/terminal-console"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ptaqytvztkhjpuawdxng.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YXF5dHZ6dGtoanB1YXdkeG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDAwNjYsImV4cCI6MjA4NzUxNjA2Nn0.V9lzpPsCZX3X9rdTTa0cTz6Al47wDeMNiVC7WXbTfq4'
)

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

interface BuildingPageProps { params: Promise<{ id: string }> }

export default function BuildingPage({ params }: BuildingPageProps) {
  const { id } = use(params)
  const [task, setTask] = useState<Task | null>(null)
  const [diff, setDiff] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [activeFile, setActiveFile] = useState('index.html')

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      while (!cancelled) {
        const t = await fetchJob(id)
        if (!t) break
        setTask(t)
        if (t.execution_state === "completed" || t.execution_state === "failed") break
        await new Promise((r) => setTimeout(r, 2000))
      }
    }
    poll()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (task?.execution_state !== "completed") return
    supabase.from("jobs").select("last_diff").eq("id", id).single().then(({ data }) => {
      if (data?.last_diff) setDiff(data.last_diff)
    })
  }, [task?.execution_state, id])

  useEffect(() => {
    const channel = supabase.channel("build-" + id)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs", filter: "id=eq." + id },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          if (row.execution_state) setTask((prev) => prev ? { ...prev, execution_state: row.execution_state as string } : prev)
          if (row.last_diff) setDiff(row.last_diff as string)
        }
      ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  // Listen for navigation messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.vibeNavigate) setActiveFile(e.data.vibeNavigate)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const pages = useMemo(() => diff ? parseDiff(diff) : [], [diff])
  const previewUrl = useMemo(() => {
    if (pages.length === 0) return null
    return buildBlobUrl(pages, activeFile)
  }, [pages, activeFile])

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  const isComplete = task?.execution_state === "completed" || task?.execution_state === "failed"
  const isMultiPage = pages.length > 1

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
        <div className="flex-1 overflow-hidden"><PipelineTracker taskId={id} /></div>
        <div className="px-4 py-3 border-t border-slate-700">
          <button onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-2 w-full h-8 px-3 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-all">
            <Terminal className="w-3.5 h-3.5" /> {showLogs ? "Hide Logs" : "Show Logs"}
          </button>
        </div>
        {isComplete && (
          <div className="px-4 pb-4 flex flex-col gap-2">
            <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
              4-page starter built; add pages anytime.
            </div>
            <button
              type="button"
              className="flex items-center justify-center h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
            >
              Add Page
            </button>
            {task?.pull_request_link && (
              <a href={task.pull_request_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 h-9 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> View PR
              </a>
            )}
            <Link href="/" className="flex items-center justify-center h-9 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-colors">
              Build Another
            </Link>
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
    </div>
  )
}
