"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2, Globe, Zap, Layers, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { createProject, createJob } from "@/lib/api"

const REPOSITORY_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_REPOSITORY_URL) ||
  "https://github.com/UbiGrowth/VIBE"

const suggestions = [
  { icon: Globe, label: "Build a landing page" },
  { icon: Zap, label: "Create a REST API" },
  { icon: Layers, label: "Design a dashboard" },
  { icon: ImageIcon, label: "Generate a portfolio" },
]

export default function HomePage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!prompt.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const project = await createProject(`landing-${Date.now()}`, REPOSITORY_URL)
      if (project.error || !project.id) {
        setError(project.error ?? "Failed to create project")
        return
      }
      const result = await createJob({
        prompt: prompt.trim(),
        project_id: project.id,
        base_branch: "main",
      })
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.task_id) {
        router.push(`/building/${result.task_id}`)
      }
    } catch (err) {
      setError("Unable to connect. Please try again.")
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-3xl font-bold text-white tracking-tight">VIBE</span>
        </div>

        {/* Headings */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            What do you want to build?
          </h1>
          <p className="text-slate-400 text-lg">
            Describe your landing page idea
          </p>
        </div>

        {/* Prompt Input */}
        <div className="w-full bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden focus-within:border-violet-500 transition-colors shadow-xl">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Describe your landing page idea..."
            rows={5}
            disabled={submitting}
            className="w-full bg-transparent text-white placeholder:text-slate-500 text-base resize-none outline-none leading-relaxed px-5 pt-5 pb-3 disabled:opacity-60"
          />
          {error && (
            <p className="text-xs text-red-400 px-5 pb-2">{error}</p>
          )}
          <div className="flex items-center justify-between px-4 pb-4">
            <span className="text-xs text-slate-500 font-mono">
              {prompt.length > 0 ? `${prompt.length} chars` : "⌘↵ to submit"}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || submitting}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
                prompt.trim() && !submitting
                  ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
              )}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Build Landing Page
            </button>
          </div>
        </div>

        {/* Quick Template Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => setPrompt(s.label)}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-600 transition-all disabled:opacity-50"
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
