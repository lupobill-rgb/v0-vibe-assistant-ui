"use client"

import { useState } from "react"
import { AppShell } from "@/components/app-shell"
import { Store, Search, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConnectDatasourceDialog } from "@/components/dialogs/connect-datasource-dialog"
import { CustomConnectorDialog } from "@/components/dialogs/custom-connector-dialog"

const categories = ["All", "Native", "Recently Added", "Analytics", "CRM", "Database", "DevTools", "Storage", "Messaging"] as const

const connectors = [
  { name: "HubSpot", emoji: "\u{1F7E0}", category: "CRM", description: "Connect your HubSpot CRM \u2014 contacts, deals, and pipeline data." },
  { name: "Salesforce", emoji: "\u2601\uFE0F", category: "CRM", description: "Pull live Salesforce data into your VIBE dashboards." },
  { name: "Slack", emoji: "\u{1F4AC}", category: "Messaging", description: "Connect Slack channels and messages as a data source." },
  { name: "Google Analytics", emoji: "\u{1F4CA}", category: "Analytics", description: "Surface GA4 metrics directly in your team dashboards." },
  { name: "Mixpanel", emoji: "\u{1F535}", category: "Analytics", description: "Pull product analytics and funnel data from Mixpanel." },
  { name: "Airtable", emoji: "\u{1F7E1}", category: "Database", description: "Use Airtable bases as live data sources for VIBE builds." },
  { name: "Snowflake", emoji: "\u2744\uFE0F", category: "Database", description: "Query your Snowflake warehouse directly from VIBE." },
  { name: "PostgreSQL", emoji: "\u{1F418}", category: "Database", description: "Connect any external Postgres database as a data source." },
  { name: "Google BigQuery", emoji: "\u{1F537}", category: "Analytics", description: "Run BigQuery queries and visualize results in VIBE." },
  { name: "AWS S3", emoji: "\u{1FAA3}", category: "Storage", description: "Read files and datasets directly from your S3 buckets." },
]

export default function MarketplacePage() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("All")
  const [view, setView] = useState<"browse" | "installed">("browse")
  const [connectOpen, setConnectOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)

  const filtered = connectors.filter((c) => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory =
      activeCategory === "All" ||
      activeCategory === "Native" ||
      activeCategory === "Recently Added" ||
      c.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <AppShell>
      <ConnectDatasourceDialog open={connectOpen} onOpenChange={setConnectOpen} />
      <CustomConnectorDialog open={customOpen} onOpenChange={setCustomOpen} />

      <div className="min-h-screen flex">
        {/* Category Sidebar */}
        <aside className="w-52 flex-shrink-0 border-r border-border/50 px-4 pt-8 pb-6 hidden sm:block">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 px-2">Categories</h3>
          <nav className="flex flex-col gap-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                  activeCategory === cat
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Page Header */}
          <div className="px-6 pt-8 pb-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F8EFF] to-[#A855F7] flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Marketplace</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Browse and connect integrations for your team</p>
              </div>
            </div>
          </div>

          {/* Search + View Toggle */}
          <div className="px-6 py-4 flex items-center gap-3 border-b border-border/50">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search connectors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex gap-1 ml-auto">
              <Button
                variant={view === "browse" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("browse")}
              >
                Browse
              </Button>
              <Button
                variant={view === "installed" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("installed")}
              >
                Installed
              </Button>
            </div>
          </div>

          {/* Hero Banner */}
          <div className="mx-6 mt-6 rounded-xl bg-gradient-to-r from-[#4F8EFF]/15 via-[#A855F7]/15 to-[#EC4899]/15 border border-border/50 px-8 py-8">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">Connect Your Data</h2>
            <p className="text-muted-foreground mt-2 max-w-lg text-sm">
              Plug in your favourite tools and databases. VIBE pulls live data into every build so your dashboards stay real.
            </p>
          </div>

          {/* Connector Grid */}
          <div className="px-6 py-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              {activeCategory === "All" ? "All Connectors" : activeCategory}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c) => (
                <div
                  key={c.name}
                  className="group rounded-xl border border-border/50 bg-card p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl leading-none">{c.emoji}</span>
                    <Badge variant="secondary" className="text-[10px]">{c.category}</Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{c.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                  </div>
                  <Button
                    size="sm"
                    className="mt-auto w-full"
                    onClick={() => setConnectOpen(true)}
                  >
                    Connect
                  </Button>
                </div>
              ))}

              {/* Add Custom Connector Card */}
              <button
                onClick={() => setCustomOpen(true)}
                className="rounded-xl border border-dashed border-border/50 bg-card/50 p-5 flex flex-col items-center justify-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-colors min-h-[180px]"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Add Custom Connector</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
