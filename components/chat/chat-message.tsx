"use client"

import { useState } from "react"
import { Sparkles, User, Copy, ThumbsUp, ThumbsDown, ArrowRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

function extractCodeBlocks(text: string): { hasCode: boolean; codeContent: string } {
  const codeBlockRegex = /```[\s\S]*?```/g
  const matches = text.match(codeBlockRegex)
  if (!matches || matches.length === 0) return { hasCode: false, codeContent: "" }
  // Extract inner content (strip the ``` fences and optional language tag)
  const inner = matches
    .map((block) => {
      const lines = block.split("\n")
      // Remove first and last line (the ``` lines)
      return lines.slice(1, -1).join("\n").trim()
    })
    .join("\n\n")
  return { hasCode: true, codeContent: inner }
}

function renderContent(text: string) {
  // Split by code blocks and render them distinctly
  const parts: React.ReactNode[] = []
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Text before the code block
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++} className="whitespace-pre-wrap">
          {renderInlineMarkdown(text.slice(lastIndex, match.index))}
        </span>
      )
    }
    // The code block
    const lang = match[1] || ""
    const code = match[2].trim()
    parts.push(
      <div key={key++} className="my-2 rounded-lg overflow-hidden border border-border">
        {lang && (
          <div className="px-3 py-1.5 bg-secondary/50 border-b border-border">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">{lang}</span>
          </div>
        )}
        <pre className="px-3 py-3 bg-secondary/30 overflow-x-auto">
          <code className="text-xs font-mono text-foreground leading-relaxed">{code}</code>
        </pre>
      </div>
    )
    lastIndex = match.index + match[0].length
  }

  // Remaining text after last code block
  if (lastIndex < text.length) {
    parts.push(
      <span key={key++} className="whitespace-pre-wrap">
        {renderInlineMarkdown(text.slice(lastIndex))}
      </span>
    )
  }

  return parts.length > 0 ? parts : <span className="whitespace-pre-wrap">{renderInlineMarkdown(text)}</span>
}

function renderInlineMarkdown(text: string) {
  // Simple inline markdown: **bold**, *italic*, `code`
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let lastIdx = 0
  let m: RegExpExecArray | null
  let k = 0

  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      parts.push(<span key={k++}>{text.slice(lastIdx, m.index)}</span>)
    }
    if (m[2]) {
      parts.push(<strong key={k++} className="font-semibold">{m[2]}</strong>)
    } else if (m[3]) {
      parts.push(<em key={k++}>{m[3]}</em>)
    } else if (m[4]) {
      parts.push(
        <code key={k++} className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono text-foreground">
          {m[4]}
        </code>
      )
    }
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < text.length) {
    parts.push(<span key={k++}>{text.slice(lastIdx)}</span>)
  }
  return parts
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user"
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const { hasCode, codeContent } = extractCodeBlocks(message.content)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUseAsPrompt = () => {
    // Navigate to home with prompt prefilled via search params
    const encoded = encodeURIComponent(codeContent)
    router.push(`/?prefill=${encoded}`)
  }

  return (
    <div className={cn("flex gap-3 py-4", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          isUser
            ? "bg-primary/20"
            : "bg-gradient-to-br from-[var(--gradient-blue)] via-[var(--gradient-purple)] to-[var(--gradient-pink)]"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary" />
        ) : (
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex flex-col gap-1 max-w-[75%]", isUser && "items-end")}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {isUser ? "You" : "VIBE Assistant"}
          </span>
          <span className="text-[10px] text-muted-foreground/60">{message.timestamp}</span>
        </div>
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-primary/15 text-foreground rounded-tr-sm"
              : "bg-card border border-border text-card-foreground rounded-tl-sm"
          )}
        >
          {renderContent(message.content)}
        </div>

        {/* Actions (assistant only) */}
        {!isUser && (
          <div className="flex items-center gap-1 mt-0.5">
            <button
              onClick={handleCopy}
              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Copy message"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
            <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <ThumbsDown className="w-3 h-3" />
            </button>
            {hasCode && (
              <button
                onClick={handleUseAsPrompt}
                className="flex items-center gap-1 ml-1 px-2 py-1 rounded-md text-[10px] font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                title="Use code block content as prompt in the builder"
              >
                Use as prompt
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
