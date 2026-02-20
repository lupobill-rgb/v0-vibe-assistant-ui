"use client"

import { useState, useRef, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { ChatHistory } from "@/components/chat/chat-history"
import { ChatMessage, type Message } from "@/components/chat/chat-message"
import { ChatInput } from "@/components/chat/chat-input"
import { Sparkles } from "lucide-react"

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Hello! I'm VIBE, your AI coding assistant. I can help you build applications, debug code, design interfaces, and much more. What would you like to work on today?",
    timestamp: "10:30 AM",
  },
  {
    id: "2",
    role: "user",
    content: "I need help building a checkout flow for my e-commerce app. It should support Stripe payments and have a multi-step form.",
    timestamp: "10:31 AM",
  },
  {
    id: "3",
    role: "assistant",
    content: `I'd be happy to help you build a checkout flow! Here's what I'll set up for you:

1. **Multi-step form** with shipping, payment, and review steps
2. **Stripe Elements** integration for secure card input
3. **Form validation** at each step with helpful error messages
4. **Order summary** sidebar that updates in real-time

Let me start by scaffolding the checkout page component. I'll use a step-based approach with React state to manage the flow between steps.

Would you like me to include guest checkout support, or will this require user authentication?`,
    timestamp: "10:31 AM",
  },
  {
    id: "4",
    role: "user",
    content: "Let's include both guest checkout and authenticated checkout options.",
    timestamp: "10:32 AM",
  },
  {
    id: "5",
    role: "assistant",
    content: `Great choice! I'll implement both flows. Here's the plan:

**Guest Checkout:**
- Email capture at the beginning
- Shipping address form
- Payment via Stripe

**Authenticated Checkout:**
- Pre-filled shipping from saved addresses
- Saved payment methods
- One-click reorder capability

I'm generating the code now. This will include the checkout page, the step components, and the Stripe integration hooks.`,
    timestamp: "10:33 AM",
  },
]

export default function ChatPage() {
  const [activeConversation, setActiveConversation] = useState("1")
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'll get right on that. Let me analyze your request and generate the code you need. This should just take a moment...",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  return (
    <AppShell>
      <div className="flex h-screen">
        {/* Chat History Sidebar */}
        <ChatHistory activeConversation={activeConversation} onSelect={setActiveConversation} />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-6 h-14 border-b border-border flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4F8EFF] via-[#A855F7] to-[#EC4899] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">E-commerce checkout flow</h2>
              <p className="text-[10px] text-muted-foreground">5 messages</p>
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
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F8EFF] via-[#A855F7] to-[#EC4899] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-card border border-border rounded-tl-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
      </div>
    </AppShell>
  )
}
