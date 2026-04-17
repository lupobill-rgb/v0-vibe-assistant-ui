"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { ConnectDatasourceDialog } from "@/components/dialogs/connect-datasource-dialog"
import { Search, Plus, Package, Zap } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useTeam } from "@/contexts/TeamContext"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

type Skill = { id: string; team_function: string; skill_name: string; description: string; is_active: boolean; trigger_on: string | null }

/* ── Provider display names ── */
const PROVIDER_NAMES: Record<string, string> = {
  hubspot: "HubSpot", airtable: "Airtable", salesforce: "Salesforce",
  ga4: "Google Analytics", "google-analytics-4": "Google Analytics",
  jira: "Jira", github: "GitHub", quickbooks: "QuickBooks",
  bamboohr: "BambooHR", docusign: "DocuSign", slack: "Slack",
  mixpanel: "Mixpanel", "google-sheet": "Google Sheets",
}

const OAUTH_WHITELIST = new Set([
  "hubspot", "airtable", "slack", "google-analytics-4", "mixpanel", "salesforce"
])

interface NangoConnector {
  id: string
  name: string
  category: string
  description: string
  logo: string
  oauth: boolean
}

function parseProvider(triggerOn: unknown): string | null {
  // Defensive: trigger_on may come back from DB as object, array, number, null
  if (!triggerOn) return null
  if (typeof triggerOn !== 'string') {
    // If it's an object like { provider: "hubspot" }, try that shape
    if (typeof triggerOn === 'object' && triggerOn !== null) {
      const obj = triggerOn as Record<string, unknown>
      if (typeof obj.provider === 'string') return obj.provider.toLowerCase()
    }
    return null
  }
  const provider = triggerOn.split(':')[0].trim().toLowerCase()
  return provider || null
}

const CATEGORIES = ["All", "CRM", "Analytics", "Database", "Storage", "Messaging", "DevTools", "Finance", "HR & Ops"] as const

