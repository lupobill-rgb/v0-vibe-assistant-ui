import type { Message } from "@/components/chat/chat-message"

export interface ChatConversation {
  id: string
  title: string
  messages: Message[]
  projectId?: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = "vibe-chat-conversations"

function generateId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function readAll(): ChatConversation[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ChatConversation[]
  } catch {
    return []
  }
}

function writeAll(conversations: ChatConversation[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
}

/** Get all conversations sorted by updatedAt descending. */
export function getAllConversations(): ChatConversation[] {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

/** Get a single conversation by ID. */
export function getConversation(id: string): ChatConversation | undefined {
  return readAll().find((c) => c.id === id)
}

/** Get conversations for a specific project. */
export function getConversationsForProject(projectId: string): ChatConversation[] {
  return getAllConversations().filter((c) => c.projectId === projectId)
}

/** Create a new conversation. */
export function createConversation(
  title: string,
  firstMessage?: Message,
  projectId?: string
): ChatConversation {
  const now = new Date().toISOString()
  const conv: ChatConversation = {
    id: generateId(),
    title,
    messages: firstMessage ? [firstMessage] : [],
    projectId,
    createdAt: now,
    updatedAt: now,
  }
  const all = readAll()
  all.push(conv)
  writeAll(all)
  return conv
}

/** Add a message to a conversation. */
export function addMessage(conversationId: string, message: Message): void {
  const all = readAll()
  const idx = all.findIndex((c) => c.id === conversationId)
  if (idx === -1) return
  all[idx].messages.push(message)
  all[idx].updatedAt = new Date().toISOString()
  writeAll(all)
}

/** Update conversation title. */
export function updateConversationTitle(id: string, title: string): void {
  const all = readAll()
  const idx = all.findIndex((c) => c.id === id)
  if (idx === -1) return
  all[idx].title = title
  all[idx].updatedAt = new Date().toISOString()
  writeAll(all)
}

/** Delete a conversation. */
export function deleteConversation(id: string): boolean {
  const all = readAll()
  const filtered = all.filter((c) => c.id !== id)
  if (filtered.length === all.length) return false
  writeAll(filtered)
  return true
}

/** Derive a conversation title from the first user message. */
export function deriveTitle(content: string): string {
  const cleaned = content.replace(/\n/g, " ").trim()
  const firstSentence = cleaned.split(/[.!?]/)[0]?.trim() || cleaned
  if (firstSentence.length <= 40) return firstSentence
  return firstSentence.slice(0, 37) + "..."
}
