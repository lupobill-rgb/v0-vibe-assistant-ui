"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Sparkles } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Incorrect email or password. Please try again."
          : authError.message
      )
      setLoading(false)
      return
    }

    // Check how many teams the user belongs to
    try {
      const userId = authData.user?.id
      if (userId) {
        const { data: memberships } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", userId)

        if (memberships && memberships.length > 1) {
          router.push("/select-team")
          return
        }
      }
    } catch {
      // Tables don't exist or query failed — continue to home
    }

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
            Sign in to VIBE
          </h1>
          <p className="text-sm text-gray-400">
            Enter your credentials to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-medium text-gray-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-10 rounded-lg border bg-white/5 px-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium text-gray-400">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10 rounded-lg border bg-white/5 px-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-10 rounded-lg font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4F8EFF)",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  )
}
