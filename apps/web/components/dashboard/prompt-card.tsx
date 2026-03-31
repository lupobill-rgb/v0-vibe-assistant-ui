"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowUp, Paperclip, Loader2, CheckCircle2, X, Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { createProject, createJob, linkUploadToProject, API_URL, type LimitExceededError } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { useTeam } from "@/contexts/TeamContext"
import { UpgradeModal } from "@/components/billing/UpgradeModal"
type Message = { role: "assistant" | "user"; text: string }
type Stage = "idle" | "intake" | "building"
// INTAKE_SYSTEM prompt lives server-side only: /api/intake/route.ts
export function PromptCard({ selectedProjectId }: { selectedProjectId?: string }) {
  const router = useRouter()
  const { currentTeam, currentOrg, loading: teamLoading } = useTeam()
  const [prompt, setPrompt] = useState("")
  const projectIdRef = useRef<string | undefined>(undefined)
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
    filename?: string
  }>({ status: "idle", progress: 0, message: "" })
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [limitInfo, setLimitInfo] = useState<LimitExceededError | null>(null)
  const [dataPath, setDataPath] = useState<string | null>(null)
  const [activeConnectors, setActiveConnectors] = useState<string[]>([])
  // Ref to keep upload_id accessible across async closures without stale capture
  const uploadIdRef = useRef<string | undefined>(undefined)
  // Restore upload_id from sessionStorage on mount (survives refresh during intake)
  if (typeof window !== "undefined" && !uploadIdRef.current) {
    const saved = sessionStorage.getItem("vibe_upload_id")
    if (saved) uploadIdRef.current = saved
  }
  const handleLimitError = (err: unknown): boolean => {
    const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
    const obj = err as Record<string, unknown> | undefined
    if (
      msg.includes('limit_exceeded') ||
      obj?.error === 'limit_exceeded' ||
      obj?.limit_exceeded
    ) {
      const info = (obj?.limit_exceeded ?? obj?.data ?? {
        limitType: 'projects', current: 0, max: 3, currentTier: 'starter', nextTier: 'pro',
      }) as LimitExceededError
      setLimitInfo(info)
      setUpgradeOpen(true)
      setSubmitting(false)
      setStage('idle')
      return true
    }
    return false
  }

  const handleAttach = () => fileInputRef.current?.click()
  const clearUpload = () => {
    uploadIdRef.current = undefined
    uploadPromiseRef.current = null
    sessionStorage.removeItem("vibe_upload_id")
    setUploadState({ status: "idle", progress: 0, message: "" })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }
  // Promise that resolves when the current upload completes (or null if idle)
  const uploadPromiseRef = useRef<Promise<void> | null>(null)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadState({ status: "uploading", progress: 0, message: `Uploading ${file.name}...` })
    const formData = new FormData()
    formData.append("file", file)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      setUploadState({ status: "error", progress: 0, message: "You must be signed in to upload files." })
      return
    }
    // Store the upload promise so startIntake() can await it
    const doUpload = async () => {
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
          xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`)
          xhr.send(formData)
        })
        const uid = result.upload_id
        uploadIdRef.current = uid
        if (uid) sessionStorage.setItem("vibe_upload_id", uid)
        console.log("[VIBE] Upload complete, uploadIdRef.current =", uid)
        setUploadState({ status: "done", progress: 100, message: `✓ ${file.name} ready — ${(result.row_count ?? 0).toLocaleString()} rows loaded.`, uploadId: uid, filename: file.name })
      } catch (err) {
        setUploadState({ status: "error", progress: 0, message: err instanceof Error ? err.message : "Upload failed" })
      }
    }
    uploadPromiseRef.current = doUpload()
    await uploadPromiseRef.current
    uploadPromiseRef.current = null
  }
  const tryParseReady = (text: string): { ready: true; enrichedPrompt: string; summary: string } | null => {
    // Try direct parse first
    try {
      const parsed = JSON.parse(text)
      if (parsed.ready) return parsed
    } catch {}
    // Strip markdown code blocks and retry
    const stripped = text.replace(/```(?:json)?\s*\n?/g, '').replace(/\n?```\s*$/g, '').trim()
    if (stripped !== text) {
      try {
        const parsed = JSON.parse(stripped)
        if (parsed.ready) return parsed
      } catch {}
    }
    // Find JSON object by matching brace depth (handles nested {} in enrichedPrompt)
    const start = text.indexOf('{')
    if (start >= 0) {
      let depth = 0
      let inString = false
      let escaped = false
      for (let i = start; i < text.length; i++) {
        const ch = text[i]
        if (escaped) { escaped = false; continue }
        if (ch === '\\' && inString) { escaped = true; continue }
        if (ch === '"') { inString = !inString; continue }
        if (inString) continue
        if (ch === '{') depth++
        else if (ch === '}') {
          depth--
          if (depth === 0) {
            try {
              const parsed = JSON.parse(text.slice(start, i + 1))
              if (parsed.ready) return parsed
            } catch {}
            break
          }
        }
      }
    }
    return null
  }
  const isHtmlResponse = (text: string): boolean => {
    const t = text.trimStart().toLowerCase()
    return t.startsWith('<!doctype') || t.startsWith('<html')
  }
  const callClaude = async (messages: { role: string; content: string }[]): Promise<{ text: string; ready?: boolean; enrichedPrompt?: string; summary?: string }> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ messages, upload_id: uploadIdRef.current, team_id: currentTeam?.id, org_id: currentOrg?.id, user_id: user?.id, project_id: projectIdRef.current }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      return { text: data.text ?? "", ready: data.ready, enrichedPrompt: data.enrichedPrompt, summary: data.summary }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("AI took too long to respond. Please try again.")
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }
  const checkConnectorsAndGreet = async (): Promise<boolean> => {
    if (!currentTeam?.id) return false
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const res = await fetch(`${API_URL}/connectors/${currentTeam.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      const connected: string[] = Array.isArray(data)
        ? data.filter((c: any) => c.status === "active").map((c: any) => c.connector_type)
        : []
      setActiveConnectors(connected)
      if (uploadIdRef.current) return false
      const connectorLine = connected.length > 0
        ? `I can see you have **${connected.join(", ")}** connected.`
        : `I do not see any data connectors set up yet.`
      setMessages([{ role: "assistant", text: `Hi! I am ready to build. ${connectorLine} How would you like to bring in data?\n\n__DATA_PATH_OPTIONS__` }])
      setStage("intake")
      setDataPath(null)
      return true
    } catch {
      return false
    }
  }

  const startIntake = async () => {
    if (!prompt.trim() || submitting || teamLoading) return
    setStage("intake")
    setIntaking(true)
    setMessages([])
    // Wait for any in-progress file upload to finish before proceeding
    if (uploadPromiseRef.current) {
      console.log("[VIBE] startIntake: waiting for upload to complete...")
      await uploadPromiseRef.current
      console.log("[VIBE] startIntake: upload done, uploadIdRef.current =", uploadIdRef.current)
    }
    // Create project early so upload_id is resolvable during intake Q&A
    if (!selectedProjectId && !projectIdRef.current) {
      console.log("[VIBE] startIntake: creating project with upload_id =", uploadIdRef.current)
      const project = await createProject(generateSmartName(prompt), undefined, currentTeam?.id, uploadIdRef.current)
      if (project.limit_exceeded) {
        setLimitInfo(project.limit_exceeded)
        setUpgradeOpen(true)
        setIntaking(false)
        setStage('idle')
        return
      }
      if (project.id) {
        projectIdRef.current = project.id
        console.log("[VIBE] startIntake: project created =", project.id)
        // Link the upload record to the project so the reference survives intake Q&A
        if (uploadIdRef.current) {
          linkUploadToProject(uploadIdRef.current, project.id).catch(() => {})
        }
      }
    }
    // Include file context so the intake AI knows about the attachment
    const fileNote = uploadIdRef.current && uploadState.filename
      ? `\n[Attached file: ${uploadState.filename}]`
      : ""
    conversationRef.current = [{ role: "user", content: prompt.trim() + fileNote }]
    try {
      const response = await callClaude(conversationRef.current)
      const reply = response.text
      // Server-side ready detection (prevents raw JSON in chat)
      if (response.ready && response.enrichedPrompt) {
        setEnrichedPrompt(response.enrichedPrompt)
        setMessages([{ role: "assistant", text: reply || `Got it — building: ${response.summary}` }])
        await fireJob(response.enrichedPrompt)
        return
      }
      // Client-side fallback: check if Claude is already ready
      const ready = tryParseReady(reply)
      if (ready) {
        setEnrichedPrompt(ready.enrichedPrompt)
        setMessages([{ role: "assistant", text: `Got it — building: ${ready.summary}` }])
        await fireJob(ready.enrichedPrompt)
        return
      }
      // Detect raw HTML returned instead of Q&A text — route to build
      if (isHtmlResponse(reply)) {
        setMessages([{ role: "assistant", text: "Building your app..." }])
        await fireJob(prompt.trim())
        return
      }
      conversationRef.current.push({ role: "assistant", content: reply })
      setMessages([{ role: "assistant", text: reply }])
    } catch (err) {
      if (handleLimitError(err)) return
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
      const response = await callClaude(conversationRef.current)
      const reply = response.text
      // Server-side ready detection (prevents raw JSON in chat)
      if (response.ready && response.enrichedPrompt) {
        setMessages((m) => [...m, { role: "assistant", text: reply || `Got it — building: ${response.summary}` }])
        setEnrichedPrompt(response.enrichedPrompt)
        await fireJob(response.enrichedPrompt)
        return
      }
      // Client-side fallback: check if Claude is ready to build
      const ready = tryParseReady(reply)
      if (ready) {
        setMessages((m) => [...m, { role: "assistant", text: `Got it — building: ${ready.summary}` }])
        setEnrichedPrompt(ready.enrichedPrompt)
        await fireJob(ready.enrichedPrompt)
        return
      }
      // Detect raw HTML returned instead of Q&A text — route to build
      if (isHtmlResponse(reply)) {
        setMessages((m) => [...m, { role: "assistant", text: "Building your app..." }])
        const collected = conversationRef.current.filter(m => m.role === 'user').map(m => m.content).join('\n\n')
        await fireJob(collected)
        return
      }
      conversationRef.current.push({ role: "assistant", content: reply })
      setMessages((m) => [...m, { role: "assistant", text: reply }])
    } catch (err) {
      if (handleLimitError(err)) return
      const msg = err instanceof Error ? err.message : "Something went wrong."
      setError(`${msg} You can retry or skip to build with what we have.`)
    } finally {
      setIntaking(false)
    }
  }
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const generateSmartName = (text: string): string => {
    const stopWords = new Set(['a', 'an', 'the', 'to', 'for', 'and', 'or', 'but', 'in', 'on', 'at', 'of', 'with', 'is', 'it', 'me', 'my', 'i', 'we', 'our', 'that', 'this', 'be', 'do', 'build', 'create', 'make', 'please', 'want', 'need', 'like', 'can', 'should', 'would'])
    const words = text.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 0)
    const meaningful = words.filter(w => !stopWords.has(w.toLowerCase()))
    const selected = (meaningful.length >= 4 ? meaningful : words).slice(0, 6)
    if (selected.length === 0) return text.slice(0, 60)
    return selected.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  }
  const fireJob = async (finalPrompt: string) => {
    setSubmitting(true)
    setStage("building")
    setError(null)
    try {
      // Step 1: Create project + job FIRST so we can navigate immediately
      let projectId = selectedProjectId || projectIdRef.current
      if (!projectId) {
        console.log("[VIBE] fireJob: creating project...")
        const project = await createProject(generateSmartName(finalPrompt), undefined, currentTeam?.id, uploadIdRef.current)
        if (project.limit_exceeded) {
          setLimitInfo(project.limit_exceeded)
          setUpgradeOpen(true)
          setSubmitting(false)
          setStage("idle")
          return
        }
        if (project.error || !project.id) throw new Error(project.error || "Failed to create project")
        projectId = project.id
        console.log("[VIBE] fireJob: project created:", projectId)
        if (uploadIdRef.current) linkUploadToProject(uploadIdRef.current, projectId).catch(() => {})
      }
      // Step 2: Create job record via Railway (sets state to 'queued')
      console.log("[VIBE] fireJob: creating job via Railway...")
      const result = await createJob({
        prompt: finalPrompt,
        project_id: projectId,
        base_branch: "main",
        upload_id: uploadIdRef.current,
        conversation_id: conversationId,
      })
      if (result.limit_exceeded) {
        setLimitInfo(result.limit_exceeded)
        setUpgradeOpen(true)
        setSubmitting(false)
        setStage("idle")
        return
      }
      if (result.error || !result.task_id) throw new Error(result.error || "Failed to create job")
      if (result.conversation_id) setConversationId(result.conversation_id)
      const jobId = result.task_id
      console.log("[VIBE] fireJob: job created:", jobId)
      // Step 3: Navigate IMMEDIATELY — don't wait for build
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
      if (handleLimitError(err)) return
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
  const handleAnswerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
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
            {/* File attachment indicator — persists through intake */}
            {uploadState.status === "done" && uploadIdRef.current && (
              <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-3 bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 truncate">{uploadState.message}</span>
              </div>
            )}
            {/* Conversation */}
            <div className="space-y-3 mb-4">
              {messages.map((m, i) => (
                m.text.includes("__DATA_PATH_OPTIONS__") ? (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3 h-3 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground mb-3">{m.text.replace("__DATA_PATH_OPTIONS__", "")}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {activeConnectors.length > 0 && (
                          <button onClick={() => { setDataPath("connected"); startIntake() }}
                            className="text-left px-3 py-2 rounded-xl border border-primary/40 bg-primary/5 hover:bg-primary/10 text-sm font-medium text-primary transition-colors">
                            Use {activeConnectors[0]} data
                          </button>
                        )}
                        <button onClick={() => { setDataPath("upload"); fileInputRef.current?.click() }}
                          className="text-left px-3 py-2 rounded-xl border border-border hover:border-primary/40 bg-muted/30 text-sm font-medium transition-colors">
                          Upload a file
                        </button>
                        <button onClick={() => { setDataPath("manual"); startIntake() }}
                          className="text-left px-3 py-2 rounded-xl border border-border hover:border-primary/40 bg-muted/30 text-sm font-medium transition-colors">
                          Enter data manually
                        </button>
                        <button onClick={() => { setDataPath("sample"); startIntake() }}
                          className="text-left px-3 py-2 rounded-xl border border-border hover:border-primary/40 bg-muted/30 text-sm font-medium transition-colors">
                          Use sample data
                        </button>
                      </div>
                    </div>
                  </div>
                ) :
                <div key={i} className={cn("flex items-start gap-3", m.role === "user" && "flex-row-reverse")}>
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5", m.role === "assistant" ? "bg-primary/20" : "bg-secondary")}>
                    {m.role === "assistant" ? <Bot className="w-3 h-3 text-primary" /> : <User className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">{m.text}</p>
                </div>
              ))}
            </div>
            {stage === "intake" && !intaking && (
              <div className="flex gap-2">
                <textarea
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
        <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} limitType={limitInfo?.limitType ?? "projects"} current={limitInfo?.current ?? 0} max={limitInfo?.max ?? 3} currentTier={limitInfo?.currentTier ?? "starter"} nextTier={limitInfo?.nextTier ?? "pro"} orgId={currentOrg?.id ?? ""} />
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
              disabled={!prompt.trim() || submitting || teamLoading}
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
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} limitType={limitInfo?.limitType ?? "projects"} current={limitInfo?.current ?? 0} max={limitInfo?.max ?? 3} currentTier={limitInfo?.currentTier ?? "starter"} nextTier={limitInfo?.nextTier ?? "pro"} orgId={currentOrg?.id ?? ""} />
    </div>
  )
}

