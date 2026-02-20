"use client"

import { MessageSquare, Plus, MoreHorizontal, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface Conversation {
  id: string
  title: string
  lastMessage: string
  time: string
}

const conversations: Conversation[] = [
  { id: "1", title: "E-commerce checkout flow", lastMessage: "Here's the updated checkout...", time: "2m ago" },
  { id: "2", title: "Dashboard layout help", lastMessage: "I've added the responsive...", time: "1h ago" },
  { id: "3", title: "API authentication setup", lastMessage: "The JWT middleware is now...", time: "3h ago" },
  { id: "4", title: "Database schema design", lastMessage: "Here's the normalized schema...", time: "Yesterday" },
  { id: "5", title: "React performance tips", lastMessage: "Using useMemo for expensive...", time: "Yesterday" },
  { id: "6", title: "Tailwind styling help", lastMessage: "The gradient classes you need...", time: "2d ago" },
]

interface ChatHistoryProps {
  activeConversation: string
  onSelect: (id: string) => void
}

export function ChatHistory({ activeConversation, onSelect }: ChatHistoryProps) {
  return (
    <div className="w-[280px] flex-shrink-0 border-r border-border flex flex-col h-full bg-card/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border flex-shrink-0">
        <h2 className="text-sm font-semibold text-foreground">Conversations</h2>
        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg bg-secondary/50 border border-transparent">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
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
            <button className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-all flex-shrink-0 mt-0.5">
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </button>
        ))}
      </div>
    </div>
  )
}
