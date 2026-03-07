"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Team = { id: string; name: string; slug: string }

export default function SelectTeamPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return router.replace("/login")
        const { data: memberships, error: memberErr } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", auth.user.id)
        if (memberErr) throw memberErr
        const teamIds = (memberships ?? []).map((m: { team_id: string }) => m.team_id)
        if (teamIds.length === 0) return router.replace("/chat")
        const { data, error: teamErr } = await supabase
          .from("teams")
          .select("id, name, slug")
          .in("id", teamIds)
        if (teamErr) throw teamErr
        if (!data || data.length === 0) return router.replace("/chat")
        if (data.length === 1) {
          localStorage.setItem("vibe_active_team", data[0].id)
          return router.replace("/chat")
        }
        setTeams(data as Team[])
      } catch {
        setError("Could not load teams.")
      } finally {
        setLoading(false)
      }
    }
    loadTeams()
  }, [router])

  const pickTeam = (team: Team) => {
    localStorage.setItem("vibe_active_team", team.id)
    router.replace("/chat")
  }

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h1 className="text-2xl font-semibold">Select a Team</h1>
        <p className="mt-1 text-sm text-slate-400">Choose where you want to work in VIBE.</p>
        {loading && <p className="mt-6 text-slate-300">Loading teams...</p>}
        {!loading && error && <p className="mt-6 text-red-400">{error}</p>}
        {!loading && !error && (
          <div className="mt-5 space-y-2">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => pickTeam(team)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-left hover:border-violet-500"
              >
                <p className="font-medium">{team.name}</p>
                <p className="text-xs text-slate-500">{team.slug}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

