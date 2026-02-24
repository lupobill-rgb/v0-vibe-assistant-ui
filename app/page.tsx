"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { HeroSection } from "@/components/dashboard/hero-section"
import { PromptCard } from "@/components/dashboard/prompt-card"
import { PreviewPanel } from "@/components/dashboard/preview-panel"

type ViewState = "idle" | "loading" | "preview"

export default function HomePage() {
  const [viewState, setViewState] = useState<ViewState>("idle")
  const [generatedHtml, setGeneratedHtml] = useState<string>("")

  const handleGenerating = () => {
    setViewState("loading")
  }

  const handleGenerated = (html: string) => {
    setGeneratedHtml(html)
    setViewState("preview")
  }

  const handleError = () => {
    setViewState("idle")
  }

  const handleReset = () => {
    setViewState("idle")
    setGeneratedHtml("")
  }

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
                  Generating your website...
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Our AI is crafting your landing page. This usually takes 15-30 seconds.
                </p>
              </div>
              {/* Animated dots */}
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {viewState === "preview" && generatedHtml && (
          <div className="flex-1 min-w-0">
            <PreviewPanel html={generatedHtml} onReset={handleReset} />
          </div>
        )}
      </div>
    </AppShell>
  )
}
