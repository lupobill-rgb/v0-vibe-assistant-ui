"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import {
  Users,
  TrendingUp,
  Megaphone,
  DollarSign,
  UserCheck,
  Settings,
  Package,
  Code,
  Headphones,
  Database,
  Palette,
  Scale,
  Crown,
  Plus,
  Loader2,
  X,
} from "lucide-react"

const TEAM_ROLES = ["IC", "Lead", "Manager", "Director", "Executive", "Admin"] as const
type TeamRole = (typeof TEAM_ROLES)[number]

const TEAM_FUNCTIONS = [
  "Sales",
  "Marketing",
  "Finance",
  "HR",
  "Operations",
  "Product",
  "Engineering",
  "Support",
  "Data",
  "Design",
  "Legal",
  "Executive",
] as const

type TeamFunction = (typeof TEAM_FUNCTIONS)[number]

const FUNCTION_ICONS: Record<TeamFunction, React.ElementType> = {
  Sales: TrendingUp,
  Marketing: Megaphone,
  Finance: DollarSign,
  HR: UserCheck,
  Operations: Settings,
  Product: Package,
  Engineering: Code,
  Support: Headphones,
  Data: Database,
  Design: Palette,
  Legal: Scale,
  Executive: Crown,
}

const FUNCTION_COLORS: Record<TeamFunction, string> = {
  Sales: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
  Marketing: "from-pink-500/20 to-pink-500/5 border-pink-500/30",
  Finance: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
  HR: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
  Operations: "from-slate-400/20 to-slate-400/5 border-slate-400/30",
  Product: "from-violet-500/20 to-violet-500/5 border-violet-500/30",
  Engineering: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",
  Support: "from-orange-500/20 to-orange-500/5 border-orange-500/30",
  Data: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/30",
  Design: "from-fuchsia-500/20 to-fuchsia-500/5 border-fuchsia-500/30",
  Legal: "from-stone-400/20 to-stone-400/5 border-stone-400/30",
  Executive: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
}

function getFunctionIcon(fn: string | null | undefined): React.ElementType {
  if (!fn) return Users
  return FUNCTION_ICONS[fn as TeamFunction] ?? Users
}

function getFunctionColor(fn: string | null | undefined): string {
  if (!fn) return "from-slate-500/20 to-slate-500/5 border-slate-500/30"
  return FUNCTION_COLORS[fn as TeamFunction] ?? "from-slate-500/20 to-slate-500/5 border-slate-500/30"
}

type OrgTeam = {
  id: string
  name: string
  slug: string
  function: string | null
  member_count: number
}

