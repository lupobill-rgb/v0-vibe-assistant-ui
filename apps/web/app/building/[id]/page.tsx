"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ExternalLink, Terminal, X } from "lucide-react"
import { fetchJob, type Task } from "@/lib/api"
import { PipelineTracker } from "@/components/task/pipeline-tracker"
import { TerminalConsole } from "@/components/task/terminal-console"

const API_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:3001"

interface BuildingPageProps {
  params: Promise<{ id: string }>
}

export default function BuildingPage({ params }: BuildingPageProps) {
  const { id } = use(params)
  const [task, setTask] = useState<Task | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(false)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      while (!cancelled) {
        const t = await fetchJob(id)
        if (!t) break
        setTask(t)
        if (t.preview_url) {
          setPreviewUrl(`${API_URL}${t.preview_url}`)
        }
        if (t.execution_state === "completed" || t.execution_state === "failed") break
        await new Promise((r) => setTimeout(r, 2000))
      }
    }

    poll()
    return () => { cancelled = true }
  }, [id])

  const isComplete =
    task?.execution_state === "completed" || task?.execution_state === "failed"

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 relative">
      {/* Left Panel (2/3): Iframe Preview */}
      <div className="flex-[2] flex flex-col min-w-0 border-r border-slate-700">
        {previewUrl ? (
          <>
            <div className="flex items-center gap-2 px-4 h-11 border-b border-slate-700 flex-shrink-0 bg-slate-800">
              <span className="text-xs font-medium text-slate-400">Preview</span>
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Open
              </a>
            </div>
            <iframe
              src={previewUrl}
              sandbox="allow-scripts allow-same-origin"
              className="flex-1 w-full border-0"
              title="Generated website preview"
            />
          </>
        ) : isComplete ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-slate-400 font-medium">
                {task?.execution_state === "failed" ? "Build failed" : "Build complete"}
              </p>
              <p className="text-slate-500 text-sm mt-1">No preview available for this job</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-slate-300 font-medium">Building your page...</p>
              <p className="text-slate-500 text-sm mt-1">Preview will appear here when ready</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel (1/3): Status + Actions */}
      <div className="w-[340px] flex-shrink-0 flex flex-col bg-slate-900">
        {/* Pipeline Tracker fills available space */}
        <div className="flex-1 overflow-hidden">
          <PipelineTracker taskId={id} />
        </div>

        {/* Show Logs toggle */}
        <div className="px-4 py-3 border-t border-slate-700">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-2 w-full h-8 px-3 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-all"
          >
            <Terminal className="w-3.5 h-3.5" />
            {showLogs ? "Hide Logs" : "Show Logs"}
          </button>
        </div>

        {/* Action buttons when done */}
        {isComplete && (
          <div className="px-4 pb-4 flex flex-col gap-2">
            {task?.pull_request_link && (
              <a
                href={task.pull_request_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 h-9 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View PR
              </a>
            )}
            <Link
              href="/"
              className="flex items-center justify-center h-9 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-colors"
            >
              Build Another
            </Link>
          </div>
        )}
      </div>

      {/* Logs overlay */}
      {showLogs && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-end justify-center pb-6 px-6">
          <div className="w-full max-w-4xl h-[50vh] rounded-2xl border border-slate-700 overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-10 border-b border-slate-700 flex-shrink-0 bg-slate-800">
              <span className="text-xs font-medium text-slate-400">Build Logs</span>
              <button
                onClick={() => setShowLogs(false)}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TerminalConsole taskId={id} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
