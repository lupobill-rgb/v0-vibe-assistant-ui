import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ptaqytvztkhjpuawdxng.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const HAS_TEAM_COOKIE = "vibe_has_team"
const COOKIE_MAX_AGE = 60 * 60 // 1 hour — re-check team membership periodically

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Create Supabase server client that reads/writes auth cookies
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Set cookies on the request (for downstream server components)
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        // Re-create response with updated request
        response = NextResponse.next({ request })
        // Set cookies on the response (for the browser)
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh session — this also writes updated cookies to response
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Not authenticated → redirect to /login
  if (!user) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Check cached team membership cookie
  const hasTeamCookie = request.cookies.get(HAS_TEAM_COOKIE)?.value
  if (hasTeamCookie === "1") {
    return response
  }

  // No cache — query team_members
  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .limit(1)

  if (memberships && memberships.length > 0) {
    // User has a team — cache it and continue
    response.cookies.set(HAS_TEAM_COOKIE, "1", {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false, // client can clear it when switching teams
      sameSite: "lax",
    })
    return response
  }

  // No team → redirect to /select-team
  const selectTeamUrl = new URL("/select-team", request.url)
  return NextResponse.redirect(selectTeamUrl)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|login|select-team|pricing|landing|s/|embed/).*)",
  ],
}