export default function SelectTeamPage() {
  const router = useRouter()
  const [orgName, setOrgName] = useState("")
  const [orgId, setOrgId] = useState<string | null>(null)
  const [teams, setTeams] = useState<OrgTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [rolePickTeam, setRolePickTeam] = useState<OrgTeam | null>(null)
  const [selectedRole, setSelectedRole] = useState<TeamRole>("IC")

  // Create team form state
  const [showCreate, setShowCreate] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamFunction, setNewTeamFunction] = useState<TeamFunction>("Product")
  const [creating, setCreating] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.replace("/login")
      const userId = auth.user.id

      // Check if user is already on any team
      const { data: existingMemberships } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", userId)

      if (existingMemberships && existingMemberships.length > 0) {
        // Already on a team — go home
        localStorage.setItem("vibe_active_team", existingMemberships[0].team_id)
        return router.replace("/")
      }

      // Get user's org from org_members
      const { data: orgMembership, error: orgErr } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", userId)
        .limit(1)
        .single()

      if (orgErr || !orgMembership) {
        setError("You are not part of any organization. Please contact your admin.")
        setLoading(false)
        return
      }

      const userOrgId = orgMembership.org_id
      setOrgId(userOrgId)

      // Get org name
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", userOrgId)
        .single()

      setOrgName(org?.name ?? "your organization")

      // Get all teams for this org
      const { data: orgTeams, error: teamsErr } = await supabase
        .from("teams")
        .select("id, name, slug, function")
        .eq("org_id", userOrgId)
        .order("name")

      if (teamsErr) throw teamsErr

      if (!orgTeams || orgTeams.length === 0) {
        // No teams exist — show create form
        setShowCreate(true)
        setLoading(false)
        return
      }

      // Get member counts per team
      const teamIds = orgTeams.map((t) => t.id)
      const { data: allMembers } = await supabase
        .from("team_members")
        .select("team_id")
        .in("team_id", teamIds)

      const countMap: Record<string, number> = {}
      for (const m of allMembers ?? []) {
        countMap[m.team_id] = (countMap[m.team_id] ?? 0) + 1
      }

      const enriched: OrgTeam[] = orgTeams.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        function: t.function ?? null,
        member_count: countMap[t.id] ?? 0,
      }))

      setTeams(enriched)
    } catch {
      setError("Failed to load team data. Please refresh and try again.")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openRolePicker = (team: OrgTeam) => {
    setSelectedRole("IC")
    setRolePickTeam(team)
  }

  const confirmJoin = async () => {
    if (!rolePickTeam) return
    const team = rolePickTeam
    setRolePickTeam(null)
    setJoining(team.id)
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.replace("/login")

      const { error: insertErr } = await supabase
        .from("team_members")
        .insert({
          team_id: team.id,
          user_id: auth.user.id,
          role: selectedRole,
        })

      if (insertErr) throw insertErr

      document.cookie = "vibe_has_team=1; path=/; max-age=3600; samesite=lax"
      localStorage.setItem("vibe_active_team", team.id)
      router.replace("/")
    } catch {
      setError(`Failed to join ${team.name}. Please try again.`)
      setJoining(null)
    }
  }

  const createTeam = async () => {
    if (!newTeamName.trim() || !orgId) return
    setCreating(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.replace("/login")

      const slug = newTeamName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")

      const { data: newTeam, error: createErr } = await supabase
        .from("teams")
        .insert({
          org_id: orgId,
          name: newTeamName.trim(),
          slug,
          function: newTeamFunction,
        })
        .select("id")
        .single()

      if (createErr) throw createErr

      const { error: memberErr } = await supabase
        .from("team_members")
        .insert({
          team_id: newTeam.id,
          user_id: auth.user.id,
          role: "Admin",
        })

      if (memberErr) throw memberErr

      document.cookie = "vibe_has_team=1; path=/; max-age=3600; samesite=lax"
      localStorage.setItem("vibe_active_team", newTeam.id)
      router.replace("/")
    } catch {
      setError("Failed to create team. Please try again.")
      setCreating(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-foreground">
            Welcome to {orgName}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {showCreate && teams.length === 0
              ? "Create your first team to get started"
              : "Which team are you on?"}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Team Grid */}
        {!showCreate && teams.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {teams.map((team) => {
                const Icon = getFunctionIcon(team.function)
                const colorClasses = getFunctionColor(team.function)
                const isJoining = joining === team.id
                return (
                  <button
                    key={team.id}
                    onClick={() => openRolePicker(team)}
                    disabled={!!joining}
                    className={`group relative rounded-xl border bg-gradient-to-b ${colorClasses} p-5 text-left transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background/50">
                        {isJoining ? (
                          <Loader2 className="size-5 animate-spin text-primary" />
                        ) : (
                          <Icon className="size-5 text-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {team.name}
                        </p>
                        {team.function && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {team.function}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Users className="size-3" />
                          {team.member_count} {team.member_count === 1 ? "member" : "members"}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Join another team / create */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowCreate(true)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <Plus className="size-4" />
                Create a new team
              </button>
            </div>
          </>
        )}

        {/* Create Team Form */}
        {showCreate && (
          <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Create your first team
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Team name
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Growth Marketing"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Function
                </label>
                <select
                  value={newTeamFunction}
                  onChange={(e) => setNewTeamFunction(e.target.value as TeamFunction)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {TEAM_FUNCTIONS.map((fn) => (
                    <option key={fn} value={fn}>
                      {fn}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={createTeam}
                disabled={!newTeamName.trim() || creating}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create team"
                )}
              </button>

              {teams.length > 0 && (
                <button
                  onClick={() => setShowCreate(false)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to team list
                </button>
              )}
            </div>
          </div>
        )}
        {/* Role Picker Modal */}
        {rolePickTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  What&apos;s your role?
                </h2>
                <button
                  onClick={() => setRolePickTeam(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Joining <span className="font-medium text-foreground">{rolePickTeam.name}</span>
              </p>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {TEAM_ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      selectedRole === role
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
              <button
                onClick={confirmJoin}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Join as {selectedRole}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
