"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { PipelineTracker } from "@/components/task/pipeline-tracker"
import { TerminalConsole } from "@/components/task/terminal-console"

export default function TaskPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Pipeline Tracker */}
        <div className="w-[340px] flex-shrink-0">
          <PipelineTracker />
        </div>

        {/* Right Panel: Terminal Console */}
        <div className="flex-1 min-w-0">
          <TerminalConsole />
        </div>
      </div>
    </div>
  )
}
