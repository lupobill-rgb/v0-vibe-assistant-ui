"use client"

import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export type StepStatus = "done" | "active" | "pending" | "error"

export interface PipelineStep {
  id: string
  label: string
  description: string
  status: StepStatus
  duration?: string
}

const mockSteps: PipelineStep[] = [
  {
    id: "1",
    label: "Understanding Requirements",
    description: "Parsing your prompt and extracting features",
    status: "done",
    duration: "2s",
  },
  {
    id: "2",
    label: "Planning Architecture",
    description: "Designing database schema and API routes",
    status: "done",
    duration: "4s",
  },
  {
    id: "3",
    label: "Generating Code",
    description: "Writing components, pages, and server logic",
    status: "done",
    duration: "12s",
  },
  {
    id: "4",
    label: "Installing Dependencies",
    description: "Adding packages from npm registry",
    status: "active",
    duration: "8s",
  },
  {
    id: "5",
    label: "Running Build",
    description: "Compiling TypeScript and bundling assets",
    status: "pending",
  },
  {
    id: "6",
    label: "Deploying",
    description: "Pushing to Vercel edge network",
    status: "pending",
  },
]

function StatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />
    case "active":
      return <Loader2 className="w-5 h-5 text-[#4F8EFF] animate-spin" />
    case "error":
      return <AlertCircle className="w-5 h-5 text-red-400" />
    default:
      return <Circle className="w-5 h-5 text-muted-foreground/40" />
  }
}

export function PipelineTracker() {
  const completedCount = mockSteps.filter((s) => s.status === "done").length
  const totalCount = mockSteps.length
  const progress = (completedCount / totalCount) * 100

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-border flex-shrink-0">
        <Link
          href="/"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-card-foreground truncate">
            E-commerce Platform
          </h2>
          <p className="text-[10px] text-muted-foreground">Build in progress</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-5 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-foreground">Progress</span>
          <span className="text-xs text-muted-foreground font-mono">
            {completedCount}/{totalCount} steps
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Pipeline Steps */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-0">
          {mockSteps.map((step, index) => (
            <div key={step.id} className="flex gap-3">
              {/* Vertical line and icon */}
              <div className="flex flex-col items-center">
                <StatusIcon status={step.status} />
                {index < mockSteps.length - 1 && (
                  <div
                    className={cn(
                      "w-px flex-1 my-1 min-h-[24px]",
                      step.status === "done"
                        ? "bg-emerald-400/40"
                        : "bg-border"
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className="pb-5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      step.status === "done"
                        ? "text-foreground"
                        : step.status === "active"
                        ? "text-[#4F8EFF]"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                  {step.duration && (
                    <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      {step.duration}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-5 py-3 border-t border-border flex items-center gap-2 flex-shrink-0">
        <button className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <ExternalLink className="w-3.5 h-3.5" />
          View Preview
        </button>
      </div>
    </div>
  )
}
