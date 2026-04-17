/**
 * Metadata for the built-in dashboard templates, used by the marketplace gallery.
 * Matches the templates defined in apps/api/src/handlers/dashboard-templates.ts —
 * the API has the full data payload; this just drives the UI.
 */

export interface DashboardTemplateMeta {
  id: string
  name: string
  department: string
  description: string
  /** What to type in the chat to build this dashboard. */
  prompt: string
  /** One-line "what's inside" for the card. */
  preview: string
  icon: string // emoji for simplicity — no extra deps
  liveDataProviders?: string[] // which connectors enrich this template
}

export const BUILTIN_TEMPLATES: DashboardTemplateMeta[] = [
  {
    id: "sales-pipeline",
    name: "Sales Pipeline",
    department: "Sales",
    description: "Pipeline performance and revenue analysis",
    prompt: "show me my sales pipeline dashboard",
    preview: "6 KPIs • Funnel chart • Revenue trend • Top deals table • Alerts",
    icon: "💼",
    liveDataProviders: ["hubspot", "salesforce"],
  },
  {
    id: "marketing-performance",
    name: "Marketing Performance",
    department: "Marketing",
    description: "Campaign analytics and lead generation",
    prompt: "build me a marketing performance dashboard",
    preview: "6 KPIs • Channel attribution • Lead trend • Campaign ROI • Active campaigns",
    icon: "📣",
    liveDataProviders: ["hubspot", "ga4", "mixpanel"],
  },
  {
    id: "executive-overview",
    name: "Executive Overview",
    department: "Executive",
    description: "Company-wide performance summary",
    prompt: "show me an executive overview dashboard",
    preview: "6 KPIs • Revenue growth • Department attainment",
    icon: "👔",
  },
  {
    id: "clinical-trials",
    name: "Clinical Trials",
    department: "Pharma",
    description: "Trial enrollment, site performance, safety signals",
    prompt: "build me a clinical trial dashboard",
    preview: "6 KPIs • Enrollment curve • Site performance • AE summary",
    icon: "🧬",
  },
  {
    id: "youth-sports",
    name: "Youth Sports",
    department: "Athletics",
    description: "Season performance and team analytics",
    prompt: "show me my youth sports dashboard",
    preview: "6 KPIs • League standings • Attendance • Top scorers",
    icon: "⚽",
  },
  {
    id: "hr-people",
    name: "HR & People",
    department: "Human Resources",
    description: "Headcount, hiring, and retention",
    prompt: "build me an HR people dashboard",
    preview: "6 KPIs • Headcount growth • Department breakdown",
    icon: "👥",
    liveDataProviders: ["bamboohr"],
  },
  {
    id: "operations",
    name: "Operations",
    department: "Operations",
    description: "Throughput, SLA, and capacity",
    prompt: "show me my operations dashboard",
    preview: "6 KPIs • Throughput trend • SLA compliance by category",
    icon: "⚙️",
  },
  {
    id: "finance-pnl",
    name: "Finance & P&L",
    department: "Finance",
    description: "Revenue, expenses, and margin analysis",
    prompt: "build me a finance P&L dashboard",
    preview: "6 KPIs • Revenue vs expenses • Expense breakdown",
    icon: "💰",
    liveDataProviders: ["quickbooks"],
  },
  {
    id: "customer-success",
    name: "Customer Success",
    department: "Customer Success",
    description: "Health scores, retention, and satisfaction",
    prompt: "show me my customer success dashboard",
    preview: "6 KPIs • Health distribution • NPS trend • Alerts",
    icon: "❤️",
  },
  {
    id: "product-analytics",
    name: "Product Analytics",
    department: "Product",
    description: "Usage, adoption, and engagement",
    prompt: "build me a product analytics dashboard",
    preview: "6 KPIs • DAU trend • Feature adoption • Activation funnel",
    icon: "📊",
    liveDataProviders: ["mixpanel", "ga4"],
  },
]

/**
 * Curated links to shadcn.io community dashboard templates.
 * These are external — they open in a new tab and point to the source repo.
 */
export interface CommunityTemplate {
  name: string
  description: string
  url: string
  source: string
}

export const COMMUNITY_TEMPLATES: CommunityTemplate[] = [
  {
    name: "Dashboard 11",
    description: "Official shadcn dashboard with sidebar, data table, and charts",
    url: "https://ui.shadcn.com/examples/dashboard",
    source: "shadcn/ui",
  },
  {
    name: "shadcn Admin Dashboard",
    description: "Admin panel with team management, billing, and settings",
    url: "https://github.com/shadcnio/react-shadcn-components",
    source: "shadcn.io",
  },
  {
    name: "Analytics Dashboard",
    description: "Clean analytics dashboard with metrics and charts",
    url: "https://www.shadcn.io/template",
    source: "shadcn.io",
  },
  {
    name: "SaaS Starter Dashboard",
    description: "SaaS starter template with auth, billing, and dashboard",
    url: "https://www.shadcn.io/template",
    source: "shadcn.io",
  },
]
