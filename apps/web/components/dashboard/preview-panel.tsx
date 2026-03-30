"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GeneratedPage } from "@/lib/api"

interface PreviewPanelProps {
  pages: GeneratedPage[]
}

export function PreviewPanel({ pages }: PreviewPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const showTabs = pages.length > 1

  // Build the processed HTML string — used for both srcdoc and the blob link
  const processedHtml = useMemo(() => {
    const raw = pages[activeIndex]?.html ?? ""

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ptaqytvztkhjpuawdxng.supabase.co"
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

    // Replace __SUPABASE_URL__ / __SUPABASE_ANON_KEY__ placeholders that the
    // LLM injects in <head>.  This mirrors injectSupabaseCredentials() in the
    // API (apps/api/src/index.ts) so previews resolve to real Supabase URLs
    // instead of the literal placeholder strings.
    let html = raw
      .replace(/__SUPABASE_URL__/g, supabaseUrl)
      .replace(/__SUPABASE_ANON_KEY__/g, supabaseAnonKey)

    // Also inject credentials script for HTML that doesn't use placeholders
    const credentialsScript = `<script>
window.__VIBE_SUPABASE_URL__ = window.__VIBE_SUPABASE_URL__ || ${JSON.stringify(supabaseUrl)};
window.__VIBE_SUPABASE_ANON_KEY__ = window.__VIBE_SUPABASE_ANON_KEY__ || ${JSON.stringify(supabaseAnonKey)};
</script>`

    if (html.toLowerCase().includes("<head>")) {
      html = html.replace(/(<head[^>]*>)/i, `$1\n${credentialsScript}`)
    } else if (html.toLowerCase().includes("<html")) {
      html = html.replace(/(<html[^>]*>)/i, `$1\n${credentialsScript}`)
    } else {
      html = credentialsScript + "\n" + html
    }

    return html
  }, [pages, activeIndex])

  // Blob URL kept only for the "Open in new tab" link
  const blobUrl = useMemo(() => {
    if (!processedHtml) return ""
    const blob = new Blob([processedHtml], { type: "text/html" })
    return URL.createObjectURL(blob)
  }, [processedHtml])

  // Revoke stale blob URLs to avoid memory leaks
  const prevBlobUrl = useRef("")
  useEffect(() => {
    if (prevBlobUrl.current && prevBlobUrl.current !== blobUrl) {
      URL.revokeObjectURL(prevBlobUrl.current)
    }
    prevBlobUrl.current = blobUrl
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [blobUrl])

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

      {/* Preview iframe — srcdoc avoids blob URL race conditions where
         scripts wouldn't execute on first load */}
      <iframe
        key={activeIndex}
        srcDoc={processedHtml}
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        className="w-full border-0"
        style={{ height: 500 }}
        title={`Preview: ${pages[activeIndex]?.name}`}
      />
    </div>
  )
}
