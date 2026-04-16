"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useTeam } from "@/contexts/TeamContext"
import { Palette, Upload, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BrandTokens {
  company_name: string
  primary_color: string
  secondary_color: string
  accent_color: string
  logo_url: string
  bg_mode: "light" | "dark" | "system"
  tagline: string
}

const DEFAULTS: BrandTokens = {
  company_name: "",
  primary_color: "#00E5A0",
  secondary_color: "#7B61FF",
  accent_color: "#00B4D8",
  logo_url: "",
  bg_mode: "dark",
  tagline: "",
}

export function BrandSettings() {
  const { currentOrg } = useTeam()
  const [tokens, setTokens] = useState<BrandTokens>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Load existing brand tokens
  useEffect(() => {
    if (!currentOrg?.id) { setLoading(false); return }
    ;(async () => {
      const { data } = await supabase
        .from("brand_tokens")
        .select("company_name, primary_color, secondary_color, accent_color, logo_url, bg_mode, tagline")
        .eq("org_id", currentOrg.id)
        .limit(1)
        .single()
      if (data) {
        setTokens({
          company_name: data.company_name ?? "",
          primary_color: data.primary_color ?? DEFAULTS.primary_color,
          secondary_color: data.secondary_color ?? DEFAULTS.secondary_color,
          accent_color: data.accent_color ?? DEFAULTS.accent_color,
          logo_url: data.logo_url ?? "",
          bg_mode: (data.bg_mode as BrandTokens["bg_mode"]) ?? "dark",
          tagline: data.tagline ?? "",
        })
      }
      setLoading(false)
    })()
  }, [currentOrg?.id])

  const handleSave = async () => {
    if (!currentOrg?.id || saving) return
    setSaving(true)
    setSaved(false)

    const { error } = await supabase
      .from("brand_tokens")
      .upsert(
        {
          org_id: currentOrg.id,
          company_name: tokens.company_name || null,
          primary_color: tokens.primary_color || null,
          secondary_color: tokens.secondary_color || null,
          accent_color: tokens.accent_color || null,
          logo_url: tokens.logo_url || null,
          bg_mode: tokens.bg_mode,
          tagline: tokens.tagline || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id" }
      )

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentOrg?.id) return

    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!ext || !["png", "jpg", "jpeg", "svg", "webp"].includes(ext)) return

    setUploading(true)
    const path = `brand-logos/${currentOrg.id}/logo.${ext}`

    const { error } = await supabase.storage
      .from("assets")
      .upload(path, file, { upsert: true, contentType: file.type })

    if (!error) {
      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path)
      if (urlData?.publicUrl) {
        setTokens((t) => ({ ...t, logo_url: urlData.publicUrl }))
      }
    }
    setUploading(false)
  }

  const update = (field: keyof BrandTokens, value: string) => {
    setTokens((t) => ({ ...t, [field]: value }))
  }

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00E5A0]/20 to-[#7B61FF]/20 flex items-center justify-center">
          <Palette className="w-4 h-4 text-[#00E5A0]" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Brand Settings</h2>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {/* Company Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-name" className="text-xs">Company Name</Label>
            <Input
              id="company-name"
              value={tokens.company_name}
              onChange={(e) => update("company_name", e.target.value)}
              placeholder="Acme Corp"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline" className="text-xs">Tagline</Label>
            <Input
              id="tagline"
              value={tokens.tagline}
              onChange={(e) => update("tagline", e.target.value)}
              placeholder="Building the future"
            />
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <Label className="text-xs">Logo</Label>
          <div className="flex items-center gap-4">
            {tokens.logo_url ? (
              <div className="h-10 w-auto px-3 rounded-lg border border-border bg-secondary/50 flex items-center">
                <img src={tokens.logo_url} alt="Logo" className="h-7 w-auto object-contain" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-lg border border-dashed border-border flex items-center justify-center">
                <Upload className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
              {tokens.logo_url ? "Replace" : "Upload"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".png,.jpg,.jpeg,.svg,.webp"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
        </div>

        {/* Colors */}
        <div className="space-y-2">
          <Label className="text-xs">Brand Colors</Label>
          <div className="grid grid-cols-3 gap-3">
            <ColorField label="Primary" value={tokens.primary_color} onChange={(v) => update("primary_color", v)} />
            <ColorField label="Secondary" value={tokens.secondary_color} onChange={(v) => update("secondary_color", v)} />
            <ColorField label="Accent" value={tokens.accent_color} onChange={(v) => update("accent_color", v)} />
          </div>
        </div>

        {/* Theme Mode */}
        <div className="space-y-2">
          <Label className="text-xs">Dashboard Theme</Label>
          <Select value={tokens.bg_mode} onValueChange={(v) => update("bg_mode", v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Controls the background color of dashboards your team generates.
          </p>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-xs">Preview</Label>
          <Card
            className="overflow-hidden"
            style={{
              background: tokens.bg_mode === "light" ? "#ffffff" : "#0A0E17",
              color: tokens.bg_mode === "light" ? "#0f172a" : "#E8ECF4",
            }}
          >
            <CardContent className="py-4 flex items-center gap-3">
              {tokens.logo_url && (
                <img src={tokens.logo_url} alt="" className="h-6 w-auto object-contain" />
              )}
              <div className="h-5 w-0.5 rounded-full" style={{ background: `linear-gradient(to bottom, ${tokens.primary_color}, ${tokens.secondary_color})` }} />
              <div>
                <p className="text-sm font-semibold">{tokens.company_name || "Your Company"}</p>
                {tokens.tagline && (
                  <p className="text-xs" style={{ color: tokens.bg_mode === "light" ? "#64748b" : "#888" }}>
                    {tokens.tagline}
                  </p>
                )}
              </div>
              <div className="ml-auto flex gap-2">
                <div className="w-5 h-5 rounded-md border border-white/10" style={{ background: tokens.primary_color }} title="Primary" />
                <div className="w-5 h-5 rounded-md border border-white/10" style={{ background: tokens.secondary_color }} title="Secondary" />
                <div className="w-5 h-5 rounded-md border border-white/10" style={{ background: tokens.accent_color }} title="Accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-gradient-to-r from-[#00E5A0] to-[#7B61FF] text-white border-0">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : null}
            {saved ? "Saved" : saving ? "Saving..." : "Save Brand Settings"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Brand settings apply to all dashboards generated for this organization.
          </p>
        </div>
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 bg-secondary/30">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 border-0 bg-transparent px-0 text-xs font-mono shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  )
}
