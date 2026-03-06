"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { useTeam } from "@/contexts/TeamContext"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentTeam, userRole, allTeams, setCurrentTeam, loading } = useTeam()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        currentTeam={currentTeam}
        userRole={userRole}
        allTeams={allTeams}
        onTeamChange={setCurrentTeam}
        teamLoading={loading}
      />
      <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
    </div>
  )
}
