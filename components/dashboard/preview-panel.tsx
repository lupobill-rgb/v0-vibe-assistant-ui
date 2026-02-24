"use client"

import { useState, useCallback } from "react"
import {
  Download,
  RotateCcw,
  ExternalLink,
  Monitor,
  Tablet,
  Smartphone,
  Send,
  Loader2,
  History,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Viewport = "desktop" | "tablet" | "mobile"

const viewportConfig: Record<Viewport, { width: string; icon: typeof Monitor; label: string }> = {
  desktop: { width: "100%", icon: Monitor, label: "Desktop" },
  tablet: { width: "768px", icon: Tablet, label: "Tablet" },
  mobile: { width: "375px", icon: Smartphone, label: "Mobile" },
}

interface PreviewPanelProps {
  html: string
  onReset: () => void
  onRegenerate?: () => void
  onRefine?: (refinement: string) => void
  isRefining?: boolean
  refinementHistory?: string[]
}

export function PreviewPanel({
  html,
  onReset,
  onRegenerate,
  onRefine,
  isRefining = false,
  refinementHistory = [],
}: PreviewPanelProps) {
  const [viewport, setViewport] = useState<Viewport>("desktop")
  const [refinement, setRefinement] = useState("")

  const blobUrl = useCallback(() => {
    const blob = new Blob([html], { type: "text/html" })
    return URL.createObjectURL(blob)
  }, [html])

  const handleDownload = () => {
    const url = blobUrl()
    const a = document.createElement("a")
    a.href = url
    a.download = "generated-site.html"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleOpenTab = () => {
    const url = blobUrl()
    window.open(url, "_blank")
  }

  const handleRefineSubmit = () => {
    if (refinement.trim() && onRefine && !isRefining) {
      onRefine(refinement.trim())
      setRefinement("")
    }
  }

  const handleRefineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleRefineSubmit()
    }
  }

  const currentViewport = viewportConfig[viewport]

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Panel header with viewport toggles */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-border flex-shrink-0">
        <span className="text-sm font-semibold text-card-foreground">
          Live Preview
        </span>

        {/* Viewport toggles */}
        <div className="flex items-center gap-0.5 bg-secondary/60 rounded-lg p-0.5">
          {(Object.keys(viewportConfig) as Viewport[]).map((vp) => {
            const config = viewportConfig[vp]
            const Icon = config.icon
            return (
              <button
                key={vp}
                onClick={() => setViewport(vp)}
                title={config.label}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                  viewport === vp
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{config.label}</span>
              </button>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleOpenTab}
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onRegenerate}
            title="Regenerate with same prompt"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Iframe with responsive viewport */}
      <div className="flex-1 relative bg-secondary/30 overflow-hidden flex items-start justify-center">
        <iframe
          srcDoc={html}
          className={cn(
            "h-full border-0 bg-foreground/5 transition-all duration-300",
            viewport !== "desktop" && "shadow-xl rounded-lg mt-4 border border-border"
          )}
          style={{
            width: currentViewport.width,
            maxWidth: "100%",
          }}
          title="Generated website preview"
          sandbox="allow-scripts"
        />
      </div>

      {/* Refinement history */}
      {refinementHistory.length > 0 && (
        <div className="px-4 pt-3 pb-1 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-1.5 mb-2">
            <History className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Refinements ({refinementHistory.length})
            </span>
          </div>
          <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto">
            {refinementHistory.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <Check className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                <span className="leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refinement input */}
      <div className="px-4 py-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={refinement}
            onChange={(e) => setRefinement(e.target.value)}
            onKeyDown={handleRefineKeyDown}
            placeholder={isRefining ? "Applying refinement..." : "Refine your design..."}
            disabled={isRefining}
            className="flex-1 h-9 px-3 rounded-lg bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleRefineSubmit}
            disabled={!refinement.trim() || isRefining}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
              refinement.trim() && !isRefining
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-secondary text-muted-foreground"
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

      {/* Footer with download */}
      <div className="flex items-center justify-between px-4 h-12 border-t border-border flex-shrink-0">
        <span className="text-xs text-muted-foreground">
          {isRefining
            ? "Applying refinement..."
            : refinementHistory.length > 0
              ? `${refinementHistory.length} refinement${refinementHistory.length === 1 ? "" : "s"} applied`
              : "Generated HTML ready"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={onReset}
          >
            New Build
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-primary text-primary-foreground hover:opacity-90"
            onClick={handleDownload}
          >
            <Download className="w-3.5 h-3.5" />
            Download HTML
          </Button>
        </div>
      </div>
    </div>
  )
}
