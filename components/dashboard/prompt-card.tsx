"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowUp, ArrowRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createProject, createJob } from "@/lib/api"
import { categories, templates, type TemplateCategory } from "@/lib/templates"

// Show 2 featured templates per category on the homepage
const featuredCategories: TemplateCategory[] = ["saas", "startup", "portfolio", "ecommerce"]

export function PromptCard() {
  const router = useRouter()
  const [prompt, setPrompt] = useState("")
  const [focused, setFocused] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TemplateCategory>(featuredCategories[0])

  useEffect(() => {
    setMounted(true)
  }, [])

  const tabTemplates = templates
    .filter((t) => t.category === activeTab)
    .slice(0, 3)

  async function handleSubmit() {
    if (!prompt.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      const project = await createProject(`landing-${Date.now()}`)
      const job = await createJob(prompt.trim(), project.id)
      router.push(`/building/${job.task_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
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
          {/* Text Input */}
          <div className="relative min-h-[4.5rem]">
            {mounted && (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your landing page idea..."
                rows={3}
                disabled={loading}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-base resize-none outline-none leading-relaxed disabled:opacity-50"
              />
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground text-xs">
              {error}
            </div>
          )}

          {/* Bottom Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-mono">
                {prompt.length > 0 ? `${prompt.length} chars` : "Cmd+Enter to submit"}
              </span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || loading}
              className={cn(
                "flex items-center justify-center gap-2 h-9 rounded-xl transition-all duration-200",
                prompt.trim() && !loading
                  ? "bg-primary text-primary-foreground px-4 shadow-lg shadow-primary/20 hover:opacity-90"
                  : "bg-secondary text-muted-foreground w-9"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Building...</span>
                </>
              ) : prompt.trim() ? (
                <>
                  <ArrowUp className="w-4 h-4" />
                  <span className="text-sm font-medium">Build Landing Page</span>
                </>
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Template Suggestions */}
      <div className="mt-6">
        {/* Category Tabs */}
        <div className="flex items-center justify-center gap-2 mb-3">
          {featuredCategories.map((catId) => {
            const cat = categories.find((c) => c.id === catId)
            if (!cat) return null
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                  activeTab === cat.id
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent"
                )}
              >
                <cat.icon className="w-3 h-3" />
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Template Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {tabTemplates.map((t) => (
            <button
              key={t.id}
              onClick={() => setPrompt(t.prompt)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/60 border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none max-w-xs text-left"
            >
              <span className="truncate">{t.name}</span>
            </button>
          ))}
        </div>

        {/* Browse all link */}
        <div className="flex justify-center mt-3">
          <Link
            href="/templates"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Browse all templates
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
