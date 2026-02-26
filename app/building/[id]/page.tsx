"use client"

import { use, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ExternalLink, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchJob, getLogsSSEUrl, type Task, type LogEvent } from "@/lib/api"
import {
  PipelineTracker,
  type StageInfo,
  type StageStatus,
} from "@/components/building/pipeline-tracker"

const API_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:3001"

// ── Stage definitions ────────────────────────────────────────────────────────

const STAGE_IDS = [
  "queued",
  "planning",
  "building",
  "validating",
  "testing",
  "complete",
] as const

type StageId = (typeof STAGE_IDS)[number]

const STAGE_LABELS: Record<StageId, string> = {
  queued: "Queued",
  planning: "Planning",
  building: "Building",
  validating: "Validating",
  testing: "Testing",
  complete: "Complete",
}

/** Map backend execution_state to our pipeline stage ID. */
function mapExecutionState(state: string): StageId | null {
  switch (state) {
    case "queued":
      return "queued"
    case "running":
      return "planning"
    case "validating":
      return "validating"
    case "preflight":
      return "testing"
    case "pr":
    case "completed":
      return "complete"
    default:
      return null
  }
}

/** Heuristic: detect pipeline stage from log message text. */
function detectStageFromMessage(msg: string): StageId | null {
  const lower = msg.toLowerCase()
  if (/preflight|lint\b|typecheck|running tests|smoke/i.test(lower)) return "testing"
  if (/validat|sanitiz|applying diff|pre-apply/i.test(lower)) return "validating"
  if (/generating|llm|openai|diff generation|calling.*model/i.test(lower))
    return "building"
  if (/context|scanning|building context|ripgrep/i.test(lower)) return "planning"
  if (/pull request|creating pr|pr created/i.test(lower)) return "complete"
  return null
}

function buildInitialStages(): StageInfo[] {
  return STAGE_IDS.map((id) => ({
    id,
    label: STAGE_LABELS[id],
    status: id === "queued" ? ("active" as StageStatus) : ("pending" as StageStatus),
    startedAt: id === "queued" ? Date.now() : undefined,
  }))
}

// ── Severity display helpers ─────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  info: "text-[#4F8EFF]",
  success: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
}

const SEV_LABEL: Record<string, string> = {
  info: "INFO",
  success: "DONE",
  warning: "WARN",
  error: "ERR!",
}

// ── Component ────────────────────────────────────────────────────────────────

interface BuildingPageProps {
  params: Promise<{ id: string }>
}

