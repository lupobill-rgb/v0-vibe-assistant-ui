"use client"

import { useEffect, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { fetchHealth, TENANT_ID } from "@/lib/api"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

const API_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:3001"

export default function SettingsPage() {
  const [health, setHealth] = useState<{ status: string } | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)

  useEffect(() => {
    fetchHealth().then((data) => {
      setHealth(data)
      setHealthLoading(false)
    })
  }, [])

  return (
    <AppShell>
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-semibold text-foreground mb-6">Settings</h1>

        {/* Connection */}
        <section className="bg-card rounded-xl border border-border p-5 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Connection</h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">API Endpoint</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{API_URL}</p>
              </div>
              {healthLoading ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Checking...
                </span>
              ) : health?.status === "ok" ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-red-400">
                  <XCircle className="w-4 h-4" />
                  Unreachable
                </span>
              )}
            </div>
            <div className="h-px bg-border" />
            <div>
              <p className="text-sm text-foreground">Tenant ID</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{TENANT_ID}</p>
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="bg-card rounded-xl border border-border p-5 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Account</h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Display Name</p>
                <p className="text-xs text-muted-foreground mt-0.5">Demo User</p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Plan</p>
                <p className="text-xs text-muted-foreground mt-0.5">Free</p>
              </div>
            </div>
          </div>
        </section>

        {/* Environment */}
        <section className="bg-card rounded-xl border border-border p-5 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Environment Variables</h2>
          <div className="flex flex-col gap-3 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">NEXT_PUBLIC_API_URL</span>
              <span className="text-foreground">{API_URL}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">NEXT_PUBLIC_TENANT_ID</span>
              <span className="text-foreground">{TENANT_ID}</span>
            </div>
          </div>
        </section>

        <p className="text-xs text-muted-foreground">
          Configure <span className="font-mono">NEXT_PUBLIC_API_URL</span> and{" "}
          <span className="font-mono">NEXT_PUBLIC_TENANT_ID</span> in your environment to
          point to the correct API and workspace.
        </p>
      </div>
    </AppShell>
  )
}
