"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { AppShell } from "@/components/app-shell"
import { ChatHistory, type Conversation } from "@/components/chat/chat-history"
import { ChatMessage, type Message } from "@/components/chat/chat-message"
import { ChatInput } from "@/components/chat/chat-input"
import { Sparkles, FolderKanban, X } from "lucide-react"
import {
  getAllConversations,
  getConversation,
  createConversation,
  addMessage,
  deleteConversation,
  deriveTitle,
  type ChatConversation,
} from "@/lib/chat-store"
import { getAllProjects, type SavedProject } from "@/lib/projects-store"
import { generateDiff } from "@/lib/api"

const ASSISTANT_SYSTEM_PROMPT =
  "You are VIBE's AI assistant helping users plan and build websites. You help with: writing better prompts for website generation, suggesting improvements to existing projects, planning site structure and content strategy, writing marketing copy, and answering questions about web design best practices. Be concise, friendly, and actionable. When suggesting a website prompt, format it in a code block so the user can easily copy it. If the user describes a business, suggest a complete prompt they can paste into the builder."

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi there! I'm your VIBE planning assistant. I can help you:\n\n" +
    "- **Write better prompts** for the website builder\n" +
    "- **Plan your site structure** and page layout\n" +
    "- **Suggest content** and marketing copy\n" +
    "- **Improve existing projects** with design and UX tips\n\n" +
    "What would you like to work on?",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function toSidebarConversation(c: ChatConversation): Conversation {
  const lastMsg = c.messages[c.messages.length - 1]
  return {
    id: c.id,
    title: c.title,
    lastMessage: lastMsg ? lastMsg.content.slice(0, 60) : "New conversation",
    time: timeAgo(c.updatedAt),
    projectId: c.projectId,
  }
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const [prefill, setPrefill] = useState<string | undefined>(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Active project context
  const [activeProject, setActiveProject] = useState<SavedProject | null>(null)

  // Load conversations from localStorage
  const refreshConversations = useCallback(() => {
    const all = getAllConversations()
    setConversations(all.map(toSidebarConversation))
  }, [])

  useEffect(() => {
    refreshConversations()
    // Check for an active project
    try {
      const projects = getAllProjects()
      if (projects.length > 0) {
        setActiveProject(projects[0])
      }
    } catch {
      // No projects
    }
  }, [refreshConversations])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Select a conversation
  const handleSelectConversation = useCallback((id: string) => {
    const conv = getConversation(id)
    if (conv) {
      setActiveConvId(id)
      setMessages(
        conv.messages.length > 0 ? conv.messages : [WELCOME_MESSAGE]
      )
    }
  }, [])

  // Start a new conversation
  const handleNewChat = useCallback(() => {
    setActiveConvId(null)
    setMessages([WELCOME_MESSAGE])
    setPrefill(undefined)
  }, [])

  // Delete a conversation
  const handleDeleteConversation = useCallback(
    (id: string) => {
      deleteConversation(id)
      refreshConversations()
      if (activeConvId === id) {
        setActiveConvId(null)
        setMessages([WELCOME_MESSAGE])
      }
    },
    [activeConvId, refreshConversations]
  )

  // Send a message
  const handleSend = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      // If no active conversation, create one
      let convId = activeConvId
      if (!convId) {
        const title = deriveTitle(content)
        const conv = createConversation(
          title,
          WELCOME_MESSAGE,
          activeProject?.id
        )
        convId = conv.id
        setActiveConvId(convId)
        refreshConversations()
      }

      // Add user message
      addMessage(convId, userMessage)
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      refreshConversations()

      try {
        // Build context with active project if available
        let contextPrompt = content
        if (activeProject) {
          contextPrompt = `[User is currently working on a project called "${activeProject.name}" with prompt: "${activeProject.prompt}"]\n\n${content}`
        }

        const response = await generateDiff(
          contextPrompt,
          undefined,
          undefined,
          ASSISTANT_SYSTEM_PROMPT
        )

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.diff,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }

        addMessage(convId, assistantMessage)
        setMessages((prev) => [...prev, assistantMessage])
        refreshConversations()
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Something went wrong"
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Sorry, I encountered an error: ${errorMsg}. Please try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
        addMessage(convId, errorMessage)
        setMessages((prev) => [...prev, errorMessage])
        refreshConversations()
      } finally {
        setIsLoading(false)
      }
    },
    [activeConvId, activeProject, refreshConversations]
  )

  return (
    <AppShell>
      <div className="flex h-screen">
        {/* Chat History Sidebar */}
        <ChatHistory
          conversations={conversations}
          activeConversation={activeConvId || ""}
          onSelect={handleSelectConversation}
          onNewChat={handleNewChat}
          onDelete={handleDeleteConversation}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Context Bar: Active Project */}
          {activeProject && (
            <div className="flex items-center gap-2 px-6 py-2 bg-primary/5 border-b border-primary/10">
              <FolderKanban className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-foreground">
                Currently working on: <span className="font-semibold">{activeProject.name}</span>
              </span>
              <button
                onClick={() => setActiveProject(null)}
                className="ml-auto w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Dismiss project context"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Chat Header */}
          <div className="flex items-center gap-3 px-6 h-14 border-b border-border flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--gradient-blue)] via-[var(--gradient-purple)] to-[var(--gradient-pink)] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">VIBE Assistant</h2>
              <p className="text-[10px] text-muted-foreground">
                Planning, prompts, and brainstorming
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6">
            <div className="max-w-3xl mx-auto py-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex gap-3 py-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gradient-blue)] via-[var(--gradient-purple)] to-[var(--gradient-pink)] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">VIBE Assistant</span>
                    <div className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-card border border-border rounded-tl-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <ChatInput
            onSend={handleSend}
            isLoading={isLoading}
            prefillValue={prefill}
            onPrefillConsumed={() => setPrefill(undefined)}
          />
        </div>
      </div>
    </AppShell>
  )
}
