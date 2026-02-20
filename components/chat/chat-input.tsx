"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowUp, Paperclip, Mic, Square } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading?: boolean
}

export function ChatInput({ onSend, isLoading = false }: ChatInputProps) {
  const [value, setValue] = useState("")
  const [focused, setFocused] = useState(false)
  const [mounted, setMounted] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = () => {
    if (value.trim() && !isLoading) {
      onSend(value.trim())
      setValue("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px"
  }

  return (
    <div className="border-t border-border bg-background px-6 py-4">
      <div
        className={cn(
          "flex items-end gap-3 rounded-xl border px-4 py-3 transition-colors",
          focused ? "border-ring bg-card" : "border-border bg-card/50"
        )}
      >
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0 mb-0.5">
          <Paperclip className="w-4 h-4" />
        </button>

        <div className="flex-1 min-h-[2rem]">
          {mounted && (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Ask VIBE anything..."
              rows={1}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed max-h-[200px]"
            />
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 mb-0.5">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Mic className="w-4 h-4" />
          </button>
          <button
            onClick={handleSubmit}
            disabled={!value.trim() && !isLoading}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
              isLoading
                ? "bg-destructive text-destructive-foreground"
                : value.trim()
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-secondary text-muted-foreground"
            )}
          >
            {isLoading ? <Square className="w-3 h-3" /> : <ArrowUp className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
        VIBE can make mistakes. Review generated code before deploying.
      </p>
    </div>
  )
}
