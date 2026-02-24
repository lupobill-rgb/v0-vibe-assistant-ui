"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowUp, Square, Lightbulb, Sparkles, FileText, LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"

const QUICK_ACTIONS = [
  {
    label: "Help me write a prompt",
    icon: Lightbulb,
    message: "I need help writing a prompt for a website. Can you ask me a few questions about what I want to build and then create a detailed prompt I can use?",
  },
  {
    label: "Improve my site",
    icon: Sparkles,
    message: "I'd like to improve my current website. Can you suggest specific improvements for the design, copy, and user experience?",
  },
  {
    label: "Suggest content",
    icon: FileText,
    message: "I need content suggestions for my website. Can you help me come up with compelling headlines, descriptions, and calls-to-action?",
  },
  {
    label: "Plan my pages",
    icon: LayoutGrid,
    message: "I want to plan the pages for my website. Can you help me decide what pages I need and what content should go on each one?",
  },
]

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading?: boolean
  prefillValue?: string
  onPrefillConsumed?: () => void
}

export function ChatInput({ onSend, isLoading = false, prefillValue, onPrefillConsumed }: ChatInputProps) {
  const [value, setValue] = useState("")
  const [focused, setFocused] = useState(false)
  const [mounted, setMounted] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle prefill from quick actions or external
  useEffect(() => {
    if (prefillValue) {
      setValue(prefillValue)
      onPrefillConsumed?.()
      // Focus the textarea
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [prefillValue, onPrefillConsumed])

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

  const handleQuickAction = (message: string) => {
    setValue(message)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  return (
    <div className="border-t border-border bg-background px-6 py-4">
      {/* Quick action buttons */}
      {!isLoading && value.length === 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.message)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground bg-secondary/50 border border-border hover:border-primary/30 hover:text-foreground hover:bg-secondary transition-all"
            >
              <action.icon className="w-3.5 h-3.5" />
              {action.label}
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          "flex items-end gap-3 rounded-xl border px-4 py-3 transition-colors",
          focused ? "border-ring bg-card" : "border-border bg-card/50"
        )}
      >
        <div className="flex-1 min-h-[2rem]">
          {mounted && (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Ask the VIBE assistant anything about website planning..."
              rows={1}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed max-h-[200px]"
            />
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 mb-0.5">
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
        VIBE Assistant helps with planning and brainstorming. It does not build websites directly.
      </p>
    </div>
  )
}
