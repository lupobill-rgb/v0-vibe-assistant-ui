"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Skip auth check on public pages
    if (pathname === "/login" || pathname === "/select-team" || pathname === "/pricing") {
      setReady(true)
      return
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login")
        return
      }

      // Auto-redirect Operations team members to /operations from root
      if (pathname === "/") {
        try {
          const teamId = localStorage.getItem("vibe_active_team")
          if (teamId) {
            const { data } = await supabase
              .from("teams")
              .select("name")
              .eq("id", teamId)
              .single()
            if (data?.name === "Operations") {
              router.replace("/operations")
              return
            }
          }
        } catch {
          // Ignore — fall through to normal load
        }
      }

      setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session && pathname !== "/login") {
          router.replace("/login")
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [pathname, router])

  if (!ready && pathname !== "/login") {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: "#020617" }}
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#7c3aed] border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
