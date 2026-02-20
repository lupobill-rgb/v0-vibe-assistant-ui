"use client"

import { Sparkles, User, Copy, ThumbsUp, ThumbsDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex gap-3 py-4", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          isUser
            ? "bg-secondary"
            : "bg-gradient-to-br from-[#4F8EFF] via-[#A855F7] to-[#EC4899]"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-secondary-foreground" />
        ) : (
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex flex-col gap-1 max-w-[75%]", isUser && "items-end")}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {isUser ? "You" : "VIBE"}
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
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Actions (assistant only) */}
        {!isUser && (
          <div className="flex items-center gap-1 mt-0.5">
            <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Copy className="w-3 h-3" />
            </button>
            <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <ThumbsDown className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
