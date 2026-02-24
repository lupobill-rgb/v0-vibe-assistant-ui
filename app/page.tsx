"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Check, FolderKanban, Clock, FileText, ArrowRight } from "lucide-react"
import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { HeroSection } from "@/components/dashboard/hero-section"
import { PromptCard } from "@/components/dashboard/prompt-card"
import { PreviewPanel } from "@/components/dashboard/preview-panel"
import { BuildLog, type BuildStep } from "@/components/dashboard/build-log"
import { generateMultiPageSite, type MultiPageSite } from "@/lib/api"
import {
  saveProject,
  updateProject,
  getProject,
  getRecentProjects,
  deriveProjectName,
  type SavedProject,
} from "@/lib/projects-store"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ViewState = "idle" | "loading" | "preview"

function makeTimestamp() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
}

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [viewState, setViewState] = useState<ViewState>("idle")
  const [generatedSite, setGeneratedSite] = useState<MultiPageSite | null>(null)
  const [originalPrompt, setOriginalPrompt] = useState<string>("")
  const [isRefining, setIsRefining] = useState(false)
  const [refinementHistory, setRefinementHistory] = useState<string[]>([])
  const [progressMessage, setProgressMessage] = useState<string>("")
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([])
  const stepCounterRef = useRef(0)

  // Project persistence state
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string>("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [recentProjects, setRecentProjects] = useState<SavedProject[]>([])
  const [isEditingName, setIsEditingName] = useState(false)

  // Load recent projects on mount
  useEffect(() => {
    setRecentProjects(getRecentProjects(3))
  }, [])

  // Load project from query param
  useEffect(() => {
    const projectId = searchParams.get("project")
    if (projectId) {
      const saved = getProject(projectId)
      if (saved) {
        setCurrentProjectId(saved.id)
        setProjectName(saved.name)
        setOriginalPrompt(saved.prompt)
        setGeneratedSite({ pages: saved.pages, pageOrder: saved.pageOrder })
        setViewState("preview")
        setBuildSteps([
          {
            id: "restored",
            label: "Project restored from saved state",
            status: "done",
            timestamp: makeTimestamp(),
          },
        ])
      }
    }
  }, [searchParams])

  // Auto-save helper
  const autoSave = useCallback(
    (site: MultiPageSite, prompt: string, name?: string) => {
      setSaveStatus("saving")
      try {
        if (currentProjectId) {
          updateProject(currentProjectId, {
            pages: site.pages,
            pageOrder: site.pageOrder,
            prompt,
            ...(name ? { name } : {}),
          })
        } else {
          const derivedName = name || deriveProjectName(prompt)
          const saved = saveProject(derivedName, prompt, site)
          setCurrentProjectId(saved.id)
          setProjectName(saved.name)
        }
        setSaveStatus("saved")
        setTimeout(() => setSaveStatus("idle"), 2000)
        setRecentProjects(getRecentProjects(3))
      } catch {
        setSaveStatus("idle")
      }
    },
    [currentProjectId],
  )

  const addStep = useCallback(
    (label: string, status: BuildStep["status"] = "active", files?: string[]) => {
      const id = `step-${++stepCounterRef.current}`
      setBuildSteps((prev) => {
        const updated = prev.map((s) =>
          s.status === "active" ? { ...s, status: "done" as const, timestamp: s.timestamp } : s,
        )
        return [
          ...updated,
          { id, label, status, files, timestamp: makeTimestamp() },
        ]
      })
      return id
    },
    [],
  )

  const handleGenerating = () => {
    stepCounterRef.current = 0
    setBuildSteps([])
    setViewState("loading")
    setCurrentProjectId(null)
    setProjectName("")
    setSaveStatus("idle")
    addStep("Analyzing your prompt...")
  }

  const handleGenerated = (site: MultiPageSite, prompt: string) => {
    setBuildSteps((prev) =>
      prev.map((s) =>
        s.status === "active" ? { ...s, status: "done" as const } : s,
      ),
    )
    addStep("Build complete!", "done")
    setGeneratedSite(site)
    setOriginalPrompt(prompt)
    setViewState("preview")
    setProgressMessage("")

    // Auto-save the project
    const name = deriveProjectName(prompt)
    setProjectName(name)
    autoSave(site, prompt, name)
  }

  const handleError = () => {
    setBuildSteps((prev) =>
      prev.map((s) =>
        s.status === "active" ? { ...s, status: "failed" as const } : s,
      ),
    )
    setViewState("idle")
    setProgressMessage("")
  }

  const handleReset = () => {
    setViewState("idle")
    setGeneratedSite(null)
    setOriginalPrompt("")
    setRefinementHistory([])
    setProgressMessage("")
    setCurrentProjectId(null)
    setProjectName("")
    setSaveStatus("idle")
    // Refresh recents
    setRecentProjects(getRecentProjects(3))
    // Clear project query param
    router.replace("/", { scroll: false })
  }

  const handleBuildProgress = useCallback(
    (message: string) => {
      setProgressMessage(message)

      if (message.toLowerCase().includes("planning site structure")) {
        addStep("Planning site structure...")
        return
      }

      const pageMatch = message.match(/page (\d+) of (\d+): (\w[\w\s-]*)\.\.\.$/i)
      if (pageMatch) {
        const pageName = pageMatch[3].trim()
        addStep(`Generating ${pageName}...`, "active", [
          `${pageName.toLowerCase().replace(/\s+/g, "-")}.html`,
        ])
        return
      }

      if (message.toLowerCase().includes("completed")) {
        addStep("Building preview...")
      }
    },
    [addStep],
  )

  const handleRegenerate = useCallback(async () => {
    if (!originalPrompt) return
    stepCounterRef.current = 0
    setBuildSteps([])
    setViewState("loading")
    setProgressMessage("Regenerating...")
    addStep("Analyzing your prompt...")

    setTimeout(() => {
      addStep("Planning site structure...")
    }, 1500)

    try {
      const site = await generateMultiPageSite(
        originalPrompt,
        (progress) => {
          const msg = `Generating page ${progress.index + 1} of ${progress.total}: ${progress.pageName.charAt(0).toUpperCase() + progress.pageName.slice(1)}...`
          handleBuildProgress(msg)
        },
      )
      const hasContent = Object.values(site.pages).some((html) => html.trim())
      if (!hasContent) {
        throw new Error("No HTML content was generated. Try a more specific prompt.")
      }
      setBuildSteps((prev) =>
        prev.map((s) => (s.status === "active" ? { ...s, status: "done" as const } : s)),
      )
      addStep("Build complete!", "done")
      setGeneratedSite(site)
      setRefinementHistory([])
      setViewState("preview")

      // Auto-save
      autoSave(site, originalPrompt)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong."
      toast.error("Regeneration failed", { description: message })
      setBuildSteps((prev) =>
        prev.map((s) => (s.status === "active" ? { ...s, status: "failed" as const } : s)),
      )
      setViewState("preview")
    } finally {
      setProgressMessage("")
    }
  }, [originalPrompt, addStep, handleBuildProgress, autoSave])

  const handleRefine = useCallback(
    async (refinement: string) => {
      if (!generatedSite) return
      setIsRefining(true)
      try {
        const site = await generateMultiPageSite(
          originalPrompt +
            "\n\nAdditional refinement: " +
            refinement +
            "\n\nKeep all existing sections and styling, only apply the requested change.",
          (progress) => {
            setProgressMessage(
              `Refining page ${progress.index + 1} of ${progress.total}: ${progress.pageName.charAt(0).toUpperCase() + progress.pageName.slice(1)}...`,
            )
          },
        )
        const hasContent = Object.values(site.pages).some((html) => html.trim())
        if (!hasContent) {
          throw new Error("Refinement produced no HTML. Try different instructions.")
        }
        setGeneratedSite(site)
        setRefinementHistory((prev) => [...prev, refinement])

        // Auto-save after refinement
        autoSave(site, originalPrompt)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong."
        toast.error("Refinement failed", { description: message })
      } finally {
        setIsRefining(false)
        setProgressMessage("")
      }
    },
    [generatedSite, originalPrompt, autoSave],
  )

  const handleProjectNameChange = (newName: string) => {
    setProjectName(newName)
    if (currentProjectId && newName.trim()) {
      updateProject(currentProjectId, { name: newName.trim() })
      setRecentProjects(getRecentProjects(3))
    }
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <AppShell>
      <div className="flex flex-1 min-h-0 h-full">
        {/* Left side: Prompt input (idle) or BuildLog (loading/preview) */}
        {viewState === "idle" && (
          <div className="flex-1 overflow-y-auto">
            <div className="min-h-screen">
              <HeroSection />
              <PromptCard
                onGenerating={handleGenerating}
                onGenerated={handleGenerated}
                onError={handleError}
                onProgress={handleBuildProgress}
                loading={false}
              />

              {/* Recent Projects Section */}
              {recentProjects.length > 0 && (
                <div className="px-6 mt-10 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-foreground">
                      Recent Projects
                    </h2>
                    <Link
                      href="/projects"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      View all
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {recentProjects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/?project=${project.id}`}
                        className="group flex flex-col p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-200 hover:shadow-md hover:shadow-primary/5"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FolderKanban className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <h3 className="text-sm font-medium text-card-foreground truncate">
                            {project.name}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-3">
                          {project.prompt}
                        </p>
                        <div className="flex items-center gap-3 mt-auto">
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <FileText className="w-3 h-3" />
                            {project.pageOrder.length} page
                            {project.pageOrder.length !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {timeAgo(project.lastModified)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {viewState === "loading" && (
          <>
            {/* Prompt card (narrowed) */}
            <div className="w-[420px] flex-shrink-0 overflow-y-auto border-r border-border">
              <div className="min-h-screen">
                <HeroSection />
                <PromptCard
                  onGenerating={handleGenerating}
                  onGenerated={handleGenerated}
                  onError={handleError}
                  onProgress={handleBuildProgress}
                  loading={true}
                />
              </div>
            </div>

            {/* Build Log panel */}
            <div className="w-[300px] flex-shrink-0 border-r border-border flex flex-col">
              <BuildLog steps={buildSteps} />
            </div>

            {/* Preview placeholder */}
            <div className="flex-1 flex flex-col items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <div className="absolute -inset-2 rounded-3xl bg-primary/5 animate-pulse" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    {progressMessage || "Generating your website..."}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    Your preview will appear here once the build is ready.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {viewState === "preview" && generatedSite && (
          <>
            {/* Build Log with follow-up input */}
            <div className="w-[300px] flex-shrink-0 border-r border-border flex flex-col">
              {/* Project name header + save status */}
              <div className="px-4 py-3 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-primary flex-shrink-0" />
                  {isEditingName ? (
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      onBlur={() => {
                        setIsEditingName(false)
                        handleProjectNameChange(projectName)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setIsEditingName(false)
                          handleProjectNameChange(projectName)
                        }
                      }}
                      autoFocus
                      className="flex-1 text-sm font-semibold text-foreground bg-transparent outline-none border-b border-primary/40"
                    />
                  ) : (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="flex-1 text-left text-sm font-semibold text-foreground truncate hover:text-primary transition-colors"
                      title="Click to rename"
                    >
                      {projectName || "Untitled Project"}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 ml-6">
                  {saveStatus === "saving" && (
                    <>
                      <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                      <span className="text-[10px] text-muted-foreground">Saving...</span>
                    </>
                  )}
                  {saveStatus === "saved" && (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] text-emerald-500">Auto-saved</span>
                    </>
                  )}
                  {saveStatus === "idle" && currentProjectId && (
                    <>
                      <Check className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Saved</span>
                    </>
                  )}
                </div>
              </div>

              <BuildLog
                steps={buildSteps}
                onFollowUp={handleRefine}
                isRefining={isRefining}
              />
            </div>

            {/* Preview panel */}
            <div className="flex-1 min-w-0">
              <PreviewPanel
                site={generatedSite}
                onReset={handleReset}
                onRegenerate={handleRegenerate}
                onRefine={handleRefine}
                isRefining={isRefining}
                refinementHistory={refinementHistory}
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
