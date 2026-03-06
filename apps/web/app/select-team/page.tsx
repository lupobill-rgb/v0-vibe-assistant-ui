"use client"

import { useRouter } from "next/navigation"
import { useTeam } from "@/contexts/TeamContext"
import { Sparkles, Building2 } from "lucide-react"

export default function SelectTeamPage() {
  const router = useRouter()
  const { availableTeams, switchTeam, loading } = useTeam()

  async function handleSelect(teamId: string) {
    await switchTeam(teamId)
    router.push("/")
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "#020617", fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-8"
        style={{
          background: "rgba(255,255,255,0.04)",
          borderColor: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#4F8EFF]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1
            className="text-2xl font-bold tracking-tight text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Select a Team
          </h1>
          <p className="text-sm text-gray-400">
            Choose a team to continue
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#7c3aed] border-t-transparent" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {availableTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleSelect(team.id)}
                className="flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.1)" }}
              >
                <Building2 className="h-4 w-4 flex-shrink-0 text-[#7c3aed]" />
                <span className="font-medium">{team.name}</span>
              </button>
            ))}
            {availableTeams.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-4">
                No teams found. You'll be taken to your personal workspace.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
