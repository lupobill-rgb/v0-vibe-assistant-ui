"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowUp, Paperclip, Globe, Zap, Layers, Image as ImageIcon, Loader2, CheckCircle2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { createProject, createJob, API_URL } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { useTeam } from "@/contexts/TeamContext"

const suggestions = [
  { icon: Globe, label: "Build a landing page" },
  { icon: Zap, label: "Create a REST API" },
  { icon: Layers, label: "Design a dashboard" },
  { icon: ImageIcon, label: "Generate a portfolio" },
]

export function PromptCard({ selectedProjectId }: { selectedProjectId?: string }) {
  const router = useRouter()
  const { currentTeam } = useTeam()
  const [prompt, setPrompt] = useState("")
  const [focused, setFocused] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<{
    status: "idle" | "uploading" | "done" | "error"
    progress: number
    message: string
    uploadId?: string
  }>({ status: "idle", progress: 0, message: "" })

  const handleAttach = () => {
    fileInputRef.current?.click()
  }

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

    // Attach user_id for auth (matches createJob pattern)
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) formData.append("user_id", user.id)

    try {
      const xhr = new XMLHttpRequest()
      const result = await new Promise<{ rows: number }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100)
            setUploadState((s) => ({ ...s, progress: pct, message: `Uploading ${file.name}... ${pct}%` }))
          }
        })
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText))
            } catch {
              reject(new Error("Invalid response from server"))
            }
          } else {
            try {
              const body = JSON.parse(xhr.responseText)
              reject(new Error(body.error || `Upload failed (${xhr.status})`))
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`))
            }
          }
        })
        xhr.addEventListener("error", () => reject(new Error("Network error during upload")))
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")))
        xhr.open("POST", `${API_URL}/upload`)
        xhr.send(formData)
      })
      const rowCount = result.row_count ?? result.rows ?? 0
      setUploadState({
        status: "done",
        progress: 100,
        message: `✓ ${file.name} ready — ${rowCount.toLocaleString()} rows loaded. Now describe the dashboard you want.`,
        uploadId: result.upload_id,
      })
    } catch (err) {
      setUploadState({
        status: "error",
        progress: 0,
        message: err instanceof Error ? err.message : "Upload failed",
      })
    }
  }

  const handleSubmit = async () => {
    if (!prompt.trim() || submitting) return
    setSubmitting(true)
    setError(null)

    try {
      let projectId = selectedProjectId

      if (!projectId) {
        const project = await createProject(prompt.trim().slice(0, 60), undefined, currentTeam?.id)
        if (project.error || !project.id) {
          throw new Error(project.error || "Failed to create project")
        }
        projectId = project.id
      }

      const result = await createJob({
        prompt: prompt.trim(),
        project_id: projectId,
        base_branch: "main",
        upload_id: uploadState.uploadId,
      })

      if (result.error || !result.task_id) {
        throw new Error(result.error || "Failed to create job")
      }

      router.push(`/building/${result.task_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start build")
      console.error(err)
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="px-6 -mt-8 relative z-10">
      <div
        className={cn(
          "bg-card rounded-3xl border border-border shadow-2xl shadow-black/20 transition-all duration-300",
          focused && "border-primary/40 shadow-primary/5"
        )}
      >
        <div className="p-6">
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
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-base resize-none outline-none leading-relaxed disabled:opacity-60"
            />
          </div>
          {error && (
            <p className="text-xs text-red-400 mt-1 mb-2">{error}</p>
          )}
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
          <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={handleAttach}
                disabled={uploadState.status === "uploading"}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                <Paperclip className="w-3.5 h-3.5" />
                Attach
              </button>
              <div className="w-px h-4 bg-border" />
              <span className="text-[10px] text-muted-foreground font-mono">
                {prompt.length > 0 ? `${prompt.length} chars` : "\u2318\u21b5 to submit"}
              </span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || submitting}
              className={cn(
                "flex items-center justify-center gap-2 px-4 h-9 rounded-xl text-sm font-medium transition-all duration-200",
                prompt.trim() && !submitting
                  ? "bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white shadow-lg shadow-[#A855F7]/20 hover:opacity-90"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
              Build Project
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => setPrompt(s.label)}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/60 border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border transition-all duration-200 disabled:opacity-50"
          >
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
