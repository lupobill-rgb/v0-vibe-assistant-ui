"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ExternalLink,
  Terminal,
  Copy,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Plus,
  GitPullRequest,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getJob, type Job } from "@/lib/api"
import { Button } from "@/components/ui/button"

type LogEntry = {
  id: string
  timestamp: string
  type: "info" | "success" | "warning" | "error" | "command" | "output"
  message: string
}

function parseLog(raw: string, index: number): LogEntry {
  const now = new Date()
  const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`

  let type: LogEntry["type"] = "output"
  if (raw.startsWith("$") || raw.startsWith(">")) type = "command"
  else if (raw.toLowerCase().includes("error") || raw.toLowerCase().includes("fail")) type = "error"
  else if (raw.toLowerCase().includes("warn")) type = "warning"
  else if (raw.toLowerCase().includes("success") || raw.toLowerCase().includes("created") || raw.toLowerCase().includes("done") || raw.toLowerCase().includes("complete")) type = "success"
  else if (raw.toLowerCase().includes("install") || raw.toLowerCase().includes("build") || raw.toLowerCase().includes("generat") || raw.toLowerCase().includes("start") || raw.toLowerCase().includes("running")) type = "info"

  return { id: `log-${index}`, timestamp: ts, type, message: raw }
}

const typeColors: Record<LogEntry["type"], string> = {
  info: "text-[oklch(0.65_0.2_260)]",
  success: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
  command: "text-accent",
  output: "text-muted-foreground",
}

const typeLabels: Record<LogEntry["type"], string> = {
  info: "INFO",
  success: "DONE",
  warning: "WARN",
  error: "ERR!",
  command: "RUN ",
  output: "    ",
}

function StatusBadge({ status }: { status: Job["status"] }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Completed
        </span>
      )
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 text-xs font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          Failed
        </span>
      )
    case "running":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[oklch(0.65_0.2_260)]/15 text-[oklch(0.65_0.2_260)] text-xs font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Running
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground text-xs font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Pending
        </span>
      )
  }
}

export default function BuildingPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string

  const [job, setJob] = useState<Job | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showLogs, setShowLogs] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const pollJob = useCallback(async () => {
    try {
      const data = await getJob(taskId)
      setJob(data)

      if (data.logs && data.logs.length > 0) {
        setLogs(data.logs.map((l, i) => parseLog(l, i)))
      }

      // Stop polling when completed or failed
      if (data.status === "completed" || data.status === "failed") {
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch job status")
    }
  }, [taskId])

  useEffect(() => {
    // Initial fetch
    pollJob()

    // Start polling every 2 seconds
    pollingRef.current = setInterval(pollJob, 2000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [pollJob])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] ${typeLabels[l.type]} ${l.message}`).join("\n")
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isComplete = job?.status === "completed"
  const isFailed = job?.status === "failed"
  const isRunning = job?.status === "running" || job?.status === "pending"

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Panel: Preview iframe (2/3) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Preview Header */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-border flex-shrink-0 bg-card">
          <Link
            href="/"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-px h-5 bg-border" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">
                Preview
              </span>
              <StatusBadge status={job?.status || "pending"} />
            </div>
          </div>
          {job?.preview_url && (
            <a
              href={job.preview_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in new tab
            </a>
          )}
        </div>

        {/* Preview area */}
        <div className="flex-1 relative">
          {job?.preview_url ? (
            <iframe
              src={job.preview_url}
              className="absolute inset-0 w-full h-full border-0"
              title="Live preview"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              {isRunning && (
                <>
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-foreground mb-1">Building your landing page...</h3>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      {job?.execution_state || "Your page will appear here once the build preview is ready."}
                    </p>
                  </div>
                </>
              )}
              {isComplete && !job?.preview_url && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-1">Build Complete</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Your landing page has been generated successfully.
                  </p>
                  {job?.pull_request_link && (
                    <a
                      href={job.pull_request_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <GitPullRequest className="w-4 h-4" />
                      View Pull Request
                    </a>
                  )}
                </div>
              )}
              {isFailed && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-1">Build Failed</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Something went wrong. Check the logs for details.
                  </p>
                </div>
              )}
              {error && (
                <div className="px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground text-xs max-w-md text-center">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Status + Logs (1/3) */}
      <div className="w-[420px] flex-shrink-0 flex flex-col border-l border-border bg-card">
        {/* Status Card */}
        <div className="px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-card-foreground">Build Status</h2>
            <StatusBadge status={job?.status || "pending"} />
          </div>

          {/* Execution State */}
          {job?.execution_state && (
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              {job.execution_state}
            </p>
          )}

          {/* Progress indicator */}
          {isRunning && (
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-primary animate-pulse" style={{ width: "60%" }} />
            </div>
          )}
          {isComplete && (
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: "100%" }} />
            </div>
          )}

          {/* Task ID */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">
              Task: {taskId.slice(0, 12)}...
            </span>
          </div>
        </div>

        {/* Action buttons when done */}
        {(isComplete || isFailed) && (
          <div className="px-5 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
            {job?.pull_request_link && (
              <a
                href={job.pull_request_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button className="w-full gap-2 bg-primary text-primary-foreground hover:opacity-90">
                  <GitPullRequest className="w-3.5 h-3.5" />
                  View PR
                </Button>
              </a>
            )}
            <Link href="/" className="flex-1">
              <Button variant="secondary" className="w-full gap-2">
                <Plus className="w-3.5 h-3.5" />
                Build Another
              </Button>
            </Link>
          </div>
        )}

        {/* Logs Toggle */}
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center justify-between px-5 py-3 border-b border-border text-sm font-medium text-card-foreground hover:bg-secondary/50 transition-colors flex-shrink-0"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            <span>Build Logs</span>
            {logs.length > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                {logs.length} lines
              </span>
            )}
          </div>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showLogs && "rotate-180")} />
        </button>

        {/* Log Content */}
        {showLogs && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Log header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                {isRunning && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopy}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="Copy logs"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Log lines */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-6 bg-[oklch(0.12_0.005_285)]"
            >
              {logs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                  {isRunning ? "Waiting for logs..." : "No logs available"}
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex gap-3 hover:bg-foreground/[0.02]">
                    <span className="text-muted-foreground/40 select-none flex-shrink-0 w-16 text-right">
                      {log.timestamp}
                    </span>
                    <span className={cn("font-bold flex-shrink-0 w-10", typeColors[log.type])}>
                      {typeLabels[log.type]}
                    </span>
                    <span
                      className={cn(
                        "break-all min-w-0",
                        log.type === "command"
                          ? "text-foreground font-semibold"
                          : log.type === "output"
                          ? "text-muted-foreground"
                          : typeColors[log.type]
                      )}
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}

              {/* Blinking cursor when running */}
              {isRunning && logs.length > 0 && (
                <div className="flex gap-3 mt-1">
                  <span className="text-muted-foreground/40 select-none flex-shrink-0 w-16" />
                  <span className="font-bold flex-shrink-0 w-10 text-accent">{"    "}</span>
                  <span className="text-foreground animate-pulse">|</span>
                </div>
              )}
            </div>

            {/* Log footer */}
            <div className="flex items-center justify-between px-4 h-8 border-t border-border text-[10px] font-mono text-muted-foreground flex-shrink-0 bg-[oklch(0.12_0.005_285)]">
              <span>{logs.length} lines</span>
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={cn(
                  "flex items-center gap-1 hover:text-foreground transition-colors",
                  autoScroll && "text-primary"
                )}
              >
                <ChevronDown className="w-3 h-3" />
                Auto-scroll {autoScroll ? "on" : "off"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