export default function BuildingPage({ params }: BuildingPageProps) {
  const { id } = use(params)
  const [task, setTask] = useState<Task | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEvent[]>([])
  const [stages, setStages] = useState<StageInfo[]>(buildInitialStages)
  const [isJobComplete, setIsJobComplete] = useState(false)
  const [jobFinalState, setJobFinalState] = useState("")
  const [sseError, setSseError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Stage transition helpers ─────────────────────────────────────────────

  const advanceToStage = useCallback((targetId: string, timestamp?: number) => {
    const ts = timestamp ?? Date.now()
    const targetIdx = STAGE_IDS.indexOf(targetId as StageId)
    if (targetIdx === -1) return

    setStages((prev) => {
      const currentMax = prev.reduce(
        (max, s, i) => (s.status === "complete" || s.status === "active" ? Math.max(max, i) : max),
        -1
      )
      if (targetIdx <= currentMax) return prev

      return prev.map((stage, i) => {
        if (i < targetIdx) {
          return {
            ...stage,
            status: "complete" as StageStatus,
            startedAt: stage.startedAt ?? ts,
            completedAt: stage.completedAt ?? ts,
          }
        }
        if (i === targetIdx) {
          return {
            ...stage,
            status: "active" as StageStatus,
            startedAt: stage.startedAt ?? ts,
          }
        }
        return stage
      })
    })
  }, [])

  const completeAll = useCallback((timestamp?: number) => {
    const ts = timestamp ?? Date.now()
    setStages((prev) =>
      prev.map((stage) => ({
        ...stage,
        status: "complete" as StageStatus,
        startedAt: stage.startedAt ?? ts,
        completedAt: stage.completedAt ?? ts,
      }))
    )
  }, [])

  const failCurrent = useCallback((timestamp?: number) => {
    const ts = timestamp ?? Date.now()
    setStages((prev) =>
      prev.map((stage) =>
        stage.status === "active"
          ? { ...stage, status: "failed" as StageStatus, completedAt: ts }
          : stage
      )
    )
  }, [])

  // ── SSE connection for logs + stage detection ────────────────────────────

  useEffect(() => {
    const eventSource = new EventSource(getLogsSSEUrl(id))

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // Check for explicit status field (top-level or nested in log wrapper)
        const status: string | undefined = data.status ?? data.log?.status
        if (status) {
          if (status === "failed") {
            failCurrent()
          } else if (status === "complete" || status === "completed") {
            completeAll()
          } else {
            advanceToStage(status)
          }
        }

        // Handle SSE completion signal
        if (data.type === "complete") {
          if (data.state === "completed") {
            completeAll()
          } else {
            failCurrent()
          }
          setJobFinalState(data.state)
          setIsJobComplete(true)
          eventSource.close()
          return
        }

        // Process log entry (unwrap NestJS { log: ... } wrapper if present)
        const logEntry: LogEvent = data.log ?? data
        if (logEntry.event_message) {
          setLogs((prev) => [...prev, logEntry])

          // Heuristic stage detection from message content (only if no explicit status)
          if (!status) {
            const detected = detectStageFromMessage(logEntry.event_message)
            if (detected) advanceToStage(detected)
          }
        }
      } catch (err) {
        console.error("SSE parse error:", err)
      }
    }

    eventSource.onerror = () => {
      setSseError("Connection to log stream lost")
      eventSource.close()
    }

    return () => eventSource.close()
  }, [id, advanceToStage, completeAll, failCurrent])

  // ── Poll for task metadata (preview_url, PR link, execution_state fallback) ─

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      while (!cancelled) {
        const t = await fetchJob(id)
        if (!t) break
        setTask(t)

        if (t.preview_url) {
          setPreviewUrl(
            t.preview_url.startsWith("http") ? t.preview_url : `${API_URL}${t.preview_url}`
          )
        }

        // Fallback stage detection from execution_state
        const mapped = mapExecutionState(t.execution_state)
        if (mapped) advanceToStage(mapped)

        if (t.execution_state === "completed") {
          completeAll()
          break
        }
        if (t.execution_state === "failed") {
          failCurrent()
          break
        }

        await new Promise((r) => setTimeout(r, 2000))
      }
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [id, advanceToStage, completeAll, failCurrent])

  // ── Timer for elapsed display ────────────────────────────────────────────

  useEffect(() => {
    if (isJobComplete) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [isJobComplete])

  // ── Auto-scroll logs ─────────────────────────────────────────────────────

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  // ── Derived values ───────────────────────────────────────────────────────

  const isComplete =
    task?.execution_state === "completed" || task?.execution_state === "failed"

  const firstStart = stages.find((s) => s.startedAt)?.startedAt
  const lastComplete = isJobComplete
    ? [...stages].reverse().find((s) => s.completedAt)?.completedAt
    : undefined
  const totalElapsed = firstStart ? (lastComplete ?? now) - firstStart : 0

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
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

      {/* Right Panel: Pipeline Tracker + Logs */}
      <div className="w-[380px] flex-shrink-0 flex flex-col bg-slate-900">
        {/* Pipeline Tracker */}
        <div className="border-b border-slate-700 flex-shrink-0">
          <PipelineTracker stages={stages} totalElapsed={totalElapsed} now={now} />
        </div>

        {/* Inline Log Terminal */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Log header */}
          <div className="flex items-center gap-2 px-4 h-10 border-b border-slate-700/50 flex-shrink-0">
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-400">Build Logs</span>
            <div className="flex items-center gap-1 ml-auto">
              {!isJobComplete ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#A855F7] animate-pulse" />
                  <span className="text-[10px] font-mono text-[#A855F7]">LIVE</span>
                </>
              ) : (
                <span
                  className={cn(
                    "text-[10px] font-mono",
                    jobFinalState === "completed" ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {jobFinalState === "completed" ? "DONE" : "FAIL"}
                </span>
              )}
            </div>
          </div>

          {/* Log content */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-5 bg-[oklch(0.12_0.005_285)]"
          >
            {sseError && (
              <div className="flex gap-2 text-red-400">
                <span className="text-slate-600 select-none w-14 text-right flex-shrink-0">
                  --:--:--
                </span>
                <span className="font-bold w-8 flex-shrink-0">ERR!</span>
                <span>{sseError}</span>
              </div>
            )}

            {logs.length === 0 && !sseError && (
              <div className="flex gap-2 text-slate-500">
                <span className="text-slate-600 select-none w-14 text-right flex-shrink-0">
                  --:--:--
                </span>
                <span className="font-bold w-8 flex-shrink-0 text-[#4F8EFF]">INFO</span>
                <span>Connecting to log stream&hellip;</span>
              </div>
            )}

            {logs.map((log) => {
              const ts = new Date(log.event_time).toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
              return (
                <div key={log.event_id} className="flex gap-2 hover:bg-white/[0.02]">
                  <span className="text-slate-600 select-none w-14 text-right flex-shrink-0">
                    {ts}
                  </span>
                  <span
                    className={cn(
                      "font-bold w-8 flex-shrink-0",
                      SEV_COLOR[log.severity] ?? "text-slate-400"
                    )}
                  >
                    {SEV_LABEL[log.severity] ?? "LOG"}
                  </span>
                  <span
                    className={cn(
                      "break-all min-w-0",
                      SEV_COLOR[log.severity] ?? "text-slate-300"
                    )}
                  >
                    {log.event_message}
                  </span>
                </div>
              )
            })}

            {/* Completion / running indicator */}
            {isJobComplete ? (
              <div className="flex gap-2 mt-2 border-t border-slate-800 pt-2">
                <span className="text-slate-600 select-none w-14 text-right flex-shrink-0">
                  &mdash;&mdash;&mdash;
                </span>
                <span
                  className={cn(
                    "font-bold w-8 flex-shrink-0",
                    jobFinalState === "completed" ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {jobFinalState === "completed" ? "DONE" : "FAIL"}
                </span>
                <span
                  className={
                    jobFinalState === "completed" ? "text-emerald-400" : "text-red-400"
                  }
                >
                  Job {jobFinalState}
                </span>
              </div>
            ) : (
              <div className="flex gap-2 mt-1">
                <span className="w-14 flex-shrink-0" />
                <span className="font-bold w-8 flex-shrink-0 text-[#A855F7]">RUN </span>
                <span className="text-slate-300">
                  $ <span className="animate-pulse">|</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons when complete */}
        {isComplete && (
          <div className="px-4 py-3 border-t border-slate-700 flex flex-col gap-2">
            {task?.pull_request_link && (
              <a
                href={task.pull_request_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 h-9 rounded-lg bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white text-sm font-medium hover:opacity-90 transition-opacity"
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
    </div>
  )
}
