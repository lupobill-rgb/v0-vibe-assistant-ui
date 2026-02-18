import { useState, useRef, useEffect } from 'react'
import { Terminal, Copy, Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useJobLogs } from '../../hooks/useJobLogs'

const typeColors: Record<string, string> = {
  info: 'text-[#4F8EFF]',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
}

const typeLabels: Record<string, string> = {
  info: 'INFO',
  success: 'DONE',
  warning: 'WARN',
  error: 'ERR!',
}

function formatTime(timestamp: number): string {
  // Handle both millisecond and second timestamps
  const ms = timestamp > 1e10 ? timestamp : timestamp * 1000
  return new Date(ms).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

interface Props {
  taskId: string
}

export function TerminalConsole({ taskId }: Props) {
  const { logs, isComplete, taskStatus } = useJobLogs(taskId)
  const [copied, setCopied] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const handleCopy = () => {
    const text = logs
      .map((l) => `[${formatTime(l.event_time)}] ${l.severity.toUpperCase()} ${l.event_message}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-[oklch(0.10_0.005_285)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Build Output</span>
          <div className="flex items-center gap-1 ml-2">
            {isComplete ? (
              <span className="text-[10px] text-muted-foreground font-mono capitalize">
                {taskStatus || 'complete'}
              </span>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
              </>
            )}
          </div>
        </div>
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

      {/* Log content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-6"
        onScroll={(e) => {
          const el = e.currentTarget
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
          if (!atBottom && autoScroll) setAutoScroll(false)
        }}
      >
        {logs.length === 0 && !isComplete && (
          <div className="text-muted-foreground/50">Waiting for logs…</div>
        )}

        {logs.map((log) => (
          <div key={log.event_id} className="flex gap-3 hover:bg-white/[0.02] rounded">
            <span className="text-muted-foreground/40 select-none flex-shrink-0 w-16 text-right">
              {formatTime(log.event_time)}
            </span>
            <span
              className={cn(
                'font-bold flex-shrink-0 w-10',
                typeColors[log.severity] ?? 'text-muted-foreground'
              )}
            >
              {typeLabels[log.severity] ?? '    '}
            </span>
            <span
              className={cn(
                'break-all min-w-0',
                typeColors[log.severity] ?? 'text-muted-foreground'
              )}
            >
              {log.event_message}
            </span>
          </div>
        ))}

        {/* Blinking cursor while running */}
        {!isComplete && logs.length > 0 && (
          <div className="flex gap-3 mt-1">
            <span className="text-muted-foreground/40 select-none flex-shrink-0 w-16 text-right" />
            <span className="font-bold flex-shrink-0 w-10 text-[#A855F7]">RUN </span>
            <span className="text-foreground">
              $ <span className="animate-pulse">|</span>
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 h-9 border-t border-border text-[10px] font-mono text-muted-foreground flex-shrink-0">
        <div className="flex items-center gap-3">
          <span>{logs.length} lines</span>
          <span>|</span>
          <span>UTF-8</span>
        </div>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={cn(
            'flex items-center gap-1 hover:text-foreground transition-colors',
            autoScroll && 'text-[#4F8EFF]'
          )}
        >
          <ChevronDown className="w-3 h-3" />
          Auto-scroll {autoScroll ? 'on' : 'off'}
        </button>
      </div>
    </div>
  )
}
