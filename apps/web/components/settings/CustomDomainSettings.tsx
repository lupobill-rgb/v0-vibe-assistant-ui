"use client"

import { useState } from "react"
import { API_URL, TENANT_ID } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { Globe, CheckCircle2, Copy, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface DnsRecord {
  type: string
  name: string
  value: string
}

interface DomainState {
  domain: string
  verified: boolean
  instructions?: { cname: DnsRecord; txt: DnsRecord }
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  return {
    "Content-Type": "application/json",
    "X-Tenant-Id": TENANT_ID,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function CustomDomainSettings({ teamId }: { teamId: string }) {
  const [domainInput, setDomainInput] = useState("")
  const [domainState, setDomainState] = useState<DomainState | null>(null)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const handleSubmitDomain = async () => {
    if (!domainInput.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/teams/${teamId}/domain`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ domain: domainInput.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      const data = await res.json()
      setDomainState({
        domain: data.domain,
        verified: data.verified,
        instructions: data.instructions,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleVerify = async () => {
    setVerifying(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/teams/${teamId}/domain/verify`, {
        method: "POST",
        headers: await authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 422) {
          setError("DNS not found yet, may take up to 48 hours to propagate")
        } else {
          throw new Error(data.error || `Verification failed (${res.status})`)
        }
        return
      }
      setDomainState((prev) =>
        prev ? { ...prev, verified: true } : prev
      )
    } catch (err: any) {
      setError(err.message)
    } finally {
      setVerifying(false)
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00E5A0]/20 to-[#7B61FF]/20 flex items-center justify-center">
          <Globe className="w-4 h-4 text-[#00E5A0]" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Custom Domain</h2>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Verified state */}
        {domainState?.verified ? (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">Domain Live</p>
              <p className="text-xs text-emerald-400/70 font-mono mt-0.5">
                {domainState.domain}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Domain input */}
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                Connect your domain
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Point your domain to UbiVibe to serve published sites on a custom URL.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="analytics.advanceddecisions.com"
                  className="flex-1 h-9 rounded-lg border border-border bg-secondary/40 px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmitDomain()
                  }}
                />
                <button
                  onClick={handleSubmitDomain}
                  disabled={saving || !domainInput.trim()}
                  className={cn(
                    "h-9 px-4 rounded-lg text-sm font-medium transition-all duration-200",
                    "bg-[#00E5A0] text-white hover:bg-[#00E5A0]/90",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Connect"
                  )}
                </button>
              </div>
            </div>

            {/* DNS instructions */}
            {domainState?.instructions && !domainState.verified && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">
                  Add these DNS records with your domain provider:
                </p>

                <DnsRecordBlock
                  record={domainState.instructions.cname}
                  copied={copied}
                  onCopy={copyToClipboard}
                />
                <DnsRecordBlock
                  record={domainState.instructions.txt}
                  copied={copied}
                  onCopy={copyToClipboard}
                />

                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className={cn(
                    "h-9 px-4 rounded-lg text-sm font-medium transition-all duration-200 self-start",
                    "border border-[#00E5A0]/60 bg-[#00E5A0]/10 text-[#00E5A0] hover:bg-[#00E5A0]/20",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {verifying ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking DNS...
                    </span>
                  ) : (
                    "Verify Domain"
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

function DnsRecordBlock({
  record,
  copied,
  onCopy,
}: {
  record: DnsRecord
  copied: string | null
  onCopy: (text: string, key: string) => void
}) {
  const copyKey = `${record.type}-${record.name}`
  const copyText = `${record.type}\t${record.name}\t${record.value}`

  return (
    <div className="relative bg-secondary/50 border border-border/50 rounded-lg px-4 py-3 font-mono text-xs">
      <button
        onClick={() => onCopy(copyText, copyKey)}
        className="absolute top-2 right-2 p-1 rounded hover:bg-border/50 transition-colors"
        title="Copy record"
      >
        {copied === copyKey ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
      <div className="flex flex-col gap-1">
        <div className="flex gap-3">
          <span className="text-muted-foreground w-12">Type</span>
          <span className="text-foreground font-semibold">{record.type}</span>
        </div>
        <div className="flex gap-3">
          <span className="text-muted-foreground w-12">Name</span>
          <span className="text-foreground break-all">{record.name}</span>
        </div>
        <div className="flex gap-3">
          <span className="text-muted-foreground w-12">Value</span>
          <span className="text-foreground break-all">{record.value}</span>
        </div>
      </div>
    </div>
  )
}
