"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { useTeam } from "@/contexts/TeamContext"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentOrg, currentTeam, userRole, availableTeams, switchTeam, loading } = useTeam()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        currentOrg={currentOrg}
        currentTeam={currentTeam}
        userRole={userRole}
        availableTeams={availableTeams}
        onTeamChange={switchTeam}
        teamLoading={loading}
      />
      <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
    </div>
  )
}
