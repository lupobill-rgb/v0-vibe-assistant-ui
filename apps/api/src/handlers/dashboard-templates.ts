/**
 * Deterministic DashboardData JSON templates.
 *
 * These templates render through ShadcnDashboard on the frontend with zero
 * LLM calls. Each template is a complete DashboardData object matching the
 * schema in apps/web/types/dashboard.ts.
 *
 * To add a new template:
 *   1. Add entry to DASHBOARD_TEMPLATES below
 *   2. Keywords must be specific enough to avoid false positives (50%+ overlap)
 *   3. Test: ensure the prompt reaches this handler in Railway logs
 */

import { storage } from '../storage';
import { getPlatformSupabaseClient } from '../supabase/client';

interface DashboardTemplate {
  /** Unique identifier */
  id: string;
  /** Team/department names that auto-match this template */
  departments: string[];
  /** Primary keywords — prompt must contain at least one of these to be eligible (when no department match) */
  primary: string[];
  /** Signal keywords — boost match confidence */
  keywords: string[];
  /** The DashboardData JSON payload */
  data: {
    meta: {
      title: string;
      subtitle?: string;
      department: string;
      generated_at: string;
      data_source: 'sample' | 'connected';
    };
    kpis: Array<{
      id: string;
      label: string;
      value: string | number;
      change?: number;
      change_period?: string;
      trend?: 'up' | 'down' | 'flat';
      format?: 'currency' | 'percent' | 'number' | 'text';
    }>;
    charts: Array<{
      id: string;
      type: 'bar' | 'line' | 'area';
      title: string;
      data: Record<string, unknown>[];
      x_key: string;
      y_keys: string[];
    }>;
    tables?: Array<{
      id: string;
      title: string;
      columns: Array<{ key: string; label: string }>;
      rows: Record<string, unknown>[];
    }>;
    alerts?: Array<{
      id: string;
      severity: 'info' | 'warning' | 'critical';
      message: string;
    }>;
  };
}

// ── Template Catalog ──────────────────────────────────────────────

