"use client"

import { use, useEffect, useState, useCallback } from "react"
import { AppShell } from "@/components/app-shell"
import { PipelineTracker } from "@/components/task/pipeline-tracker"
import { TerminalConsole } from "@/components/task/terminal-console"
import { PreviewPanel } from "@/components/task/preview-panel"
import { fetchJob } from "@/lib/api"

interface TaskPageProps {
  params: Promise<{ id: string }>
}

export default function TaskPage({ params }: TaskPageProps) {
  const { id } = use(params)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewDismissed, setPreviewDismissed] = useState(false)

  const pollPreviewUrl = useCallback(() => {
    fetchJob(id).then((job) => {
      if (job?.preview_url) {
        setPreviewUrl(job.preview_url)
      }
    })
  }, [id])

  useEffect(() => {
    pollPreviewUrl()
    const interval = setInterval(pollPreviewUrl, 3000)
    return () => clearInterval(interval)
  }, [pollPreviewUrl])

  return (
    <AppShell>
      <div className="flex-1 flex overflow-hidden h-full">
        {/* Left Panel: Pipeline Tracker */}
        <div className="w-[340px] flex-shrink-0">
          <PipelineTracker taskId={id} />
        </div>

        {/* Right Panel: Terminal + Preview */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <TerminalConsole taskId={id} />
          </div>
          {previewUrl && !previewDismissed && (
            <PreviewPanel
              url={previewUrl}
              onClose={() => setPreviewDismissed(true)}
            />
          )}
        </div>
      </div>
    </AppShell>
  )
}
