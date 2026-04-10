"use client"

import { useState, useEffect, useCallback } from "react"
import { Rss, Share2, Loader2 } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { FeedSubscribeCard } from "@/components/feed/feed-subscribe-card"
import { ShareAssetDialog } from "@/components/dialogs/share-asset-dialog"
import { supabase } from "@/lib/supabase"
import { API_URL, TENANT_ID } from "@/lib/api"
import { useTeam } from "@/contexts/TeamContext"
import { cn } from "@/lib/utils"

type FeedTab = "subscriptions" | "shared" | "org"

interface SharedAsset {
  id: string
  name: string
  description: string | null
  asset_type: string
  team_name: string
  shared_at: string
  message: string | null
}

export default function FeedPage() {
  const [tab, setTab] = useState<FeedTab>("subscriptions")
  const [sharedAssets, setSharedAssets] = useState<SharedAsset[]>([])
  const [sharedLoading, setSharedLoading] = useState(false)
  const [shareDialog, setShareDialog] = useState<{ open: boolean; assetId: string; assetName: string }>({ open: false, assetId: "", assetName: "" })
  const { currentOrg } = useTeam()

  const fetchShared = useCallback(async () => {
    setSharedLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${API_URL}/assets/shared-with-me`, {
        headers: {
          "X-Tenant-Id": TENANT_ID,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (res.ok) setSharedAssets(await res.json())
    } catch { /* silent */ }
    setSharedLoading(false)
  }, [])

  useEffect(() => { if (tab === "shared") fetchShared() }, [tab, fetchShared])

  const tabs: { key: FeedTab; label: string }[] = [
    { key: "subscriptions", label: "My Subscriptions" },
    { key: "shared", label: "Shared with me" },
    { key: "org", label: "Org-wide" },
  ]

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900 border border-border p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
              <Rss className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Data Feed</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Subscribe to data published by other teams
              </p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-secondary/30 rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "subscriptions" && <FeedSubscribeCard />}

        {tab === "shared" && (
          sharedLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
            </div>
          ) : sharedAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Share2 className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">Nothing shared with you yet</p>
              <p className="text-xs mt-1">When someone shares data with you, it will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedAssets.map((a) => (
                <div key={a.id} className="flex flex-col rounded-xl bg-card border border-[#7B61FF]/20 p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <Share2 className="h-5 w-5 text-[#7B61FF] shrink-0 mt-0.5" />
                    <h3 className="font-semibold text-sm text-foreground truncate">{a.name}</h3>
                  </div>
                  <span className="mb-2 inline-flex w-fit items-center rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {a.asset_type}
                  </span>
                  <p className="text-xs text-muted-foreground mb-1">from {a.team_name}</p>
                  {a.message && <p className="text-xs text-[#7B61FF]/70 italic mb-2">"{a.message}"</p>}
                  <p className="text-[10px] text-muted-foreground mt-auto">
                    Shared {new Date(a.shared_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )
        )}

        {tab === "org" && <FeedSubscribeCard />}
      </div>

      <ShareAssetDialog
        open={shareDialog.open}
        onOpenChange={(open) => setShareDialog((s) => ({ ...s, open }))}
        assetId={shareDialog.assetId}
        assetName={shareDialog.assetName}
      />
    </AppShell>
  )
}
