"use client"

import { AppShell } from "@/components/app-shell"
import { PromptCard } from "@/components/dashboard/prompt-card"

export default function ChatPage() {
  return (
    <AppShell>
      <div className="min-h-screen">
        <div className="px-6 pt-8 pb-4">
          <h1 className="text-2xl font-semibold text-foreground">Chat</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a project and describe what you want to build
          </p>
        </div>
        <PromptCard />
      </div>
    </AppShell>
  )
}
