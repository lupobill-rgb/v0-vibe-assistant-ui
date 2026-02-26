"use client"

import { cn } from "@/lib/utils"
import {
  Clock,
  Lightbulb,
  Hammer,
  CheckCircle2,
  FlaskConical,
  Rocket,
  XCircle,
} from "lucide-react"
import type { ComponentType } from "react"

export type StageStatus = "pending" | "active" | "complete" | "failed"

export interface StageInfo {
  id: string
  label: string
  status: StageStatus
  startedAt?: number
  completedAt?: number
}

const STAGE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  queued: Clock,
  planning: Lightbulb,
  building: Hammer,
  validating: CheckCircle2,
  testing: FlaskConical,
  complete: Rocket,
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return "<1s"
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rem = seconds % 60
  return `${minutes}m ${rem}s`
}

interface PipelineTrackerProps {
  stages: StageInfo[]
  totalElapsed: number
  now: number
}

export function PipelineTracker({ stages, totalElapsed, now }: PipelineTrackerProps) {
  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
          Pipeline
        </span>
        {totalElapsed > 0 && (
          <span className="text-[10px] font-mono text-slate-500">
            {formatElapsed(totalElapsed)}
          </span>
        )}
      </div>

      {/* Horizontal step indicator */}
      <div className="flex items-start">
        {stages.map((stage, index) => {
          const Icon = STAGE_ICONS[stage.id] ?? Clock
          const isLast = index === stages.length - 1

          // Compute per-stage elapsed time
          const elapsed = stage.startedAt
            ? (stage.completedAt ?? (stage.status === "active" ? now : undefined))
              ? ((stage.completedAt ?? now) - stage.startedAt)
              : undefined
            : undefined

          return (
            <div key={stage.id} className="flex-1 flex flex-col items-center relative">
              {/* Connector line to next stage */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute h-[2px] rounded-full transition-colors duration-500",
                    stage.status === "complete"
                      ? "bg-emerald-500/50"
                      : stage.status === "failed"
                        ? "bg-red-500/50"
                        : "bg-slate-700/60"
                  )}
                  style={{
                    top: "13px",
                    left: "calc(50% + 14px)",
                    right: "calc(-50% + 14px)",
                  }}
                />
              )}

              {/* Icon circle */}
              <div
                className={cn(
                  "relative z-10 w-7 h-7 rounded-full flex items-center justify-center border-[1.5px] transition-all duration-300",
                  stage.status === "complete" &&
                    "bg-emerald-500/15 border-emerald-500 text-emerald-400",
                  stage.status === "active" &&
                    "bg-[#A855F7]/15 border-[#A855F7] text-[#A855F7]",
                  stage.status === "failed" &&
                    "bg-red-500/15 border-red-500 text-red-400",
                  stage.status === "pending" &&
                    "bg-slate-800/80 border-slate-600/50 text-slate-500"
                )}
              >
                {/* Pulse ring for active stage */}
                {stage.status === "active" && (
                  <span className="absolute inset-0 rounded-full border border-[#A855F7]/40 animate-ping" />
                )}

                {stage.status === "complete" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : stage.status === "failed" ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[10px] font-medium mt-1.5 text-center leading-tight",
                  stage.status === "complete" && "text-emerald-400",
                  stage.status === "active" && "text-[#A855F7]",
                  stage.status === "failed" && "text-red-400",
                  stage.status === "pending" && "text-slate-500"
                )}
              >
                {stage.label}
              </span>

              {/* Elapsed time / timestamp */}
              {stage.status === "complete" && elapsed != null ? (
                <span className="text-[9px] font-mono text-slate-600 mt-0.5">
                  {formatElapsed(elapsed)}
                </span>
              ) : stage.status === "active" && elapsed != null ? (
                <span className="text-[9px] font-mono text-[#A855F7]/50 mt-0.5 animate-pulse">
                  {formatElapsed(elapsed)}
                </span>
              ) : stage.status === "failed" ? (
                <span className="text-[9px] font-mono text-red-500/60 mt-0.5">
                  failed
                </span>
              ) : (
                <span className="text-[9px] mt-0.5">&nbsp;</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
