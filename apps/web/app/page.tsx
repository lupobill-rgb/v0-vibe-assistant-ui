"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { useTeam } from "@/contexts/TeamContext"
import { supabase } from "@/lib/supabase"
import { HeroSection } from "@/components/dashboard/hero-section"
import { RecommendationBanner } from "@/components/dashboard/recommendation-banner"
import { PromptCard } from "@/components/dashboard/prompt-card"
import { ProjectsGrid } from "@/components/dashboard/projects-grid"

export default function HomePage() {
  const { currentOrg, currentTeam } = useTeam()
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!currentOrg?.id) return
    const check = async () => {
      try {
        const { data } = await supabase
          .from("org_feature_flags")
          .select("stage")
          .eq("organization_id", currentOrg.id)
          .single()
        if (data?.stage === "onboarding") {
          // Only redirect if an onboarding session actually exists,
          // otherwise the user hits a dead-end "No Onboarding Session" page
          const { data: session } = await supabase
            .from("onboarding_sessions")
            .select("id")
            .eq("organization_id", currentOrg.id)
            .limit(1)
            .single()
          if (session) {
            router.replace("/onboarding")
          } else {
            setChecked(true)
          }
        } else {
          setChecked(true)
        }
      } catch {
        setChecked(true)
      }
    }
    check()
  }, [currentOrg?.id, router])

  if (!checked) return <AppShell><div className="min-h-screen" /></AppShell>

  return (
    <AppShell>
      <div className="min-h-screen">
        <HeroSection />
        {currentTeam?.id && currentOrg?.id && (
          <div className="px-6 pt-4 mb-10"><RecommendationBanner teamId={currentTeam.id} orgId={currentOrg.id} context="home" /></div>
        )}
        <PromptCard />
        <ProjectsGrid />
      </div>
    </AppShell>
  )
}
