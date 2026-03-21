"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowUp, Paperclip, Loader2, CheckCircle2, X, Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { createProject, createJob, API_URL } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { useTeam } from "@/contexts/TeamContext"
type Message = { role: "assistant" | "user"; text: string }
type Stage = "idle" | "intake" | "building"
const INTAKE_SYSTEM = `You are VIBE, an AI product assistant. A user wants to build something. Your job is to ask 2-3 short, focused questions to understand exactly what they need before building.
Rules:
- Ask only ONE question at a time
- Questions must be SHORT (one sentence max)
- After 2-3 exchanges you have enough context — output EXACTLY this JSON and nothing else:
  {"ready": true, "enrichedPrompt": "<full build spec combining original intent + answers>", "summary": "<one line describing what will be built>"}
- Never ask more than 3 questions total
- Never explain yourself or add commentary
- Be conversational, not formal
Focus on: what type of output (app/site/dashboard), what data/entities are involved, who will use it.`
export function PromptCard({ selectedProjectId }: { selectedProjectId?: string }) {
  const router = useRouter()
  const { currentTeam } = useTeam()
  const [prompt, setPrompt] = useState("")
  const [focused, setFocused] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>("idle")
  const [messages, setMessages] = useState<Message[]>([])
  const [userInput, setUserInput] = useState("")
  const [intaking, setIntaking] = useState(false)
  const [enrichedPrompt, setEnrichedPrompt] = useState("")
  const conversationRef = useRef<{ role: string; content: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<{
    status: "idle" | "uploading" | "done" | "error"
    progress: number
    message: string
    uploadId?: string
  }>({ status: "idle", progress: 0, message: "" })
  const handleAttach = () => fileInputRef.current?.click()
  const clearUpload = () => {
    setUploadState({ status: "idle", progress: 0, message: "" })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadState({ status: "uploading", progress: 0, message: `Uploading ${file.name}...` })
    const formData = new FormData()
    formData.append("file", file)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      setUploadState({ status: "error", progress: 0, message: "You must be signed in to upload files." })
      return
    }
    formData.append("user_id", user.id)
    try {
      const xhr = new XMLHttpRequest()
      const result = await new Promise<{ upload_id?: string; row_count?: number }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100)
            setUploadState((s) => ({ ...s, progress: pct, message: `Uploading ${file.name}... ${pct}%` }))
          }
        })
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)) } catch { reject(new Error("Invalid response")) }
          } else {
            try { reject(new Error(JSON.parse(xhr.responseText).error || `Upload failed`)) } catch { reject(new Error(`Upload failed (${xhr.status})`)) }
          }
        })
        xhr.addEventListener("error", () => reject(new Error("Network error")))
        xhr.open("POST", `${API_URL}/upload`)
        xhr.send(formData)
      })
      setUploadState({ status: "done", progress: 100, message: `✓ ${file.name} ready — ${(result.row_count ?? 0).toLocaleString()} rows loaded.`, uploadId: result.upload_id })
    } catch (err) {
      setUploadState({ status: "error", progress: 0, message: err instanceof Error ? err.message : "Upload failed" })
    }
  }
  const tryParseReady = (text: string): { ready: true; enrichedPrompt: string; summary: string } | null => {
    // Try direct parse first
    try {
      const parsed = JSON.parse(text)
      if (parsed.ready) return parsed
    } catch {}
    // Extract JSON object from surrounding text
    const match = text.match(/\{[^{}]*"ready"\s*:\s*true[^{}]*\}/)
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        if (parsed.ready) return parsed
      } catch {}
    }
    return null
  }
  const callClaude = async (messages: { role: string; content: string }[]): Promise<string> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      return data.text ?? ""
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("AI took too long to respond. Please try again.")
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }
  const startIntake = async () => {
    if (!prompt.trim() || submitting) return
    setStage("intake")
    setIntaking(true)
    setMessages([])
    conversationRef.current = [{ role: "user", content: prompt.trim() }]
    try {
      const reply = await callClaude(conversationRef.current)
      // Check if Claude is already ready
      const ready = tryParseReady(reply)
      if (ready) {
        setEnrichedPrompt(ready.enrichedPrompt)
        setMessages([{ role: "assistant", text: `Got it — building: ${ready.summary}` }])
        await fireJob(ready.enrichedPrompt)
        return
      }
      conversationRef.current.push({ role: "assistant", content: reply })
      setMessages([{ role: "assistant", text: reply }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to connect to AI."
      setError(`${msg} You can retry or skip to build.`)
    } finally {
      setIntaking(false)
    }
  }
  const sendAnswer = async () => {
    if (!userInput.trim() || intaking) return
    const answer = userInput.trim()
    setUserInput("")
    setMessages((m) => [...m, { role: "user", text: answer }])
    conversationRef.current.push({ role: "user", content: answer })
    setIntaking(true)
    try {
      const reply = await callClaude(conversationRef.current)
      // Check if Claude is ready to build
      const ready = tryParseReady(reply)
      if (ready) {
        setMessages((m) => [...m, { role: "assistant", text: `Got it — building: ${ready.summary}` }])
        setEnrichedPrompt(ready.enrichedPrompt)
        await fireJob(ready.enrichedPrompt)
        return
      }
      conversationRef.current.push({ role: "assistant", content: reply })
      setMessages((m) => [...m, { role: "assistant", text: reply }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong."
      setError(`${msg} You can retry or skip to build with what we have.`)
    } finally {
      setIntaking(false)
    }
  }
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const buildViaVercel = async (finalPrompt: string): Promise<string> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120000)
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: finalPrompt }],
          build: true,
        }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Build failed (${res.status})`)
      if (!data.html) throw new Error("Build returned empty HTML")
      return data.html
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("Build timed out. Please try again.")
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }
  const fireJob = async (finalPrompt: string) => {
    setSubmitting(true)
    setStage("building")
    setError(null)
    try {
      // Step 1: Build HTML via Vercel direct path
      console.log("[VIBE] fireJob: starting Vercel build...")
      const html = await buildViaVercel(finalPrompt)
      console.log("[VIBE] fireJob: build complete, HTML length:", html.length)
      // Step 2: Create project
      let projectId = selectedProjectId
      if (!projectId) {
        console.log("[VIBE] fireJob: creating project...")
        const project = await createProject(finalPrompt.slice(0, 60), undefined, currentTeam?.id)
        if (project.error || !project.id) throw new Error(project.error || "Failed to create project")
        projectId = project.id
        console.log("[VIBE] fireJob: project created:", projectId)
      }
      // Step 3: Try direct Supabase insert, fall back to Railway createJob
      let jobId: string | undefined
      const { data: { user } } = await supabase.auth.getUser()
      console.log("[VIBE] fireJob: inserting job into Supabase...")
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .insert({
          user_prompt: finalPrompt,
          project_id: projectId,
          execution_state: "completed",
          last_diff: html,
          user_id: user?.id,
        })
        .select("id")
        .single()
      if (jobError || !jobData?.id) {
        console.warn("[VIBE] fireJob: Supabase insert failed:", jobError?.message, "— falling back to Railway")
        const result = await createJob({
          prompt: finalPrompt,
          project_id: projectId,
          base_branch: "main",
          upload_id: uploadState.uploadId,
          conversation_id: conversationId,
        })
        if (result.error || !result.task_id) throw new Error(result.error || "Failed to create job")
        if (result.conversation_id) setConversationId(result.conversation_id)
        jobId = result.task_id
        console.log("[VIBE] fireJob: Railway job created:", jobId)
      } else {
        jobId = jobData.id
        console.log("[VIBE] fireJob: Supabase job created:", jobId)
      }
      // Step 4: Navigate — use both router.push and a fallback
      const buildUrl = `/building/${jobId}`
      console.log("[VIBE] fireJob: navigating to", buildUrl)
      router.push(buildUrl)
      // Fallback: if router.push doesn't trigger navigation within 2s, force it
      setTimeout(() => {
        if (window.location.pathname !== buildUrl) {
          console.warn("[VIBE] fireJob: router.push did not navigate, forcing redirect")
          window.location.href = buildUrl
        }
      }, 2000)
    } catch (err) {
      console.error("[VIBE] fireJob: error:", err)
      setError(err instanceof Error ? err.message : "Failed to start build")
      setSubmitting(false)
      setStage("idle")
    }
  }
  const buildWithCollected = () => {
    // Assemble enriched prompt from conversation so far
    const parts = conversationRef.current
      .filter((m) => m.role === "user")
      .map((m) => m.content)
    const collected = parts.join("\n\n")
    setError(null)
    fireJob(collected)
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); startIntake() }
  }
  const handleAnswerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); sendAnswer() }
  }
  const reset = () => {
    setStage("idle")
    setMessages([])
    setUserInput("")
    setEnrichedPrompt("")
    setError(null)
    conversationRef.current = []
  }
  // ── INTAKE MODE ──
  if (stage === "intake" || stage === "building") {
    return (
      <div className="px-4 sm:px-6 -mt-8 relative z-10">
        <div className="bg-card rounded-3xl border border-border shadow-2xl shadow-black/20">
          <div className="p-4 sm:p-6">
            {/* Original prompt */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3 h-3 text-primary" />
              </div>
              <p className="text-sm text-foreground">{prompt}</p>
              {stage === "intake" && (
                <button onClick={reset} className="ml-auto shrink-0 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Conversation */}
            <div className="space-y-3 mb-4">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex items-start gap-3", m.role === "user" && "flex-row-reverse")}>
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    m.role === "assistant" ? "bg-primary/20" : "bg-secondary"
                  )}>
                    {m.role === "assistant"
                      ? <Bot className="w-3 h-3 text-primary" />
                      : <User className="w-3 h-3 text-muted-foreground" />
                    }
                  </div>
                  <div className={cn(
                    "text-sm rounded-2xl px-3 py-2 max-w-[80%]",
                    m.role === "assistant" ? "bg-secondary text-foreground" : "bg-primary/10 text-foreground"
                  )}>
                    {m.text}
                  </div>
                </div>
              ))}
              {intaking && (
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                  <div className="bg-secondary rounded-2xl px-3 py-2">
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              {stage === "building" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-9">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Building your project...
                </div>
              )}
            </div>
            {/* Answer input */}
            {stage === "intake" && !intaking && messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={handleAnswerKeyDown}
                  placeholder="Type your answer..."
                  className="flex-1 bg-secondary rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/50 focus:border-primary/40"
                />
                <button
                  onClick={sendAnswer}
                  disabled={!userInput.trim()}
                  className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-xl transition-all",
                    userInput.trim() ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                  )}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            )}
            {error && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-red-400">{error}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setError(null); sendAnswer() }}
                    disabled={intaking}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    onClick={buildWithCollected}
                    disabled={submitting}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-white hover:opacity-90 transition-colors"
                  >
                    Skip to Build
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
  // ── IDLE MODE ──
  return (
    <div className="px-4 sm:px-6 -mt-8 relative z-10">
      <div
        className={cn(
          "bg-card rounded-3xl border border-border shadow-2xl shadow-black/20 transition-all duration-300",
          focused && "border-primary/40 shadow-primary/5"
        )}
      >
        <div className="p-4 sm:p-6">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build..."
              rows={3}
              disabled={submitting}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-base resize-none outline-none leading-relaxed disabled:opacity-60 min-h-[80px]"
            />
          </div>
          {error && <p className="text-xs text-red-400 mt-1 mb-2">{error}</p>}
          {uploadState.status !== "idle" && (
            <div className={cn(
              "flex items-center gap-2 text-xs rounded-lg px-3 py-2 mt-1 mb-2",
              uploadState.status === "uploading" && "bg-primary/10 text-primary",
              uploadState.status === "done" && "bg-emerald-500/10 text-emerald-400",
              uploadState.status === "error" && "bg-red-500/10 text-red-400",
            )}>
              {uploadState.status === "uploading" && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
              {uploadState.status === "done" && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
              <span className="flex-1 truncate">{uploadState.message}</span>
              {uploadState.status === "uploading" && (
                <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden shrink-0">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${uploadState.progress}%` }} />
                </div>
              )}
              {uploadState.status !== "uploading" && (
                <button onClick={clearUpload} className="shrink-0 hover:opacity-70"><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50 mt-2">
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileChange} />
              <button
                onClick={handleAttach}
                disabled={uploadState.status === "uploading"}
                className="flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                <Paperclip className="w-3.5 h-3.5" />
                Attach
              </button>
              <div className="w-px h-4 bg-border hidden sm:block" />
              <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                {prompt.length > 0 ? `${prompt.length} chars` : "⌘↵ to submit"}
              </span>
            </div>
            <button
              onClick={startIntake}
              disabled={!prompt.trim() || submitting}
              className={cn(
                "flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl text-sm font-medium transition-all duration-200",
                prompt.trim() && !submitting
                  ? "bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white shadow-lg shadow-[#A855F7]/20 hover:opacity-90"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
              <span className="hidden sm:inline">Build Project</span>
              <span className="sm:hidden">Build</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
