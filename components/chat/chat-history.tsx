"use client"

import { MessageSquare, Plus, MoreHorizontal, Search, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

export interface Conversation {
  id: string
  title: string
  lastMessage: string
  time: string
  projectId?: string
}

interface ChatHistoryProps {
  conversations: Conversation[]
  activeConversation: string
  onSelect: (id: string) => void
  onNewChat: () => void
  onDelete: (id: string) => void
}

export function ChatHistory({
  conversations,
  activeConversation,
  onSelect,
  onNewChat,
  onDelete,
}: ChatHistoryProps) {
  const [search, setSearch] = useState("")
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const filtered = search.trim()
    ? conversations.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.lastMessage.toLowerCase().includes(search.toLowerCase())
      )
    : conversations

  return (
    <div className="w-[280px] flex-shrink-0 border-r border-border flex flex-col h-full bg-card/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border flex-shrink-0">
        <h2 className="text-sm font-semibold text-foreground">Conversations</h2>
        <button
          onClick={onNewChat}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="New conversation"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg bg-secondary/50 border border-transparent focus-within:border-ring transition-colors">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">
              {search.trim() ? "No matches found" : "No conversations yet"}
            </p>
          </div>
        )}
        {filtered.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            onMouseEnter={() => setHoveredId(conv.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={cn(
              "w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors group mb-0.5",
              activeConversation === conv.id
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-60" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium truncate">{conv.title}</span>
                <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">{conv.time}</span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(conv.id)
              }}
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive-foreground hover:bg-destructive/20 transition-all flex-shrink-0 mt-0.5",
                hoveredId === conv.id ? "opacity-100" : "opacity-0"
              )}
              title="Delete conversation"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </button>
        ))}
      </div>
    </div>
  )
}
