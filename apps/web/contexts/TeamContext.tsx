"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"

type UserRole = "IC" | "Lead" | "Manager" | "Director" | "Executive" | "Admin" | null

export interface Org {
  id: string
  name: string
}

export interface Team {
  id: string
  name: string
  slug: string
}

export interface TeamContextValue {
  currentOrg: Org | null
  currentTeam: Team | null
  userRole: UserRole
  availableTeams: Team[]
  switchTeam: (teamId: string) => Promise<void>
  loading: boolean
}

const TeamContext = createContext<TeamContextValue>({
  currentOrg: null,
  currentTeam: null,
  userRole: null,
  availableTeams: [],
  switchTeam: async () => {},
  loading: true,
})

export function useTeam() {
  return useContext(TeamContext)
}

const STORAGE_KEY = "vibe_active_team"

function normalizeRole(raw: string | null | undefined): UserRole {
  if (!raw) return null
  const map: Record<string, UserRole> = {
    ic: "IC",
    lead: "Lead",
    manager: "Manager",
    director: "Director",
    executive: "Executive",
    admin: "Admin",
  }
  return map[raw.toLowerCase()] ?? "IC"
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const [currentOrg, setCurrentOrg] = useState<Org | null>(null)
  const [currentTeam, setCurrentTeamState] = useState<Team | null>(null)
  const [userRole, setUserRole] = useState<UserRole>(null)
  const [availableTeams, setAvailableTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  const switchTeam = useCallback(async (teamId: string) => {
    const target = availableTeams.find((t) => t.id === teamId)
    if (!target) return
    setCurrentTeamState(target)
    localStorage.setItem(STORAGE_KEY, teamId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single()
    setUserRole(normalizeRole(member?.role))
  }, [availableTeams])

  useEffect(() => {
    async function loadTeams() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // Step 1: Get team memberships (simple query, no FK join)
        const { data: memberships, error: memberError } = await supabase
          .from("team_members")
          .select("team_id, role")
          .eq("user_id", user.id)

        if (memberError || !memberships || memberships.length === 0) {
          console.warn("[TeamContext] No memberships found:", memberError?.message)
          setLoading(false)
          return
        }

        // Step 2: Fetch teams by IDs
        const teamIds = memberships.map((m: any) => m.team_id)
        const { data: teamsData, error: teamsError } = await supabase
          .from("teams")
          .select("id, name, slug, org_id")
          .in("id", teamIds)

        if (teamsError || !teamsData || teamsData.length === 0) {
          console.warn("[TeamContext] Failed to fetch teams:", teamsError?.message)
          setLoading(false)
          return
        }

        const teams: Team[] = teamsData.map((t: any) => ({
          id: t.id,
          name: t.name,
          slug: t.slug ?? t.name.toLowerCase().replace(/\s+/g, "-"),
        }))
        setAvailableTeams(teams)

        // Step 3: Fetch org from first team's org_id
        const orgId = teamsData[0]?.org_id
        if (orgId) {
          const { data: orgData } = await supabase
            .from("organizations")
            .select("id, name")
            .eq("id", orgId)
            .single()
          if (orgData) {
            setCurrentOrg({ id: orgData.id, name: orgData.name })
          }
        }

        // Restore from localStorage or use first team
        const storedId = localStorage.getItem(STORAGE_KEY)
        let active: Team | null = null
        if (storedId) {
          active = teams.find((t) => t.id === storedId) ?? null
        }
        if (!active) active = teams[0]

        setCurrentTeamState(active)

        // Set role for active team
        const membership = memberships.find((m: any) => m.team_id === active!.id)
        setUserRole(normalizeRole(membership?.role))
      } catch (err) {
        console.error("[TeamContext] loadTeams failed:", err)
      } finally {
        setLoading(false)
      }
    }

    loadTeams()
  }, [])

  return (
    <TeamContext.Provider
      value={{ currentOrg, currentTeam, userRole, availableTeams, switchTeam, loading }}
    >
      {children}
    </TeamContext.Provider>
  )
}
