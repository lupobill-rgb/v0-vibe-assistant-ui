"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { useTeam } from "@/contexts/TeamContext"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentOrg, currentTeam, userRole, availableTeams, switchTeam, loading } = useTeam()

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
