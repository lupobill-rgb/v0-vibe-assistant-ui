"use client"

import { useState, useCallback, useRef } from "react"
import { Loader2 } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { HeroSection } from "@/components/dashboard/hero-section"
import { PromptCard } from "@/components/dashboard/prompt-card"
import { PreviewPanel } from "@/components/dashboard/preview-panel"
import { BuildLog, type BuildStep } from "@/components/dashboard/build-log"
import { generateMultiPageSite, type MultiPageSite } from "@/lib/api"
import { toast } from "sonner"

type ViewState = "idle" | "loading" | "preview"

function makeTimestamp() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
}

export default function HomePage() {
  const [viewState, setViewState] = useState<ViewState>("idle")
  const [generatedSite, setGeneratedSite] = useState<MultiPageSite | null>(null)
  const [originalPrompt, setOriginalPrompt] = useState<string>("")
  const [isRefining, setIsRefining] = useState(false)
  const [refinementHistory, setRefinementHistory] = useState<string[]>([])
  const [progressMessage, setProgressMessage] = useState<string>("")
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([])
  const stepCounterRef = useRef(0)

  const addStep = useCallback(
    (label: string, status: BuildStep["status"] = "active", files?: string[]) => {
      const id = `step-${++stepCounterRef.current}`
      setBuildSteps((prev) => {
        // Mark any current "active" step as "done"
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
    addStep("Analyzing your prompt...")
  }

  const handleGenerated = (site: MultiPageSite, prompt: string) => {
    // Mark all remaining active steps as done
    setBuildSteps((prev) =>
      prev.map((s) =>
        s.status === "active" ? { ...s, status: "done" as const } : s,
      ),
    )
    // Add completion step
    addStep("Build complete!", "done")
    setGeneratedSite(site)
    setOriginalPrompt(prompt)
    setViewState("preview")
    setProgressMessage("")
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
  }

  const handleBuildProgress = useCallback(
    (message: string) => {
      setProgressMessage(message)

      // Handle "Planning site structure..." message
      if (message.toLowerCase().includes("planning site structure")) {
        addStep("Planning site structure...")
        return
      }

      // Handle page-level tracking
      const pageMatch = message.match(/page (\d+) of (\d+): (\w[\w\s-]*)\.\.\.$/i)
      if (pageMatch) {
        const pageName = pageMatch[3].trim()
        addStep(`Generating ${pageName}...`, "active", [`${pageName.toLowerCase().replace(/\s+/g, "-")}.html`])
        return
      }

      // Handle completed pages
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

    // Simulate "planning" delay then advance
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
  }, [originalPrompt, addStep, handleBuildProgress])

  const handleRefine = useCallback(
    async (refinement: string) => {
      if (!generatedSite) return
      setIsRefining(true)
      try {
        // Re-generate all pages with the refinement applied
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
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong."
        toast.error("Refinement failed", { description: message })
      } finally {
        setIsRefining(false)
        setProgressMessage("")
      }
    },
    [generatedSite, originalPrompt],
  )

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
