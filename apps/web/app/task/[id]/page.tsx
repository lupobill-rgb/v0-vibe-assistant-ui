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

  // Poll for preview_url until the job completes or preview becomes available
  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      while (!cancelled) {
        const task = await fetchJob(id)
        if (!task) break
        if (task.preview_url) {
          const rawUrl = task.preview_url.startsWith('http')
            ? task.preview_url
            : `${API_URL}${task.preview_url}`

          // For [Auto] jobs stored in Supabase storage, route through
          // the API proxy which serves with correct Content-Type headers
          const autoMatch = rawUrl.match(/\/previews\/auto\/([^/]+)\/preview\.html/)
          const resolvedUrl = autoMatch
            ? `${API_URL}/api/preview/auto/${autoMatch[1]}`
            : rawUrl

          setPreviewUrl(resolvedUrl)
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
      <div className="flex-1 flex overflow-hidden h-full">
        {/* Left Panel: Pipeline Tracker */}
        <div className="w-[340px] flex-shrink-0">
          <PipelineTracker taskId={id} />
        </div>

        {/* Right Panel: Preview iframe (once ready) or Terminal Console */}
        <div className="flex-1 min-w-0 flex flex-col">
          {previewUrl ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-4 h-11 border-b border-border flex-shrink-0 bg-background">
                <span className="text-xs font-medium text-muted-foreground">Preview</span>
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Open ↗
                </a>
              </div>
              <iframe
                src={previewUrl}
                sandbox="allow-scripts allow-same-origin"
                className="flex-1 w-full border-0"
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