const FALLBACK_CONNECTORS: NangoConnector[] = [
  { id: "hubspot",            name: "HubSpot",            category: "CRM",       description: "Sync contacts, deals, and pipeline data from HubSpot.",                   logo: "https://raw.githubusercontent.com/NangoHQ/nango/master/packages/webapp/public/images/template-logos/hubspot.svg", oauth: true  },
  { id: "salesforce",         name: "Salesforce",         category: "CRM",       description: "Connect your Salesforce CRM for live account and opportunity data.",      logo: "https://raw.githubusercontent.com/NangoHQ/nango/master/packages/webapp/public/images/template-logos/salesforce.svg", oauth: true  },
  { id: "pipedrive",          name: "Pipedrive",          category: "CRM",       description: "Pull deals, contacts, and pipeline stages from Pipedrive.",               logo: "", oauth: false },
  { id: "zoho-crm",           name: "Zoho CRM",           category: "CRM",       description: "Connect Zoho CRM for leads, contacts, and deal tracking.",               logo: "", oauth: false },
  { id: "monday",             name: "Monday.com",         category: "CRM",       description: "Sync boards, items, and workflows from Monday.com.",                      logo: "", oauth: false },
  { id: "google-analytics-4", name: "Google Analytics 4", category: "Analytics", description: "Import web analytics, traffic, and conversion metrics.",                  logo: "https://raw.githubusercontent.com/NangoHQ/nango/master/packages/webapp/public/images/template-logos/google-analytics.svg", oauth: true  },
  { id: "mixpanel",           name: "Mixpanel",           category: "Analytics", description: "Bring in product analytics events and user funnels.",                     logo: "https://raw.githubusercontent.com/NangoHQ/nango/master/packages/webapp/public/images/template-logos/mixpanel.svg", oauth: true  },
  { id: "amplitude",          name: "Amplitude",          category: "Analytics", description: "Connect Amplitude for behavioral analytics and user journey data.",       logo: "", oauth: false },
  { id: "segment",            name: "Segment",            category: "Analytics", description: "Unify customer data streams from Segment into your dashboards.",          logo: "", oauth: false },
  { id: "tableau",            name: "Tableau",            category: "Analytics", description: "Connect Tableau workbooks and data extracts.",                           logo: "", oauth: false },
  { id: "power-bi",           name: "Power BI",           category: "Analytics", description: "Pull Microsoft Power BI reports and datasets.",                          logo: "", oauth: false },
  { id: "airtable",           name: "Airtable",           category: "Database",  description: "Connect Airtable bases as structured data sources.",                     logo: "https://raw.githubusercontent.com/NangoHQ/nango/master/packages/webapp/public/images/template-logos/airtable.svg", oauth: true  },
  { id: "google-sheet",       name: "Google Sheets",      category: "Database",  description: "Pull structured data directly from Google Sheets.",                      logo: "", oauth: false },
  { id: "supabase",           name: "Supabase",           category: "Database",  description: "Connect your Supabase project for real-time database access.",           logo: "", oauth: false },
  { id: "snowflake",          name: "Snowflake",          category: "Database",  description: "Query your Snowflake data warehouse directly.",                          logo: "", oauth: false },
  { id: "notion",             name: "Notion",             category: "Database",  description: "Sync Notion databases, pages, and workspaces.",                         logo: "", oauth: false },
  { id: "aws-s3",             name: "AWS S3",             category: "Storage",   description: "Access files and data stored in S3 buckets.",                           logo: "", oauth: false },
  { id: "google-drive",       name: "Google Drive",       category: "Storage",   description: "Connect Google Drive for document and file access.",                    logo: "", oauth: false },
  { id: "dropbox",            name: "Dropbox",            category: "Storage",   description: "Access files and folders stored in Dropbox.",                           logo: "", oauth: false },
  { id: "sharepoint",         name: "SharePoint",         category: "Storage",   description: "Pull documents and lists from Microsoft SharePoint.",                   logo: "", oauth: false },
  { id: "slack",              name: "Slack",              category: "Messaging", description: "Connect Slack for team messaging and workflow automation.",              logo: "https://raw.githubusercontent.com/NangoHQ/nango/master/packages/webapp/public/images/template-logos/slack.svg", oauth: true  },
  { id: "microsoft-teams",    name: "Microsoft Teams",    category: "Messaging", description: "Integrate Microsoft Teams for enterprise communication workflows.",      logo: "", oauth: false },
  { id: "intercom",           name: "Intercom",           category: "Messaging", description: "Pull customer conversations and support tickets from Intercom.",        logo: "", oauth: false },
  { id: "zendesk",            name: "Zendesk",            category: "Messaging", description: "Connect Zendesk for support ticket and customer data.",                 logo: "", oauth: false },
  { id: "github",             name: "GitHub",             category: "DevTools",  description: "Connect GitHub repos, issues, and pull requests.",                      logo: "", oauth: false },
  { id: "jira",               name: "Jira",               category: "DevTools",  description: "Sync Jira projects, sprints, and issue tracking data.",                logo: "", oauth: false },
  { id: "linear",             name: "Linear",             category: "DevTools",  description: "Pull Linear issues, cycles, and project data.",                         logo: "", oauth: false },
  { id: "asana",              name: "Asana",              category: "DevTools",  description: "Connect Asana projects and tasks for operational dashboards.",          logo: "", oauth: false },
  { id: "stripe",             name: "Stripe",             category: "Finance",   description: "Pull revenue, subscriptions, and payment data from Stripe.",            logo: "", oauth: false },
  { id: "quickbooks",         name: "QuickBooks",         category: "Finance",   description: "Connect QuickBooks for accounting and financial reporting.",            logo: "", oauth: false },
  { id: "xero",               name: "Xero",               category: "Finance",   description: "Sync Xero accounting data for financial dashboards.",                   logo: "", oauth: false },
  { id: "netsuite",           name: "NetSuite",           category: "Finance",   description: "Connect NetSuite ERP for enterprise financial operations.",             logo: "", oauth: false },
  { id: "bamboohr",           name: "BambooHR",           category: "HR & Ops",  description: "Pull employee records and HR data from BambooHR.",                      logo: "", oauth: false },
  { id: "workday",            name: "Workday",            category: "HR & Ops",  description: "Connect Workday for workforce and financial management data.",          logo: "", oauth: false },
  { id: "linkedin",           name: "LinkedIn",           category: "HR & Ops",  description: "Connect LinkedIn for sales intelligence and professional network data.", logo: "", oauth: false },
]

