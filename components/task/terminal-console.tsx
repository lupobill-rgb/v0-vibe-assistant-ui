"use client"

import { useState, useRef, useEffect } from "react"
import {
  Terminal,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface LogEntry {
  id: string
  timestamp: string
  type: "info" | "success" | "warning" | "error" | "command" | "output"
  message: string
}

const mockLogs: LogEntry[] = [
  {
    id: "1",
    timestamp: "10:24:01",
    type: "command",
    message: "$ vibe init e-commerce-platform",
  },
  {
    id: "2",
    timestamp: "10:24:01",
    type: "info",
    message: "Initializing project structure...",
  },
  {
    id: "3",
    timestamp: "10:24:02",
    type: "success",
    message: "Created /app/page.tsx",
  },
  {
    id: "4",
    timestamp: "10:24:02",
    type: "success",
    message: "Created /app/layout.tsx",
  },
  {
    id: "5",
    timestamp: "10:24:03",
    type: "success",
    message: "Created /app/api/products/route.ts",
  },
  {
    id: "6",
    timestamp: "10:24:03",
    type: "success",
    message: "Created /app/api/checkout/route.ts",
  },
  {
    id: "7",
    timestamp: "10:24:04",
    type: "info",
    message: "Setting up database schema with Prisma...",
  },
  {
    id: "8",
    timestamp: "10:24:05",
    type: "success",
    message: "Generated schema: User, Product, Order, CartItem",
  },
  {
    id: "9",
    timestamp: "10:24:06",
    type: "info",
    message: "Configuring Stripe integration...",
  },
  {
    id: "10",
    timestamp: "10:24:07",
    type: "success",
    message: "Stripe webhook endpoint configured at /api/webhooks/stripe",
  },
  {
    id: "11",
    timestamp: "10:24:08",
    type: "command",
    message: "$ pnpm install",
  },
  {
    id: "12",
    timestamp: "10:24:08",
    type: "output",
    message: "Packages: +187 new",
  },
  {
    id: "13",
    timestamp: "10:24:12",
    type: "output",
    message: "Progress: resolved 231, reused 189, downloaded 42, added 187",
  },
  {
    id: "14",
    timestamp: "10:24:15",
    type: "info",
    message: "Installing @stripe/stripe-js, next-auth, prisma...",
  },
  {
    id: "15",
    timestamp: "10:24:18",
    type: "success",
    message: "Dependencies installed successfully",
  },
  {
    id: "16",
    timestamp: "10:24:19",
    type: "command",
    message: "$ pnpm prisma generate",
  },
  {
    id: "17",
    timestamp: "10:24:20",
    type: "success",
    message: "Prisma Client generated successfully",
  },
  {
    id: "18",
    timestamp: "10:24:21",
    type: "command",
    message: "$ pnpm prisma db push",
  },
  {
    id: "19",
    timestamp: "10:24:23",
    type: "success",
    message: "Database schema synced. 4 models created.",
  },
  {
    id: "20",
    timestamp: "10:24:24",
    type: "info",
    message: "Generating UI components with shadcn/ui...",
  },
  {
    id: "21",
    timestamp: "10:24:26",
    type: "success",
    message: "Created 12 components: Button, Card, Dialog, Input, Badge...",
  },
  {
    id: "22",
    timestamp: "10:24:27",
    type: "warning",
    message: "Note: Image optimization requires NEXT_PUBLIC_CDN_URL to be set",
  },
  {
    id: "23",
    timestamp: "10:24:28",
    type: "command",
    message: "$ pnpm build",
  },
  {
    id: "24",
    timestamp: "10:24:29",
    type: "output",
    message: "Creating an optimized production build...",
  },
  {
    id: "25",
    timestamp: "10:24:35",
    type: "output",
    message: "Compiled successfully in 6.2s",
  },
  {
    id: "26",
    timestamp: "10:24:35",
    type: "info",
    message: 'Route (app)                              Size     First Load JS',
  },
  {
    id: "27",
    timestamp: "10:24:35",
    type: "output",
    message: "/                                        5.2 kB         89 kB",
  },
  {
    id: "28",
    timestamp: "10:24:35",
    type: "output",
    message: "/products/[id]                           3.8 kB         87 kB",
  },
  {
    id: "29",
    timestamp: "10:24:35",
    type: "output",
    message: "/checkout                                4.1 kB         88 kB",
  },
  {
    id: "30",
    timestamp: "10:24:36",
    type: "success",
    message: "Build completed. Ready for deployment.",
  },
]

const typeColors: Record<LogEntry["type"], string> = {
  info: "text-[#4F8EFF]",
  success: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
  command: "text-[#A855F7]",
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

export function TerminalConsole() {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [autoScroll])

  const handleCopy = () => {
    const text = mockLogs.map((l) => `[${l.timestamp}] ${l.message}`).join("\n")
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-[oklch(0.12_0.005_285)]">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Build Output
          </span>
          <div className="flex items-center gap-1 ml-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
          </div>
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
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={expanded ? "Minimize" : "Maximize"}
          >
            {expanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Log Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-6"
      >
        {mockLogs.map((log) => (
          <div key={log.id} className="flex gap-3 hover:bg-white/[0.02]">
            <span className="text-muted-foreground/40 select-none flex-shrink-0 w-16 text-right">
              {log.timestamp}
            </span>
            <span
              className={cn(
                "font-bold flex-shrink-0 w-10",
                typeColors[log.type]
              )}
            >
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
        ))}

        {/* Blinking cursor */}
        <div className="flex gap-3 mt-1">
          <span className="text-muted-foreground/40 select-none flex-shrink-0 w-16 text-right">
            10:24:37
          </span>
          <span className="font-bold flex-shrink-0 w-10 text-[#A855F7]">
            {"RUN "}
          </span>
          <span className="text-foreground">
            $ <span className="animate-pulse">|</span>
          </span>
        </div>
      </div>

      {/* Terminal Footer */}
      <div className="flex items-center justify-between px-4 h-9 border-t border-border text-[10px] font-mono text-muted-foreground flex-shrink-0">
        <div className="flex items-center gap-3">
          <span>{mockLogs.length} lines</span>
          <span>|</span>
          <span>UTF-8</span>
        </div>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={cn(
            "flex items-center gap-1 hover:text-foreground transition-colors",
            autoScroll && "text-[#4F8EFF]"
          )}
        >
          <ChevronDown className="w-3 h-3" />
          Auto-scroll {autoScroll ? "on" : "off"}
        </button>
      </div>
    </div>
  )
}
