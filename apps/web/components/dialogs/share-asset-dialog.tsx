"use client"

import { useState, useEffect } from "react"
import { Loader2, Users, User, Shield, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { API_URL, TENANT_ID } from "@/lib/api"
import { useTeam } from "@/contexts/TeamContext"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ShareTarget {
  type: "user" | "team" | "role"
  id?: string
  role?: string
  label: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetId: string
  assetName: string
}

const ROLE_OPTIONS = [
  { value: "Director", label: "All Directors and above" },
  { value: "Manager", label: "All Managers and above" },
  { value: "Lead", label: "All Leads and above" },
]

export function ShareAssetDialog({ open, onOpenChange, assetId, assetName }: Props) {
  const { currentOrg } = useTeam()
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([])
  const [users, setUsers] = useState<{ id: string; email: string; name: string }[]>([])
  const [targets, setTargets] = useState<ShareTarget[]>([])
  const [message, setMessage] = useState("")
  const [sharing, setSharing] = useState(false)
  const [tab, setTab] = useState<"team" | "user" | "role">("team")
  const [search, setSearch] = useState("")

  // Load teams and users for the org
  useEffect(() => {
    if (!open || !currentOrg?.id) return
    ;(async () => {
      const { data: orgTeams } = await supabase
        .from("teams").select("id, name").eq("org_id", currentOrg.id)
      setTeams(orgTeams ?? [])

      // Get users in the org via team memberships
      const teamIds = (orgTeams ?? []).map((t) => t.id)
      if (teamIds.length === 0) return
      const { data: members } = await supabase
        .from("team_members").select("user_id").in("team_id", teamIds)
      const uniqueUserIds = [...new Set((members ?? []).map((m: any) => m.user_id))]
      if (uniqueUserIds.length === 0) return
      const { data: authUsers } = await supabase
        .from("profiles").select("id, email, full_name").in("id", uniqueUserIds)
      // Fallback: if profiles table doesn't exist, use auth metadata
      if (authUsers) {
        setUsers(authUsers.map((u: any) => ({ id: u.id, email: u.email ?? "", name: u.full_name ?? u.email ?? "" })))
      }
    })()
  }, [open, currentOrg?.id])

  const addTarget = (target: ShareTarget) => {
    if (targets.some((t) => t.type === target.type && t.label === target.label)) return
    setTargets((prev) => [...prev, target])
    setSearch("")
  }

  const removeTarget = (idx: number) => {
    setTargets((prev) => prev.filter((_, i) => i !== idx))
  }

  const resolvedCount = targets.reduce((sum, t) => {
    if (t.type === "user") return sum + 1
    if (t.type === "team") {
      const team = teams.find((tm) => tm.id === t.id)
      return sum + (team ? 5 : 1) // estimate
    }
    return sum + 10 // role-based estimate
  }, 0)

  const handleShare = async () => {
    if (targets.length === 0 || sharing) return
    setSharing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${API_URL}/assets/${assetId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": TENANT_ID,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          targets: targets.map((t) => ({
            type: t.type,
            id: t.type !== "role" ? t.id : undefined,
            role: t.type === "role" ? t.role : undefined,
          })),
          message: message || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any).message || "Share failed")
      }
      const data = await res.json()
      toast.success(`Shared "${assetName}" — ${data.notified} people notified`)
      onOpenChange(false)
      setTargets([])
      setMessage("")
    } catch (err: any) {
      toast.error(err.message || "Failed to share")
    } finally {
      setSharing(false)
    }
  }

  const filteredTeams = teams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share "{assetName}"</DialogTitle>
        </DialogHeader>

        {/* Selected targets */}
        {targets.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {targets.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#7B61FF]/15 text-[#7B61FF] border border-[#7B61FF]/30">
                {t.type === "team" && <Users className="h-3 w-3" />}
                {t.type === "user" && <User className="h-3 w-3" />}
                {t.type === "role" && <Shield className="h-3 w-3" />}
                {t.label}
                <button onClick={() => removeTarget(i)} className="ml-0.5 hover:text-white"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}

        {/* Tab selector */}
        <div className="flex gap-1 mb-3">
          {[
            { key: "team" as const, label: "Teams", icon: Users },
            { key: "user" as const, label: "People", icon: User },
            { key: "role" as const, label: "By Role", icon: Shield },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setSearch("") }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                tab === key ? "bg-[#7B61FF]/15 text-[#7B61FF] border border-[#7B61FF]/30" : "text-muted-foreground hover:bg-white/5"
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Search */}
        {tab !== "role" && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "team" ? "Search teams..." : "Search people..."}
            className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground mb-2"
          />
        )}

        {/* Options list */}
        <div className="max-h-40 overflow-y-auto space-y-1">
          {tab === "team" && filteredTeams.map((t) => (
            <button
              key={t.id}
              onClick={() => addTarget({ type: "team", id: t.id, label: t.name })}
              disabled={targets.some((tg) => tg.type === "team" && tg.id === t.id)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/5 disabled:opacity-40 flex items-center gap-2"
            >
              <Users className="h-4 w-4 text-muted-foreground" /> {t.name}
            </button>
          ))}
          {tab === "user" && filteredUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => addTarget({ type: "user", id: u.id, label: u.name || u.email })}
              disabled={targets.some((tg) => tg.type === "user" && tg.id === u.id)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/5 disabled:opacity-40 flex items-center gap-2"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{u.name}</span>
              {u.email && <span className="text-xs text-muted-foreground">{u.email}</span>}
            </button>
          ))}
          {tab === "role" && ROLE_OPTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => addTarget({ type: "role", role: r.value, label: r.label })}
              disabled={targets.some((tg) => tg.type === "role" && tg.role === r.value)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/5 disabled:opacity-40 flex items-center gap-2"
            >
              <Shield className="h-4 w-4 text-muted-foreground" /> {r.label}
            </button>
          ))}
        </div>

        {/* Message */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a message (optional)"
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none mt-2"
        />

        {/* Recipient preview */}
        {targets.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Estimated ~{resolvedCount} {resolvedCount === 1 ? "person" : "people"} will be notified
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleShare}
            disabled={targets.length === 0 || sharing}
            className="bg-[#7B61FF] hover:bg-[#6B51EF] text-white"
          >
            {sharing ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Sharing...</> : `Share with ${targets.length} target${targets.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
