"use client"

import { useState, useMemo } from "react"
import { AppShell } from "@/components/app-shell"
import { ConnectDatasourceDialog } from "@/components/dialogs/connect-datasource-dialog"
import { Search, Plus, Package } from "lucide-react"

/* ── Connector definitions ── */
const CONNECTORS = [
  { id: "hubspot",            name: "HubSpot",           emoji: "🟠", category: "CRM",       description: "Sync contacts, deals, and pipeline data from HubSpot." },
  { id: "salesforce",         name: "Salesforce",         emoji: "☁️", category: "CRM",       description: "Connect your Salesforce CRM for live account and opportunity data." },
  { id: "revos-crm",          name: "REV OS CRM",          emoji: "🤖", category: "CRM",       description: "Connect your UbiGrowth REV OS AI Revenue OS for voice agent and pipeline data." },
  { id: "google-sheet",       name: "Google Sheets",      emoji: "📊", category: "Database",   description: "Pull structured data directly from Google Sheets." },
  { id: "google-analytics-4", name: "Google Analytics 4", emoji: "📈", category: "Analytics",  description: "Import web analytics, traffic, and conversion metrics." },
  { id: "mixpanel",           name: "Mixpanel",           emoji: "🔬", category: "Analytics",  description: "Bring in product analytics events and user funnels." },
  { id: "airtable",           name: "Airtable",           emoji: "🗂️", category: "Database",   description: "Connect Airtable bases as structured data sources." },
  { id: "snowflake",          name: "Snowflake",          emoji: "❄️", category: "Database",   description: "Query your Snowflake data warehouse directly." },
  { id: "postgres",           name: "PostgreSQL",         emoji: "🐘", category: "Database",   description: "Connect any PostgreSQL database for live queries." },
  { id: "google-bigquery",    name: "Google BigQuery",    emoji: "🔍", category: "Analytics",  description: "Run queries against BigQuery datasets." },
  { id: "aws-s3",             name: "AWS S3",             emoji: "🪣", category: "Storage",    description: "Access files and data stored in S3 buckets." },
] as const

const CATEGORIES = ["All", "CRM", "Analytics", "Database", "Storage", "Messaging", "DevTools"] as const

export default function MarketplacePage() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("All")
  const [tab, setTab] = useState<"browse" | "installed">("browse")
  const [connectOpen, setConnectOpen] = useState(false)
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    let list = [...CONNECTORS]
    if (tab === "installed") list = list.filter((c) => connectedIds.has(c.id))
    if (category !== "All") list = list.filter((c) => c.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
    }
    return list
  }, [search, category, tab, connectedIds])

  const handleConnected = (connectorType: string) => {
    setConnectedIds((prev) => new Set(prev).add(connectorType))
  }

  return (
    <AppShell>
      <div className="min-h-screen flex flex-col">
        {/* ── Hero Banner ── */}
        <div className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-border/50">
          <div className="px-6 py-10 md:py-12 max-w-6xl mx-auto flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4F8EFF] to-[#A855F7] flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Connect Your Data</h1>
              <p className="text-sm md:text-base text-slate-400 mt-1">Plug in your tools. VIBE builds with live data.</p>
            </div>
          </div>
        </div>

        {/* ── Main content: sidebar + grid ── */}
        <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full">
          {/* Left sidebar — categories */}
          <aside className="w-full md:w-[200px] shrink-0 border-b md:border-b-0 md:border-r border-border/50 px-4 py-4 md:py-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 hidden md:block">Categories</p>
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    category === cat
                      ? "bg-[#A855F7] text-white border-[#A855F7]"
                      : "bg-card text-muted-foreground border-border hover:border-[#A855F7]/50 hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </aside>

          {/* Right content */}
          <div className="flex-1 px-4 md:px-6 py-4 md:py-6">
            {/* Search + Browse/Installed toggle */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search integrations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#A855F7]/50 focus:border-[#A855F7] transition-colors"
                />
              </div>
              <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                <button
                  onClick={() => setTab("browse")}
                  className={`px-4 h-10 text-sm font-medium transition-colors ${
                    tab === "browse" ? "bg-[#A855F7] text-white" : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Browse
                </button>
                <button
                  onClick={() => setTab("installed")}
                  className={`px-4 h-10 text-sm font-medium transition-colors ${
                    tab === "installed" ? "bg-[#A855F7] text-white" : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Installed
                </button>
              </div>
            </div>

            {/* Empty state */}
            {filtered.length === 0 && tab === "installed" && (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No connectors installed yet</p>
                <p className="text-sm mt-1">Browse the marketplace and connect your first data source.</p>
              </div>
            )}
            {filtered.length === 0 && tab === "browse" && (
              <div className="text-center py-16 text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No integrations found</p>
                <p className="text-sm mt-1">Try a different search term or category.</p>
              </div>
            )}

            {/* Connector grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c) => {
                const isConnected = connectedIds.has(c.id)
                return (
                  <div
                    key={c.id}
                    className="group relative flex flex-col rounded-xl bg-card border border-border p-4 transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-purple-500/10 hover:border-purple-500/30"
                  >
                    {/* Top-right badges */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">
                        {c.category}
                      </span>
                      {isConnected && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          Connected
                        </span>
                      )}
                    </div>
                    {/* Icon + name */}
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-3xl leading-none">{c.emoji}</span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base text-foreground truncate">{c.name}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">{c.description}</p>
                    {/* Action */}
                    {!isConnected && (
                      <button
                        onClick={() => setConnectOpen(true)}
                        className="w-full h-9 rounded-lg border border-border text-sm font-medium text-foreground hover:border-[#A855F7] hover:text-[#A855F7] transition-colors"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                )
              })}

              {/* Add Custom Connector card */}
              {tab === "browse" && (
                <button
                  onClick={() => setConnectOpen(true)}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-4 text-muted-foreground hover:border-[#A855F7]/50 hover:text-foreground transition-colors min-h-[180px]"
                >
                  <Plus className="w-8 h-8 mb-2 opacity-60" />
                  <span className="text-sm font-medium">Add Custom Connector</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog wiring */}
      <ConnectDatasourceDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onConnected={handleConnected}
      />
    </AppShell>
  )
}
