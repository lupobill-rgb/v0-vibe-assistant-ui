"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { AppSidebar } from "@/components/app-sidebar"
import { useTeam } from "@/contexts/TeamContext"

const TIER_NAMES: Record<string, string> = {
  pro: "Pro",
  growth: "Growth",
  team: "Team",
  enterprise: "Enterprise",
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentOrg, currentTeam, userRole, availableTeams, switchTeam, loading } = useTeam()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      const tier = searchParams.get("tier") ?? ""
      const tierName = TIER_NAMES[tier] || tier || "your new plan"
      toast.success(`Welcome to UbiVibe ${tierName}! Your limits have been upgraded.`)
      // Clean up the URL
      const url = new URL(window.location.href)
      url.searchParams.delete("checkout")
      url.searchParams.delete("tier")
      router.replace(url.pathname + url.search)
    }
  }, [searchParams, router])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:flex md:flex-shrink-0">
        <AppSidebar
          currentOrg={currentOrg}
          currentTeam={currentTeam}
          userRole={userRole}
          availableTeams={availableTeams}
          onTeamChange={switchTeam}
          teamLoading={loading}
        />
      </div>
      <main className="flex-1 overflow-y-auto min-h-0 w-full">{children}</main>
    </div>
  )
}
