"use client"

import { use, useEffect, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { AppSidebar } from "@/components/app-sidebar"
import { PipelineTracker } from "@/components/task/pipeline-tracker"
import { TerminalConsole } from "@/components/task/terminal-console"
import { fetchJob } from "@/lib/api"

const API_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "https://vibeapi-production-fdd1.up.railway.app"

interface TaskPageProps {
  params: Promise<{ id: string }>
}

export default function TaskPage({ params }: TaskPageProps) {
  const { id } = use(params)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)

  // Fetch HTML client-side and inject as srcdoc to bypass CSP / Content-Type issues
  useEffect(() => {
    if (!previewUrl) return
    fetch(previewUrl)
      .then(r => r.text())
      .then(html => setPreviewHtml(html))
      .catch(() => setPreviewHtml(null))
  }, [previewUrl])

  // Poll for preview_url until the job completes or preview becomes available
  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      while (!cancelled) {
        const task = await fetchJob(id)
        if (!task) break
        if (task.preview_url) {
          setPreviewUrl(
            task.preview_url.startsWith('http')
              ? task.preview_url
              : `${API_URL}${task.preview_url}`
          )
          break
        }
        if (task.execution_state === "failed") break
        await new Promise((r) => setTimeout(r, 2000))
      }
    }

    poll()
    return () => { cancelled = true }
  }, [id])

  return (
    <AppShell>
      <div className="flex-1 flex overflow-hidden h-full" style={{ background: '#0A0E17' }}>
        {/* Left Panel: Pipeline Tracker */}
        <div
          className="w-[300px] flex-shrink-0"
          style={{ background: '#0F1420', borderRight: '1px solid #1a2030' }}
        >
          <PipelineTracker taskId={id} />
        </div>

        {/* Right Panel: Preview iframe or Terminal Console */}
        <div className="flex-1 min-w-0 flex flex-col">
          {previewHtml ? (
            <div className="flex flex-col h-full">
              {/* Preview bar */}
              <div
                className="flex items-center gap-3 px-4 h-11 flex-shrink-0"
                style={{ background: '#0F1420', borderBottom: '1px solid #1a2030' }}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: '#475569', fontFamily: 'Syne, system-ui' }}
                >
                  Preview
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                {previewUrl && (
                  <span
                    className="text-xs font-mono px-2.5 py-0.5 rounded-full truncate max-w-[260px]"
                    style={{ background: '#1a2030', color: '#94a3b8' }}
                  >
                    {previewUrl.replace(/^https?:\/\//, '').slice(0, 40)}
                  </span>
                )}
                <a
                  href={previewUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs font-medium px-3 py-1 rounded-md transition-opacity hover:opacity-80"
                  style={{ color: '#00B4D8', border: '1px solid rgba(0,180,216,0.2)' }}
                >
                  Open ↗
                </a>
              </div>
              <iframe
                srcDoc={previewHtml ?? ''}
                sandbox="allow-scripts"
                className="flex-1 w-full border-0"
                style={{ background: '#0A0E17' }}
                title="Generated website preview"
              />
            </div>
          ) : (
            <TerminalConsole taskId={id} />
          )}
        </div>
      </div>
    </AppShell>
  )
}