const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'sales-pipeline',
    departments: ['sales', 'revenue', 'business development', 'account management'],
    primary: ['pipeline', 'sales'],
    keywords: ['deals', 'crm', 'revenue', 'forecast', 'quota', 'funnel', 'win rate'],
    data: {
      meta: {
        title: 'Sales Pipeline Dashboard',
        subtitle: 'Pipeline Performance & Revenue Analysis',
        department: 'Sales',
        generated_at: new Date().toISOString(),
        data_source: 'sample',
      },
      kpis: [
        { id: 'pipeline-value', label: 'Total Pipeline Value', value: 2450000, change: 8.2, trend: 'up', change_period: 'vs last month', format: 'currency' },
        { id: 'weighted-pipeline', label: 'Weighted Pipeline', value: 980000, change: 5.1, trend: 'up', change_period: 'vs last month', format: 'currency' },
        { id: 'win-rate', label: 'Win Rate', value: 32, change: 3.5, trend: 'up', change_period: 'vs last quarter', format: 'percent' },
        { id: 'avg-deal', label: 'Average Deal Size', value: 45000, change: -1.8, trend: 'down', change_period: 'vs last month', format: 'currency' },
        { id: 'deal-cycle', label: 'Avg Deal Cycle', value: '38 days', change: -4.2, trend: 'down', change_period: 'vs last quarter', format: 'text' },
        { id: 'deals-open', label: 'Open Deals', value: 54, change: 12, trend: 'up', change_period: 'vs last month', format: 'number' },
      ],
      charts: [
        {
          id: 'funnel',
          type: 'bar',
          title: 'Pipeline Funnel by Stage',
          x_key: 'stage',
          y_keys: ['value', 'count'],
          data: [
            { stage: 'Lead', value: 850000, count: 24 },
            { stage: 'Qualified', value: 620000, count: 15 },
            { stage: 'Demo', value: 480000, count: 10 },
            { stage: 'Proposal', value: 310000, count: 7 },
            { stage: 'Negotiation', value: 180000, count: 4 },
            { stage: 'Closed Won', value: 125000, count: 3 },
          ],
        },
        {
          id: 'revenue-trend',
          type: 'area',
          title: 'Revenue Trend (Actual vs Target)',
          x_key: 'month',
          y_keys: ['actual', 'target'],
          data: [
            { month: 'January', actual: 185000, target: 200000 },
            { month: 'February', actual: 210000, target: 200000 },
            { month: 'March', actual: 195000, target: 210000 },
            { month: 'April', actual: 240000, target: 220000 },
            { month: 'May', actual: 255000, target: 230000 },
            { month: 'June', actual: 230000, target: 240000 },
            { month: 'July', actual: 275000, target: 250000 },
            { month: 'August', actual: 290000, target: 260000 },
            { month: 'September', actual: 310000, target: 270000 },
            { month: 'October', actual: 285000, target: 280000 },
            { month: 'November', actual: 340000, target: 290000 },
            { month: 'December', actual: 365000, target: 300000 },
          ],
        },
      ],
      tables: [
        {
          id: 'top-deals',
          title: 'Top Active Deals',
          columns: [
            { key: 'deal', label: 'Deal Name' },
            { key: 'company', label: 'Company' },
            { key: 'value', label: 'Value' },
            { key: 'stage', label: 'Stage' },
            { key: 'probability', label: 'Probability' },
            { key: 'close_date', label: 'Expected Close' },
            { key: 'owner', label: 'Owner' },
          ],
          rows: [
            { deal: 'Enterprise Platform License', company: 'Acme Corp', value: '$185,000', stage: 'Negotiation', probability: '75%', close_date: 'May 15', owner: 'Sarah Chen' },
            { deal: 'Annual SaaS Renewal', company: 'TechFlow Inc', value: '$120,000', stage: 'Proposal', probability: '60%', close_date: 'May 22', owner: 'Marcus Johnson' },
            { deal: 'Data Analytics Suite', company: 'DataDriven Co', value: '$95,000', stage: 'Demo', probability: '40%', close_date: 'Jun 3', owner: 'Sarah Chen' },
            { deal: 'Security Compliance Package', company: 'SecureFirst', value: '$78,000', stage: 'Qualified', probability: '30%', close_date: 'Jun 18', owner: 'Alex Rivera' },
            { deal: 'Cloud Migration Services', company: 'OldStack LLC', value: '$145,000', stage: 'Proposal', probability: '55%', close_date: 'May 28', owner: 'Jordan Lee' },
            { deal: 'API Integration Project', company: 'ConnectHub', value: '$62,000', stage: 'Demo', probability: '45%', close_date: 'Jun 10', owner: 'Marcus Johnson' },
            { deal: 'Training & Onboarding', company: 'ScaleUp Inc', value: '$34,000', stage: 'Negotiation', probability: '80%', close_date: 'May 8', owner: 'Alex Rivera' },
            { deal: 'Consulting Engagement', company: 'GrowthCo', value: '$88,000', stage: 'Lead', probability: '15%', close_date: 'Jul 1', owner: 'Jordan Lee' },
          ],
        },
      ],
      alerts: [
        { id: 'stale-deals', severity: 'warning', message: '6 deals have not been updated in over 14 days — review for pipeline hygiene.' },
        { id: 'quota-pace', severity: 'info', message: 'Team is tracking at 108% of quarterly quota pace. 3 reps above target.' },
      ],
    },
  },
  {
    id: 'marketing-performance',
    departments: ['marketing', 'growth', 'demand gen', 'content'],
    primary: ['marketing', 'campaign'],
    keywords: ['leads', 'attribution', 'channels', 'cac', 'ltv', 'conversion', 'acquisition'],
    data: {
      meta: {
        title: 'Marketing Performance Dashboard',
        subtitle: 'Campaign Analytics & Lead Generation',
        department: 'Marketing',
        generated_at: new Date().toISOString(),
        data_source: 'sample',
      },
      kpis: [
        { id: 'leads', label: 'Leads Generated', value: 1842, change: 14.3, trend: 'up', change_period: 'vs last month', format: 'number' },
        { id: 'cac', label: 'Customer Acquisition Cost', value: 127, change: -8.5, trend: 'down', change_period: 'vs last quarter', format: 'currency' },
        { id: 'conversion', label: 'Lead-to-MQL Rate', value: 24.5, change: 2.1, trend: 'up', change_period: 'vs last month', format: 'percent' },
        { id: 'spend', label: 'Marketing Spend', value: 85000, change: 3.2, trend: 'up', change_period: 'vs budget', format: 'currency' },
        { id: 'roi', label: 'Campaign ROI', value: 340, change: 18, trend: 'up', change_period: 'vs last quarter', format: 'percent' },
        { id: 'ltv-cac', label: 'LTV:CAC Ratio', value: '4.2:1', change: 12, trend: 'up', change_period: 'vs last quarter', format: 'text' },
      ],
      charts: [
        {
          id: 'channel-attribution',
          type: 'bar',
          title: 'Lead Attribution by Channel',
          x_key: 'channel',
          y_keys: ['leads', 'mqls'],
          data: [
            { channel: 'Organic Search', leads: 520, mqls: 145 },
            { channel: 'Paid Search', leads: 380, mqls: 95 },
            { channel: 'Social Media', leads: 310, mqls: 68 },
            { channel: 'Email', leads: 280, mqls: 112 },
            { channel: 'Referral', leads: 195, mqls: 85 },
            { channel: 'Events', leads: 157, mqls: 72 },
          ],
        },
        {
          id: 'lead-trend',
          type: 'area',
          title: 'Lead Generation Trend',
          x_key: 'month',
          y_keys: ['leads', 'mqls', 'sqls'],
          data: [
            { month: 'January', leads: 1200, mqls: 310, sqls: 95 },
            { month: 'February', leads: 1350, mqls: 345, sqls: 108 },
            { month: 'March', leads: 1180, mqls: 290, sqls: 88 },
            { month: 'April', leads: 1520, mqls: 380, sqls: 125 },
            { month: 'May', leads: 1680, mqls: 420, sqls: 142 },
            { month: 'June', leads: 1590, mqls: 395, sqls: 130 },
            { month: 'July', leads: 1720, mqls: 445, sqls: 155 },
            { month: 'August', leads: 1840, mqls: 460, sqls: 160 },
            { month: 'September', leads: 1950, mqls: 510, sqls: 175 },
            { month: 'October', leads: 1780, mqls: 475, sqls: 158 },
            { month: 'November', leads: 2050, mqls: 540, sqls: 190 },
            { month: 'December', leads: 1842, mqls: 485, sqls: 168 },
          ],
        },
        {
          id: 'campaign-roi',
          type: 'bar',
          title: 'Campaign ROI Comparison',
          x_key: 'campaign',
          y_keys: ['roi_percent'],
          data: [
            { campaign: 'Spring Launch', roi_percent: 420 },
            { campaign: 'Webinar Series', roi_percent: 380 },
            { campaign: 'Content Syndication', roi_percent: 290 },
            { campaign: 'Partner Co-marketing', roi_percent: 350 },
            { campaign: 'Product Demo Ads', roi_percent: 260 },
          ],
        },
      ],
      tables: [
        {
          id: 'campaigns',
          title: 'Active Campaigns',
          columns: [
            { key: 'name', label: 'Campaign' },
            { key: 'channel', label: 'Channel' },
            { key: 'spend', label: 'Spend' },
            { key: 'leads', label: 'Leads' },
            { key: 'cpl', label: 'Cost/Lead' },
            { key: 'status', label: 'Status' },
          ],
          rows: [
            { name: 'Spring Product Launch', channel: 'Multi-channel', spend: '$24,500', leads: 485, cpl: '$50.52', status: 'Active' },
            { name: 'Developer Webinar Series', channel: 'Email + Social', spend: '$8,200', leads: 312, cpl: '$26.28', status: 'Active' },
            { name: 'Enterprise ABM Campaign', channel: 'LinkedIn + Email', spend: '$18,000', leads: 89, cpl: '$202.25', status: 'Active' },
            { name: 'SEO Content Push', channel: 'Organic', spend: '$12,000', leads: 520, cpl: '$23.08', status: 'Active' },
            { name: 'Partner Referral Program', channel: 'Referral', spend: '$5,500', leads: 195, cpl: '$28.21', status: 'Active' },
          ],
        },
      ],
    },
  },
  {
    id: 'executive-overview',
    departments: ['executive', 'leadership', 'c-suite', 'general'],
    primary: ['executive', 'overview', 'ceo', 'cfo'],
    keywords: ['company', 'business', 'kpi', 'summary', 'performance', 'revenue', 'growth'],
    data: {
      meta: {
        title: 'Executive Overview',
        subtitle: 'Company Performance Summary',
        department: 'Executive',
        generated_at: new Date().toISOString(),
        data_source: 'sample',
      },
      kpis: [
        { id: 'arr', label: 'Annual Recurring Revenue', value: 4200000, change: 22, trend: 'up', change_period: 'YoY', format: 'currency' },
        { id: 'mrr', label: 'Monthly Recurring Revenue', value: 350000, change: 4.5, trend: 'up', change_period: 'vs last month', format: 'currency' },
        { id: 'nrr', label: 'Net Revenue Retention', value: 115, change: 3, trend: 'up', change_period: 'vs last quarter', format: 'percent' },
        { id: 'customers', label: 'Total Customers', value: 284, change: 8, trend: 'up', change_period: 'vs last quarter', format: 'number' },
        { id: 'churn', label: 'Monthly Churn', value: 1.8, change: -0.3, trend: 'down', change_period: 'vs last month', format: 'percent' },
        { id: 'burn', label: 'Net Burn Rate', value: -45000, change: -15, trend: 'down', change_period: 'vs last month', format: 'currency' },
      ],
      charts: [
        {
          id: 'revenue-growth',
          type: 'area',
          title: 'Revenue Growth',
          x_key: 'month',
          y_keys: ['revenue', 'expenses'],
          data: [
            { month: 'Jan', revenue: 280000, expenses: 310000 },
            { month: 'Feb', revenue: 295000, expenses: 315000 },
            { month: 'Mar', revenue: 310000, expenses: 320000 },
            { month: 'Apr', revenue: 325000, expenses: 318000 },
            { month: 'May', revenue: 338000, expenses: 322000 },
            { month: 'Jun', revenue: 342000, expenses: 325000 },
            { month: 'Jul', revenue: 350000, expenses: 330000 },
            { month: 'Aug', revenue: 358000, expenses: 328000 },
            { month: 'Sep', revenue: 365000, expenses: 335000 },
            { month: 'Oct', revenue: 370000, expenses: 340000 },
            { month: 'Nov', revenue: 380000, expenses: 338000 },
            { month: 'Dec', revenue: 392000, expenses: 345000 },
          ],
        },
        {
          id: 'dept-performance',
          type: 'bar',
          title: 'Department Goal Attainment',
          x_key: 'department',
          y_keys: ['attainment'],
          data: [
            { department: 'Sales', attainment: 108 },
            { department: 'Marketing', attainment: 95 },
            { department: 'Engineering', attainment: 112 },
            { department: 'Customer Success', attainment: 98 },
            { department: 'Operations', attainment: 104 },
          ],
        },
      ],
    },
  },
];