export default function MarketplacePage() {
  const router = useRouter()
  const { currentTeam } = useTeam()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("All")
  const [tab, setTab] = useState<"browse" | "installed">("browse")
  const [connectOpen, setConnectOpen] = useState(false)
  const [preselectedConnector, setPreselectedConnector] = useState("")
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())
  const [section, setSection] = useState<"connectors" | "skills">("connectors")
  const [skills, setSkills] = useState<Skill[]>([])
  const [connectors, setConnectors] = useState<NangoConnector[]>([])
  const [connectorsLoading, setConnectorsLoading] = useState(true)
  const [skillDept, setSkillDept] = useState<string>("All")
  const [skillSearch, setSkillSearch] = useState("")
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)

  useEffect(() => {
    // Use select("*") to avoid PostgREST 400 if trigger_on column not in schema cache yet
    supabase.from("skill_registry").select("*").order("team_function").order("skill_name")
      .then(({ data, error }) => {
        if (error) console.error("[Marketplace] skill_registry query failed:", error.message)
        if (data) {
          setSkills(data.map((s: any) => ({
            id: s.id,
            team_function: s.team_function ?? "",
            skill_name: s.skill_name ?? "",
            description: s.description ?? "",
            is_active: s.is_active ?? false,
            trigger_on: typeof s.trigger_on === 'string' ? s.trigger_on : null,
          })))
        }
      })
  }, [])

  useEffect(() => {
    fetch(`${API_URL}/connectors/catalog`)
      .then((res) => res.json())
      .then((data) => {
        const items = data?.integrations ?? []
        const categoryMap: Record<string, string> = {
          "crm": "CRM",
          "analytics": "Analytics",
          "database": "Database",
          "storage": "Storage",
          "messaging": "Messaging",
          "communication": "Messaging",
          "devtools": "DevTools",
          "developer-tools": "DevTools",
          "finance": "Finance",
          "accounting": "Finance",
          "hr": "HR & Ops",
          "hr-payroll": "HR & Ops",
          "productivity": "DevTools",
        }
        const mapped: NangoConnector[] = items.map((item: any) => ({
          id: item.id ?? "",
          name: item.name ?? item.id ?? "",
          category: categoryMap[(item.category ?? "other").toLowerCase()] ?? "DevTools",
          description: item.description ?? `Connect ${item.name ?? item.id} to VIBE.`,
          logo: item.logo ?? "",
          oauth: OAUTH_WHITELIST.has(item.id ?? ""),
        }))
        setConnectors(mapped.length > 0 ? mapped : FALLBACK_CONNECTORS)
      })
      .catch(() => setConnectors(FALLBACK_CONNECTORS))
      .finally(() => setConnectorsLoading(false))
  }, [])

  useEffect(() => {
    if (!currentTeam?.id) return
    supabase
      .from("team_integrations")
      .select("provider")
      .eq("team_id", currentTeam.id)
      .then(({ data, error }) => {
        if (error) console.error("[Marketplace] team_integrations query failed:", error.message)
        if (data?.length) {
          setConnectedIds(new Set(data.map((r: { provider: string }) => r.provider.toLowerCase())))
        }
      })
  }, [currentTeam?.id])

  const departments = useMemo(() => {
    const depts = Array.from(new Set(skills.map((s) => s.team_function))).sort()
    return ["All", ...depts]
  }, [skills])

  const filteredSkills = useMemo(() => {
    let list = skills
    if (skillDept !== "All") list = list.filter((s) => s.team_function === skillDept)
    if (skillSearch.trim()) {
      const q = skillSearch.toLowerCase()
      list = list.filter((s) => s.skill_name.toLowerCase().includes(q))
    }
    return list
  }, [skills, skillDept, skillSearch])

  const skillsByDept = useMemo(() => {
    const map = new Map<string, Skill[]>()
    for (const s of filteredSkills) {
      const arr = map.get(s.team_function) || []
      arr.push(s)
      map.set(s.team_function, arr)
    }
    return map
  }, [filteredSkills])

  const filtered = useMemo(() => {
    let list = [...connectors]
    if (tab === "installed") list = list.filter((c) => connectedIds.has(c.id))
    if (category !== "All") list = list.filter((c) => c.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
    }
    return list
  }, [connectors, search, category, tab, connectedIds])

  const pendingSkillRef = useRef<{ name: string; provider: string } | null>(null)

  const handleConnected = (connectorType: string) => {
    setConnectedIds((prev) => new Set(prev).add(connectorType.toLowerCase()))
    const pending = pendingSkillRef.current
    if (pending && pending.provider === connectorType) {
      pendingSkillRef.current = null
      const displayName = PROVIDER_NAMES[pending.provider] ?? pending.provider
      toast.success(`${displayName} connected! Launching skill...`)
      const prompt = encodeURIComponent(`Run ${pending.name} with live ${displayName} data`)
      router.push(`/chat?prompt=${prompt}`)
    }
  }

  const handleOAuthError = () => {
    pendingSkillRef.current = null
    toast.error("Connection failed. Please try again.")
  }

  return (
    <AppShell>
      <div className="min-h-screen flex flex-col">
        {/* ── Hero Banner ── */}
        <div className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-border/50">
          <div className="px-6 py-10 md:py-12 max-w-6xl mx-auto flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00E5A0] to-[#7B61FF] flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Marketplace</h1>
              <p className="text-sm md:text-base text-slate-400 mt-1">Connect data sources and browse AI skills for your team.</p>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-6 pb-4 flex gap-2">
            <button onClick={() => setSection("connectors")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${section === "connectors" ? "bg-[#7B61FF] text-white" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              <Package className="w-4 h-4" /> Connectors
            </button>
            <button onClick={() => setSection("skills")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${section === "skills" ? "bg-[#7B61FF] text-white" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              <Zap className="w-4 h-4" /> Skills <span className="text-xs opacity-75">({skills.length})</span>
            </button>
          </div>
        </div>

        {/* ── Main content: sidebar + grid ── */}
        {section === "skills" && (
          <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full">
            <aside className="w-full md:w-[200px] shrink-0 border-b md:border-b-0 md:border-r border-border/50 px-4 py-4 md:py-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 hidden md:block">Departments</p>
              <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible">
                {departments.map((d) => (
                  <button key={d} onClick={() => setSkillDept(d)} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${skillDept === d ? "bg-[#7B61FF] text-white border-[#7B61FF]" : "bg-card text-muted-foreground border-border hover:border-[#7B61FF]/50 hover:text-foreground"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </aside>
            <div className="flex-1 px-4 md:px-6 py-4 md:py-6">
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input type="text" placeholder="Search skills..." value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} className="w-full h-10 pl-9 pr-3 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/50 focus:border-[#7B61FF] transition-colors" />
              </div>
              {filteredSkills.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <Zap className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No skills found</p>
                  <p className="text-sm mt-1">Try a different search term or department.</p>
                </div>
              )}
              {Array.from(skillsByDept.entries()).map(([dept, deptSkills]) => (
                <div key={dept} className="mb-8">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{dept}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {deptSkills.map((s) => {
                      const provider = parseProvider(s.trigger_on)
                      const displayName = provider ? (PROVIDER_NAMES[provider] ?? provider) : null
                      const isProviderConnected = provider ? connectedIds.has(provider) : false
                      return (
                      <div key={s.id} onClick={() => setSelectedSkill(s)} className="group relative flex flex-col rounded-xl bg-card border border-border p-4 transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-purple-500/10 hover:border-purple-500/30 cursor-pointer">
                        <div className="absolute top-3 right-3 flex items-end gap-1.5">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">{s.team_function}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${s.is_active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? "bg-green-400" : "bg-zinc-400"}`} />
                            {s.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="flex items-start gap-3 mb-2">
                          <span className="text-2xl leading-none">⚡</span>
                          <h3 className="font-semibold text-base text-foreground truncate pr-24">{s.skill_name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{s.description ? s.description.slice(0, 120) + (s.description.length > 120 ? "…" : "") : "No description"}</p>
                        {displayName && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            {isProviderConnected ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/25">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                {displayName} Connected
                              </span>
                            ) : (
                              <button
                                onClick={() => { pendingSkillRef.current = { name: s.skill_name, provider: provider! }; setPreselectedConnector(provider!); setConnectOpen(true) }}
                                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-[#7B61FF]/15 text-[#7B61FF] border border-[#7B61FF]/25 hover:bg-[#7B61FF]/25 transition-colors cursor-pointer"
                              >
                                Requires {displayName} → Connect
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {section === "connectors" && <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full">
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
                      ? "bg-[#7B61FF] text-white border-[#7B61FF]"
                      : "bg-card text-muted-foreground border-border hover:border-[#7B61FF]/50 hover:text-foreground"
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
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/50 focus:border-[#7B61FF] transition-colors"
                />
              </div>
              <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                <button
                  onClick={() => setTab("browse")}
                  className={`px-4 h-10 text-sm font-medium transition-colors ${
                    tab === "browse" ? "bg-[#7B61FF] text-white" : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Browse
                </button>
                <button
                  onClick={() => setTab("installed")}
                  className={`px-4 h-10 text-sm font-medium transition-colors ${
                    tab === "installed" ? "bg-[#7B61FF] text-white" : "bg-card text-muted-foreground hover:text-foreground"
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
            {connectorsLoading && (
              <div className="col-span-3 text-center py-16 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-40 animate-pulse" />
                <p className="text-sm">Loading integrations...</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {!connectorsLoading && filtered.map((c) => {
                const isConnected = connectedIds.has(c.id)
                return (
                  <div
                    key={c.id}
                    className="group relative flex flex-col rounded-xl bg-card border border-border p-4 transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-purple-500/10 hover:border-purple-500/30"
                  >
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
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                        {c.logo ? (
                          <img src={c.logo} alt={c.name} className="w-6 h-6 object-contain" />
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">{c.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base text-foreground truncate">{c.name}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">{c.description}</p>
                    {!isConnected && (
                      c.oauth ? (
                        <button
                          onClick={() => { setPreselectedConnector(c.id); setConnectOpen(true) }}
                          className="w-full h-9 rounded-lg border border-border text-sm font-medium text-foreground hover:border-[#7B61FF] hover:text-[#7B61FF] transition-colors"
                        >
                          Connect
                        </button>
                      ) : (
                        <div className="w-full h-9 rounded-lg border border-border/50 text-sm font-medium text-muted-foreground bg-muted/20 flex items-center justify-center gap-2 cursor-default">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                          Coming Soon
                        </div>
                      )
                    )}
                  </div>
                )
              })}

              {/* Add Custom Connector card */}
              {tab === "browse" && (
                <button
                  onClick={() => { setPreselectedConnector(""); setConnectOpen(true) }}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-4 text-muted-foreground hover:border-[#7B61FF]/50 hover:text-foreground transition-colors min-h-[180px]"
                >
                  <Plus className="w-8 h-8 mb-2 opacity-60" />
                  <span className="text-sm font-medium">Add Custom Connector</span>
                </button>
              )}
            </div>
          </div>
        </div>}
      </div>

      {/* Dialog wiring */}
      <ConnectDatasourceDialog
        open={connectOpen}
        onOpenChange={(open) => { setConnectOpen(open); if (!open) pendingSkillRef.current = null }}
        onConnected={handleConnected}
        onError={handleOAuthError}
        preselectedConnector={preselectedConnector}
      />
      {/* Skill Detail Drawer */}
      {selectedSkill && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedSkill(null)}
          />
          {/* Drawer panel */}
          <div className="relative w-full max-w-lg bg-background border-l border-border flex flex-col h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5A0] to-[#7B61FF] flex items-center justify-center shrink-0">
                  <span className="text-white text-lg">⚡</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selectedSkill.skill_name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">{selectedSkill.team_function}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${selectedSkill.is_active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedSkill.is_active ? "bg-green-400" : "bg-zinc-400"}`} />
                      {selectedSkill.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedSkill(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">What it does</h3>
                <p className="text-sm text-foreground leading-relaxed">
                  {selectedSkill.description || "This skill automates a key workflow for your team using AI — no manual input required."}
                </p>
              </div>

              {/* How it works */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">How it works</h3>
                <div className="space-y-3">
                  {[
                    { step: "1", label: "Input", desc: "You provide context or connect a live data source" },
                    { step: "2", label: "AI Processing", desc: "VIBE analyzes your data and applies the skill logic" },
                    { step: "3", label: "Output", desc: "Receive a ready-to-use asset, report, or action plan" },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#7B61FF]/20 text-[#7B61FF] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {item.step}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Example prompt */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Example prompt</h3>
                <div className="rounded-lg bg-muted/30 border border-border p-3">
                  <p className="text-sm text-foreground font-mono">
                    "{selectedSkill.skill_name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} — {selectedSkill.description?.split('.')[0] ?? 'run this skill now'}"
                  </p>
                </div>
              </div>

              {/* Data requirements */}
              {parseProvider(selectedSkill.trigger_on) && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Data requirements</h3>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const provider = parseProvider(selectedSkill.trigger_on)
                      const displayName = provider ? (PROVIDER_NAMES[provider] ?? provider) : null
                      const isConnected = provider ? connectedIds.has(provider) : false
                      return isConnected ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium bg-green-500/15 text-green-400 border border-green-500/25">
                          <span className="w-2 h-2 rounded-full bg-green-400" />
                          {displayName} Connected
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            const p = parseProvider(selectedSkill.trigger_on)
                            if (p) {
                              pendingSkillRef.current = { name: selectedSkill.skill_name, provider: p }
                              setPreselectedConnector(p)
                              setConnectOpen(true)
                              setSelectedSkill(null)
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium bg-[#7B61FF]/15 text-[#7B61FF] border border-[#7B61FF]/25 hover:bg-[#7B61FF]/25 transition-colors"
                        >
                          Requires {displayName} → Connect Now
                        </button>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Footer with Launch button */}
            <div className="p-6 border-t border-border">
              <button
                onClick={() => {
                  const prompt = encodeURIComponent(`Run ${selectedSkill.skill_name}`)
                  setSelectedSkill(null)
                  router.push(`/chat?prompt=${prompt}`)
                }}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#00E5A0] to-[#7B61FF] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Launch Skill
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
