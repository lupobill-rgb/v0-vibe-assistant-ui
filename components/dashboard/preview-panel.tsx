"use client"

import { useCallback } from "react"
import { Download, RotateCcw, ExternalLink, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PreviewPanelProps {
  html: string
  onReset: () => void
}

export function PreviewPanel({ html, onReset }: PreviewPanelProps) {
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

  const srcDoc = html

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-border flex-shrink-0">
        <span className="text-sm font-semibold text-card-foreground">
          Live Preview
        </span>
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
            onClick={onReset}
            title="Build another"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onReset}
            title="Close preview"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Iframe */}
      <div className="flex-1 relative bg-background">
        <iframe
          srcDoc={srcDoc}
          className="absolute inset-0 w-full h-full border-0 bg-foreground/5"
          title="Generated website preview"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {/* Footer with download */}
      <div className="flex items-center justify-between px-4 h-12 border-t border-border flex-shrink-0">
        <span className="text-xs text-muted-foreground">
          Generated HTML ready
        </span>
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
  )
}
