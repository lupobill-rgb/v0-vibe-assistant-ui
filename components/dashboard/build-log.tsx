"use client"

import { useState, useEffect, useRef } from "react"
import {
  CheckCircle2,
  Loader2,
  XCircle,
  Circle,
  FileCode2,
  Clock,
  Send,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type BuildStepStatus = "pending" | "active" | "done" | "failed"

export interface BuildStep {
  id: string
  label: string
  status: BuildStepStatus
  files?: string[]
  timestamp?: string
}

interface BuildLogProps {
  steps: BuildStep[]
  className?: string
  onFollowUp?: (message: string) => void
  isRefining?: boolean
}

function StepIcon({ status }: { status: BuildStepStatus }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
    case "active":
      return <Loader2 className="w-4.5 h-4.5 text-primary animate-spin" />
    case "failed":
      return <XCircle className="w-4.5 h-4.5 text-red-400" />
    default:
      return <Circle className="w-4.5 h-4.5 text-muted-foreground/30" />
  }
}

export function BuildLog({ steps, className, onFollowUp, isRefining = false }: BuildLogProps) {
  const [followUpText, setFollowUpText] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [steps])

  const doneCount = steps.filter((s) => s.status === "done").length
  const totalCount = steps.length
  const isComplete = totalCount > 0 && doneCount === totalCount
  const hasFailed = steps.some((s) => s.status === "failed")

  return (
    <div className={cn("flex flex-col h-full bg-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-12 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              hasFailed
                ? "bg-red-400"
                : isComplete
                  ? "bg-emerald-400"
                  : "bg-primary animate-pulse",
            )}
          />
          <span className="text-sm font-semibold text-card-foreground">
            {hasFailed
              ? "Build Failed"
              : isComplete
                ? "Build Complete"
                : "Building..."}
          </span>
        </div>
        {totalCount > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground">
            {doneCount}/{totalCount}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-5 py-3 border-b border-border flex-shrink-0">
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              hasFailed
                ? "bg-red-400"
                : isComplete
                  ? "bg-emerald-400"
                  : "bg-primary",
            )}
            style={{
              width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : "0%",
            }}
          />
        </div>
      </div>

      {/* Steps timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-0">
          {steps.map((step, index) => (
            <div key={step.id} className="flex gap-3">
              {/* Vertical connector line + icon */}
              <div className="flex flex-col items-center">
                <StepIcon status={step.status} />
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-px flex-1 my-1 min-h-[16px]",
                      step.status === "done"
                        ? "bg-emerald-400/30"
                        : "bg-border",
                    )}
                  />
                )}
              </div>

              {/* Step content */}
              <div className="pb-4 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium leading-tight",
                      step.status === "done"
                        ? "text-foreground"
                        : step.status === "active"
                          ? "text-primary"
                          : step.status === "failed"
                            ? "text-red-400"
                            : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                  {step.timestamp && (
                    <span className="flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground/60">
                      <Clock className="w-2.5 h-2.5" />
                      {step.timestamp}
                    </span>
                  )}
                </div>

                {/* File names being created */}
                {step.files && step.files.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1.5">
                    {step.files.map((file) => (
                      <div
                        key={file}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <FileCode2 className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                        <span className="font-mono truncate">{file}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {steps.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mb-2" />
            <span className="text-xs">Initializing build...</span>
          </div>
        )}
      </div>

      {/* Follow-up input (appears after build completes) */}
      {isComplete && onFollowUp && (
        <div className="px-4 py-3 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && followUpText.trim() && !isRefining) {
                  e.preventDefault()
                  onFollowUp(followUpText.trim())
                  setFollowUpText("")
                }
              }}
              placeholder={isRefining ? "Refining..." : "Ask a follow-up..."}
              disabled={isRefining}
              className="flex-1 h-9 px-3 rounded-lg bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors disabled:opacity-50"
            />
            <button
              onClick={() => {
                if (followUpText.trim() && !isRefining) {
                  onFollowUp(followUpText.trim())
                  setFollowUpText("")
                }
              }}
              disabled={!followUpText.trim() || isRefining}
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
                followUpText.trim() && !isRefining
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {isRefining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
