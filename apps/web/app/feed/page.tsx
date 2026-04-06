"use client"

import { Rss } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { FeedSubscribeCard } from "@/components/feed/feed-subscribe-card"

export default function FeedPage() {
  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900 border border-border p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
              <Rss className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Data Feed</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Subscribe to data published by other teams
              </p>
            </div>
          </div>
        </div>

        <FeedSubscribeCard />
      </div>
    </AppShell>
  )
}
