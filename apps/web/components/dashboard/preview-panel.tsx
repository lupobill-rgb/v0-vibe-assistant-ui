"use client"

import { useState, useMemo } from "react"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GeneratedPage } from "@/lib/api"

interface PreviewPanelProps {
  pages: GeneratedPage[]
}

export function PreviewPanel({ pages }: PreviewPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const showTabs = pages.length > 1

  const blobUrl = useMemo(() => {
    const raw = pages[activeIndex]?.html ?? ""

    // Inject Supabase credentials so vibeLoadData() works inside the iframe
    const credentialsScript = `<script>
window.__VIBE_SUPABASE_URL__ = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ptaqytvztkhjpuawdxng.supabase.co")};
window.__VIBE_SUPABASE_ANON_KEY__ = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "")};
</script>`

    // Insert before any other scripts — right after <head> or at the top
    let html: string
    if (raw.toLowerCase().includes("<head>")) {
      html = raw.replace(/(<head[^>]*>)/i, `$1\n${credentialsScript}`)
    } else if (raw.toLowerCase().includes("<html")) {
      html = raw.replace(/(<html[^>]*>)/i, `$1\n${credentialsScript}`)
    } else {
      html = credentialsScript + "\n" + raw
    }

    const blob = new Blob([html], { type: "text/html" })
    return URL.createObjectURL(blob)
  }, [pages, activeIndex])

  if (pages.length === 0) return null

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
      {/* Tab bar — hidden when only one page */}
      {showTabs && (
        <div className="flex items-center gap-1 px-4 h-10 border-b border-border bg-secondary/40">
          {pages.map((page, i) => (
            <button
              key={page.name}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                i === activeIndex
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {page.name}
            </button>
          ))}
          <a
            href={blobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Open
          </a>
        </div>
      )}

      {/* Preview iframe */}
      <iframe
        src={blobUrl}
        sandbox="allow-scripts"
        className="w-full border-0"
        style={{ height: 500 }}
        title={`Preview: ${pages[activeIndex]?.name}`}
      />
    </div>
  )
}
