"use client"

import { Globe, ExternalLink, X } from "lucide-react"

interface PreviewPanelProps {
  url: string
  onClose: () => void
}

export function PreviewPanel({ url, onClose }: PreviewPanelProps) {
  return (
    <div className="flex flex-col border-t border-border h-[40vh] min-h-[200px]">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border flex-shrink-0">
        <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
          {url}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <ExternalLink className="w-3 h-3" />
          Open
        </a>
        <button
          onClick={onClose}
          className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sandboxed iframe */}
      <iframe
        src={url}
        title="Live Preview"
        sandbox="allow-scripts allow-same-origin"
        className="flex-1 w-full bg-white"
      />
    </div>
  )
}
