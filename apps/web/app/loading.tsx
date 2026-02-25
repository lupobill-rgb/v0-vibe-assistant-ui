import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="w-[240px] border-r border-sidebar-border bg-sidebar flex-shrink-0 flex flex-col">
        <div className="h-16 border-b border-sidebar-border px-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary animate-pulse" />
          <div className="h-4 w-16 rounded bg-secondary animate-pulse" />
        </div>
        <div className="p-3 space-y-2">
          <div className="h-9 rounded-lg bg-secondary animate-pulse" />
          <div className="h-9 rounded-lg bg-secondary/60 animate-pulse" />
        </div>
        <div className="flex-1 px-3 py-2 space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-secondary/40 animate-pulse" />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      </main>
    </div>
  )
}