// ── Template Matching ──────────────────────────────────────────────
//
// Matching priority:
//   1. TEAM CONTEXT — if the user's team name matches a template's departments
//      list, that template is selected regardless of prompt content. This is
//      the primary signal: a Sales team member saying "show me my dashboard"
//      gets the sales template without keyword gymnastics.
//
//   2. KEYWORD FALLBACK — if no department match (or teamName is generic),
//      fall back to primary keyword gating + weighted scoring.
//
// Generic prompts that work via team context:
//   "show me my dashboard"      + Sales team      → sales-pipeline
//   "dashboard"                 + Marketing team   → marketing-performance
//   "what does my data look like" + Executive team → executive-overview
//
// Specific prompts that work via keywords (regardless of team):
//   "show me my pipeline"       → sales-pipeline  (primary: pipeline)
//   "campaign performance"      → marketing        (primary: campaign)
//
// Prompts that fall through to LLM:
//   "build a churn cohort analysis" + Sales team   → no keyword match → LLM

export function matchDashboardTemplate(prompt: string, teamName?: string): DashboardTemplate | null {
  const lower = prompt.toLowerCase();
  const teamLower = (teamName ?? '').toLowerCase();

  // ── Priority 1: Team/department match ──
  // Generic dashboard prompts ("show me my dashboard", "dashboard", "overview")
  // should resolve via team context, not keywords.
  const genericPatterns = ['dashboard', 'show me my', 'my data', 'my metrics', 'my performance', 'my overview'];
  const isGenericPrompt = genericPatterns.some((p) => lower.includes(p));

  if (teamLower && isGenericPrompt) {
    for (const template of DASHBOARD_TEMPLATES) {
      if (template.departments.some((dept) => teamLower.includes(dept) || dept.includes(teamLower))) {
        return template;
      }
    }
  }

  // ── Priority 2: Keyword match ──
  let bestMatch: DashboardTemplate | null = null;
  let bestScore = 0;

  for (const template of DASHBOARD_TEMPLATES) {
    // Gate: must hit at least 1 primary keyword
    const primaryHits = template.primary.filter((kw) => lower.includes(kw));
    if (primaryHits.length === 0) continue;

    // Score: weight primary keywords 3x
    const signalHits = template.keywords.filter((kw) => lower.includes(kw));
    const score =
      (primaryHits.length * 3 + signalHits.length) /
      (template.primary.length * 3 + template.keywords.length);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  return bestMatch;
}

// ── Handler ──────────────────────────────────────────────────────

export interface DashboardTemplateParams {
  taskId: string;
  prompt: string;
  teamName: string;
  org: { id: string; [key: string]: any } | null | undefined;
  project: { team_id: string; [key: string]: any };
  user_id: string;
  auditDepartment: string;
  startedAtMs: number;
  timeline: any[];
  writeAuditLog: (params: any) => void;
}

/**
 * Deterministic JSON dashboard template handler.
 * Stores DashboardData JSON as the task diff — frontend renders via ShadcnDashboard.
 * Returns true if a template matched, false to fall through to LLM.
 */
export async function handleDashboardTemplate(params: DashboardTemplateParams): Promise<boolean> {
  const {
    taskId, prompt, teamName, org, project, user_id,
    auditDepartment, startedAtMs, timeline, writeAuditLog,
  } = params;

  const template = matchDashboardTemplate(prompt, teamName);
  if (!template) return false;

  console.log(`[DASHBOARD-TEMPLATE] Matched "${template.id}" — zero LLM calls`);
  await storage.logEvent(taskId, `Dashboard template matched: ${template.id} (zero LLM calls)`, 'info');
  await storage.updateTaskState(taskId, 'building');

  // Inject brand tokens from org into the theme
  let brandTheme: Record<string, string | undefined> = {};
  if (org?.id) {
    try {
      const { data: brand } = await getPlatformSupabaseClient()
        .from('brand_tokens')
        .select('company_name, primary_color, logo_url, bg_mode')
        .eq('org_id', org.id)
        .limit(1)
        .single();
      if (brand) {
        brandTheme = {
          companyName: brand.company_name ?? undefined,
          primaryColor: brand.primary_color ?? undefined,
          logoUrl: brand.logo_url ?? undefined,
          mode: brand.bg_mode ?? undefined,
        };
      }
    } catch {
      // No brand tokens — use template defaults
    }
  }

  // Merge brand tokens into template data
  const meta = {
    ...template.data.meta,
    generated_at: new Date().toISOString(),
    theme: {
      mode: (brandTheme.mode as 'light' | 'dark' | 'system') ?? 'dark',
      primaryColor: brandTheme.primaryColor ?? undefined,
      logoUrl: brandTheme.logoUrl ?? undefined,
      companyName: brandTheme.companyName ?? undefined,
    },
  };
  // Override title with brand company if available
  if (brandTheme.companyName) {
    meta.title = `${brandTheme.companyName} — ${template.data.meta.title}`;
  }
  const data = { ...template.data, meta };

  // Store as JSON — tryParseDashboardData on the frontend will detect meta+kpis
  await storage.setTaskDiff(taskId, JSON.stringify(data));

  timeline.push({
    step: 'dashboard-template',
    startedAt: new Date(startedAtMs).toISOString(),
    endedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAtMs,
    status: 'completed',
  });

  await storage.logEvent(taskId, `Job Timeline: ${JSON.stringify({
    timeline,
    modelStats: { selected: 'template', modelCalls: 0, retries: 0, fallbacks: 0 },
    totalTokens: 0,
    wallTimeMs: Date.now() - startedAtMs,
  })}`, 'info');
  await storage.updateTaskUsageMetrics(taskId, {
    llm_model: 'template',
    llm_prompt_tokens: 0,
    llm_completion_tokens: 0,
    llm_total_tokens: 0,
  });
  await storage.updateTaskState(taskId, 'completed');
  if (org) {
    writeAuditLog({
      org_id: org.id,
      user_id,
      team_id: project.team_id,
      job_id: taskId,
      artifact_type: 'dashboard',
      generated_output: JSON.stringify(data),
      department: auditDepartment,
    });
  }
  await storage.logEvent(taskId, `Dashboard completed (template: ${template.id} — zero credits consumed)`, 'success');
  return true;
}
