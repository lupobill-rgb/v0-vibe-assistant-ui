"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function BuildingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[VIBE] Building page error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">
          Build preview crashed
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Something went wrong while loading the build. This is usually temporary.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset}
            className="h-9 px-4 rounded-lg border border-slate-700 bg-slate-800 text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link href="/"
            className="h-9 px-4 rounded-lg bg-gradient-to-r from-[#00E5A0] to-[#7B61FF] text-white text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-90">
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
