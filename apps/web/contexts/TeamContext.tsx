"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"

export interface Team {
  id: string
  name: string
  org_name?: string | null
}

export interface TeamContextValue {
  currentTeam: Team | null
  userRole: string | null
  allTeams: Team[]
  setCurrentTeam: (team: Team) => void
  loading: boolean
}

const TeamContext = createContext<TeamContextValue>({
  currentTeam: null,
  userRole: null,
  allTeams: [],
  setCurrentTeam: () => {},
  loading: true,
})

export function useTeam() {
  return useContext(TeamContext)
}

const STORAGE_KEY = "vibe_active_team"

export function TeamProvider({ children }: { children: ReactNode }) {
  const [currentTeam, setCurrentTeamState] = useState<Team | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  const setCurrentTeam = useCallback((team: Team) => {
    setCurrentTeamState(team)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(team))
    // Fetch role for newly selected team
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase
        .from("team_members")
        .select("role")
        .eq("team_id", team.id)
        .eq("user_id", data.user.id)
        .single()
        .then(({ data: member }) => {
          setUserRole(member?.role ?? "ic")
        })
    })
  }, [])

  useEffect(() => {
    async function loadTeams() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Fetch all teams the user belongs to
      const { data: memberships } = await supabase
        .from("team_members")
        .select("team_id, role, teams(id, name, org_name)")
        .eq("user_id", user.id)

      if (!memberships || memberships.length === 0) {
        setLoading(false)
        return
      }

      const teams: Team[] = memberships.map((m: any) => ({
        id: m.teams.id,
        name: m.teams.name,
        org_name: m.teams.org_name ?? null,
      }))
      setAllTeams(teams)

      // Restore from localStorage or use first team
      const stored = localStorage.getItem(STORAGE_KEY)
      let active: Team | null = null
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          active = teams.find((t) => t.id === parsed.id) ?? null
        } catch {}
      }
      if (!active) active = teams[0]

      setCurrentTeamState(active)

      // Set role for active team
      const membership = memberships.find(
        (m: any) => m.teams.id === active!.id
      )
      setUserRole(membership?.role ?? "ic")

      setLoading(false)
    }

    loadTeams()
  }, [])

  return (
    <TeamContext.Provider
      value={{ currentTeam, userRole, allTeams, setCurrentTeam, loading }}
    >
      {children}
    </TeamContext.Provider>
  )
}
