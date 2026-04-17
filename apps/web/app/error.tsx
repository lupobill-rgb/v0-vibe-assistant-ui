"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, RefreshCw, Home, Copy, Check } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

/**
 * Root error boundary — shows the actual error details inline
 * so we can diagnose crashes without needing to open devtools.
 *
 * Follows React docs guidance: error boundaries should provide
 * enough information to debug, not hide the problem.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    console.error("[App Error Boundary]", error)
  }, [error])

  const errorDetails = [
    `Message: ${error.message}`,
    error.digest ? `Digest: ${error.digest}` : "",
    error.stack ? `\nStack:\n${error.stack}` : "",
  ].filter(Boolean).join("\n")

  const copyDetails = () => {
    navigator.clipboard.writeText(errorDetails)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred."}
          </p>
        </div>

        {/* Error details — always visible, no need to expand */}
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Error Details</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyDetails}
              className="h-6 text-xs gap-1"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="text-xs text-foreground/80 font-mono whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
            {errorDetails}
          </pre>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={reset} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button asChild className="gap-2 bg-gradient-to-r from-[#00E5A0] to-[#7B61FF] text-white border-0">
            <Link href="/">
              <Home className="w-4 h-4" />
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
