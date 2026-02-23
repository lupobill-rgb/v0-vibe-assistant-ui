"use client"

import { AppShell } from "@/components/app-shell"
import { HeroSection } from "@/components/dashboard/hero-section"
import { PromptCard } from "@/components/dashboard/prompt-card"

export default function HomePage() {
  return (
    <AppShell>
      <div className="min-h-screen">
        <HeroSection />
        <PromptCard />
      </div>
    </AppShell>
  )
}
