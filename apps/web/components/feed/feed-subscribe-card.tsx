"use client"

import { useState, useEffect, useCallback } from "react"
import { Rss, PackageOpen } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { API_URL, TENANT_ID } from "@/lib/api"
import { useTeam } from "@/contexts/TeamContext"
import { Skeleton } from "@/components/ui/skeleton"

interface FeedAsset {
  id: string
  name: string
  description: string
  asset_type: string
  team_id: string
  is_subscribed: boolean
}

export function FeedSubscribeCard() {
  const { currentTeam } = useTeam()
  const [assets, setAssets] = useState<FeedAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<Record<string, boolean>>({})

  const fetchFeed = useCallback(async () => {
    if (!currentTeam) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(
        `${API_URL}/assets/feed?team_id=${currentTeam.id}`,
        {
          headers: {
            "X-Tenant-Id": TENANT_ID,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      )
      if (!res.ok) throw new Error("Failed to load feed")
      const data: FeedAsset[] = await res.json()
      setAssets(data)
    } catch {
      toast.error("Could not load data feed")
    } finally {
      setLoading(false)
    }
  }, [currentTeam])

  useEffect(() => { fetchFeed() }, [fetchFeed])

  const handleSubscribe = async (assetId: string) => {
    setSubscribing((s) => ({ ...s, [assetId]: true }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${API_URL}/assets/${assetId}/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": TENANT_ID,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) throw new Error()
      setAssets((prev) =>
        prev.map((a) => (a.id === assetId ? { ...a, is_subscribed: true } : a)),
      )
    } catch {
      toast.error("Failed to subscribe")
    } finally {
      setSubscribing((s) => ({ ...s, [assetId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl bg-card border border-border p-4 space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-9 w-full mt-2" />
          </div>
        ))}
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <PackageOpen className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">No shared assets available yet</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {assets.map((asset) => (
        <div
          key={asset.id}
          className="group relative flex flex-col rounded-xl bg-card border border-border p-4 transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-purple-500/10 hover:border-purple-500/30"
        >
          <div className="flex items-start gap-3 mb-2">
            <Rss className="h-6 w-6 text-purple-400 shrink-0 mt-0.5" />
            <h3 className="font-semibold text-base text-foreground truncate">
              {asset.name}
            </h3>
          </div>

          <span className="mb-2 inline-flex w-fit items-center rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {asset.asset_type}
          </span>

          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
            {asset.description}
          </p>

          {asset.is_subscribed ? (
            <button
              disabled
              className="w-full h-9 rounded-lg text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30 cursor-default"
            >
              Subscribed
            </button>
          ) : (
            <button
              onClick={() => handleSubscribe(asset.id)}
              disabled={subscribing[asset.id]}
              className="w-full h-9 rounded-lg border border-border text-sm font-medium text-foreground hover:border-[#7B61FF] hover:text-[#7B61FF] transition-colors disabled:opacity-50"
            >
              {subscribing[asset.id] ? "Subscribing…" : "Subscribe"}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
