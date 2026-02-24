"use client"

import { useState, useCallback } from "react"
import { Loader2 } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { HeroSection } from "@/components/dashboard/hero-section"
import { PromptCard } from "@/components/dashboard/prompt-card"
import { PreviewPanel } from "@/components/dashboard/preview-panel"
import { generateMultiPageSite, type MultiPageSite } from "@/lib/api"
import { toast } from "sonner"

type ViewState = "idle" | "loading" | "preview"

export default function HomePage() {
  const [viewState, setViewState] = useState<ViewState>("idle")
  const [generatedSite, setGeneratedSite] = useState<MultiPageSite | null>(null)
  const [originalPrompt, setOriginalPrompt] = useState<string>("")
  const [isRefining, setIsRefining] = useState(false)
  const [refinementHistory, setRefinementHistory] = useState<string[]>([])
  const [progressMessage, setProgressMessage] = useState<string>("")

  const handleGenerating = () => {
    setViewState("loading")
  }

  const handleGenerated = (site: MultiPageSite, prompt: string) => {
    setGeneratedSite(site)
    setOriginalPrompt(prompt)
    setViewState("preview")
    setProgressMessage("")
  }

  const handleError = () => {
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

  const handleRegenerate = useCallback(async () => {
    if (!originalPrompt) return
    setViewState("loading")
    setProgressMessage("Regenerating...")
    try {
      const site = await generateMultiPageSite(
        originalPrompt,
        (progress) => {
          setProgressMessage(
            `Generating page ${progress.index + 1} of ${progress.total}: ${progress.pageName.charAt(0).toUpperCase() + progress.pageName.slice(1)}...`,
          )
        },
      )
      const hasContent = Object.values(site.pages).some((html) => html.trim())
      if (!hasContent) {
        throw new Error("No HTML content was generated. Try a more specific prompt.")
      }
      setGeneratedSite(site)
      setRefinementHistory([])
      setViewState("preview")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong."
      toast.error("Regeneration failed", { description: message })
      setViewState("preview")
    } finally {
      setProgressMessage("")
    }
  }, [originalPrompt])

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
        {/* Left side: Prompt input */}
        <div
          className={
            viewState === "preview"
              ? "w-[420px] flex-shrink-0 overflow-y-auto border-r border-border"
              : "flex-1 overflow-y-auto"
          }
        >
          <div className="min-h-screen">
            <HeroSection />
            <PromptCard
              onGenerating={handleGenerating}
              onGenerated={handleGenerated}
              onError={handleError}
              onProgress={setProgressMessage}
              loading={viewState === "loading"}
            />
          </div>
        </div>

        {/* Right side: Loading or Preview */}
        {viewState === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center bg-card border-l border-border">
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
                  Our AI is crafting your multi-page website. This may take a minute for multiple pages.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}

        {viewState === "preview" && generatedSite && (
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
        )}
      </div>
    </AppShell>
  )
}
