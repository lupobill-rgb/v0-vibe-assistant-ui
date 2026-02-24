"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, ArrowRight, Loader2, Sparkles } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import {
  templates,
  categories,
  searchTemplates,
  getTemplatesByCategory,
  type Template,
  type TemplateCategory,
} from "@/lib/templates"
import { createProject, createJob } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function TemplatesPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "all">("all")
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let results: Template[]
    if (searchQuery.trim()) {
      results = searchTemplates(searchQuery)
    } else if (activeCategory === "all") {
      results = templates
    } else {
      results = getTemplatesByCategory(activeCategory)
    }
    return results
  }, [searchQuery, activeCategory])

  async function handleUseTemplate(template: Template) {
    if (loadingId) return
    setLoadingId(template.id)
    setError(null)

    try {
      const project = await createProject(`${template.id}-${Date.now()}`)
      const job = await createJob(template.prompt, project.id)
      router.push(`/building/${job.task_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start build")
      setLoadingId(null)
    }
  }

  return (
    <AppShell>
      <div className="min-h-screen">
        {/* Header */}
        <div className="px-8 pt-10 pb-2">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium uppercase tracking-widest text-primary">
                Template Library
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-3 text-balance">
              Start with a template
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-lg mx-auto">
              Pick a pre-built prompt template and launch a fully built landing page in minutes.
            </p>
          </div>

          {/* Search */}
          <div className="max-w-md mx-auto mb-6">
            <div className="flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-card">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (e.target.value.trim()) setActiveCategory("all")
                }}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <button
              onClick={() => {
                setActiveCategory("all")
                setSearchQuery("")
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                activeCategory === "all" && !searchQuery
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/50"
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  setSearchQuery("")
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  activeCategory === cat.id && !searchQuery
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/50"
                )}
              >
                <cat.icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-8 mb-4">
            <div className="max-w-2xl mx-auto px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground text-sm text-center">
              {error}
            </div>
          </div>
        )}

        {/* Template Grid */}
        <div className="px-8 pb-12">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                <Search className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">No templates found</h3>
              <p className="text-xs text-muted-foreground">
                Try a different search term or category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((template) => {
                const cat = categories.find((c) => c.id === template.category)
                const isLoading = loadingId === template.id
                return (
                  <div
                    key={template.id}
                    className="group relative bg-card rounded-xl border border-border overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 flex flex-col"
                  >
                    {/* Thumbnail area */}
                    <div className="relative h-36 bg-secondary overflow-hidden">
                      <img
                        src={template.thumbnail}
                        alt={`${template.name} preview`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card/60 via-transparent to-transparent" />
                      {/* Category badge */}
                      {cat && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border/50">
                          <cat.icon className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {cat.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-1 p-4">
                      <h3 className="text-sm font-semibold text-card-foreground mb-1">
                        {template.name}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3 flex-1">
                        {template.description}
                      </p>
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {template.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-medium text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {/* Use button */}
                      <button
                        onClick={() => handleUseTemplate(template)}
                        disabled={!!loadingId}
                        className={cn(
                          "flex items-center justify-center gap-2 w-full h-9 rounded-lg text-sm font-medium transition-all duration-200",
                          isLoading
                            ? "bg-primary/80 text-primary-foreground"
                            : "bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/20",
                          loadingId && !isLoading && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Starting build...</span>
                          </>
                        ) : (
                          <>
                            <span>Use Template</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
