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
import { getNangoService } from '../connectors/nango.service';
import { getCachedOrFetch } from '../connectors/connector-cache.service';

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
  // ── Phase 4: Industry Templates ──────────────────────────────────
  {
    id: 'clinical-trials',
    departments: ['pharma', 'clinical', 'research', 'biotech', 'medical affairs', 'regulatory'],
    primary: ['clinical', 'trial', 'pharma', 'patients', 'enrollment'],
    keywords: ['endpoints', 'sites', 'adverse', 'safety', 'protocol', 'fda', 'phase'],
    data: {
      meta: {
        title: 'Clinical Trial Dashboard',
        subtitle: 'Trial Performance & Patient Enrollment',
        department: 'Clinical',
        generated_at: new Date().toISOString(),
        data_source: 'sample',
      },
      kpis: [
        { id: 'enrolled', label: 'Patients Enrolled', value: 847, change: 6.3, trend: 'up', change_period: 'vs last month', format: 'number' },
        { id: 'target', label: 'Enrollment Target', value: 1200, format: 'number' },
        { id: 'enrollment-rate', label: 'Enrollment Rate', value: 70.6, change: 4.1, trend: 'up', change_period: 'vs plan', format: 'percent' },
        { id: 'sites-active', label: 'Active Sites', value: 38, change: 3, trend: 'up', change_period: 'vs last month', format: 'number' },
        { id: 'screen-fail', label: 'Screen Failure Rate', value: 22.4, change: -2.1, trend: 'down', change_period: 'vs last quarter', format: 'percent' },
        { id: 'aes', label: 'Adverse Events (Total)', value: 124, change: 8, trend: 'up', change_period: 'cumulative', format: 'number' },
      ],
      charts: [
        {
          id: 'enrollment-curve',
          type: 'area',
          title: 'Enrollment Curve (Actual vs Planned)',
          x_key: 'month',
          y_keys: ['actual', 'planned'],
          data: [
            { month: 'Jan', actual: 45, planned: 60 },
            { month: 'Feb', actual: 112, planned: 140 },
            { month: 'Mar', actual: 198, planned: 230 },
            { month: 'Apr', actual: 310, planned: 330 },
            { month: 'May', actual: 425, planned: 440 },
            { month: 'Jun', actual: 538, planned: 560 },
            { month: 'Jul', actual: 642, planned: 680 },
            { month: 'Aug', actual: 735, planned: 800 },
            { month: 'Sep', actual: 790, planned: 920 },
            { month: 'Oct', actual: 820, planned: 1040 },
            { month: 'Nov', actual: 835, planned: 1120 },
            { month: 'Dec', actual: 847, planned: 1200 },
          ],
        },
        {
          id: 'site-performance',
          type: 'bar',
          title: 'Top Sites by Enrollment',
          x_key: 'site',
          y_keys: ['enrolled'],
          data: [
            { site: 'Johns Hopkins', enrolled: 82 },
            { site: 'Mayo Clinic', enrolled: 74 },
            { site: 'Cleveland Clinic', enrolled: 68 },
            { site: 'Mass General', enrolled: 61 },
            { site: 'UCSF Medical', enrolled: 55 },
            { site: 'Duke Health', enrolled: 48 },
          ],
        },
      ],
      tables: [
        {
          id: 'ae-summary',
          title: 'Adverse Event Summary',
          columns: [
            { key: 'category', label: 'Category' },
            { key: 'total', label: 'Total' },
            { key: 'serious', label: 'Serious' },
            { key: 'related', label: 'Drug-Related' },
            { key: 'resolved', label: 'Resolved' },
          ],
          rows: [
            { category: 'Gastrointestinal', total: 34, serious: 3, related: 12, resolved: 28 },
            { category: 'Neurological', total: 22, serious: 5, related: 8, resolved: 16 },
            { category: 'Dermatological', total: 28, serious: 1, related: 15, resolved: 25 },
            { category: 'Cardiovascular', total: 18, serious: 6, related: 4, resolved: 12 },
            { category: 'Musculoskeletal', total: 22, serious: 2, related: 9, resolved: 19 },
          ],
        },
      ],
      alerts: [
        { id: 'enrollment-lag', severity: 'warning', message: 'Enrollment is 29.4% behind planned target. Consider activating 4 standby sites.' },
        { id: 'safety-signal', severity: 'info', message: 'DSMB review scheduled for next month. No stopping rules triggered.' },
      ],
    },
  },
  {
    id: 'youth-sports',
    departments: ['sports', 'athletics', 'coaching', 'recreation', 'league'],
    primary: ['sports', 'athlete', 'player', 'players', 'season', 'league'],
    keywords: ['roster', 'stats', 'game', 'score', 'standings', 'coach', 'team standings'],
    data: {
      meta: {
        title: 'Youth Sports Dashboard',
        subtitle: 'Season Performance & Team Analytics',
        department: 'Athletics',
        generated_at: new Date().toISOString(),
        data_source: 'sample',
      },
      kpis: [
        { id: 'win-pct', label: 'Win Percentage', value: 68, change: 5, trend: 'up', change_period: 'vs last season', format: 'percent' },
        { id: 'active-players', label: 'Active Players', value: 186, format: 'number' },
        { id: 'teams', label: 'Teams', value: 12, format: 'number' },
        { id: 'games-played', label: 'Games Played', value: 94, change: 12, trend: 'up', change_period: 'this season', format: 'number' },
        { id: 'avg-attendance', label: 'Avg Attendance', value: 245, change: 8.3, trend: 'up', change_period: 'vs last season', format: 'number' },
        { id: 'injuries', label: 'Injury Reports', value: 7, change: -3, trend: 'down', change_period: 'vs last season', format: 'number' },
      ],
      charts: [
        {
          id: 'standings',
          type: 'bar',
          title: 'League Standings (Wins)',
          x_key: 'team',
          y_keys: ['wins', 'losses'],
          data: [
            { team: 'Eagles', wins: 14, losses: 2 },
            { team: 'Tigers', wins: 12, losses: 4 },
            { team: 'Wolves', wins: 10, losses: 6 },
            { team: 'Hawks', wins: 9, losses: 7 },
            { team: 'Bears', wins: 8, losses: 8 },
            { team: 'Lions', wins: 6, losses: 10 },
          ],
        },
        {
          id: 'attendance-trend',
          type: 'line',
          title: 'Weekly Attendance Trend',
          x_key: 'week',
          y_keys: ['attendance'],
          data: [
            { week: 'Week 1', attendance: 180 },
            { week: 'Week 2', attendance: 210 },
            { week: 'Week 3', attendance: 195 },
            { week: 'Week 4', attendance: 240 },
            { week: 'Week 5', attendance: 265 },
            { week: 'Week 6', attendance: 230 },
            { week: 'Week 7', attendance: 285 },
            { week: 'Week 8', attendance: 310 },
            { week: 'Week 9', attendance: 275 },
            { week: 'Week 10', attendance: 295 },
          ],
        },
      ],
      tables: [
        {
          id: 'top-scorers',
          title: 'Top Scorers',
          columns: [
            { key: 'player', label: 'Player' },
            { key: 'team', label: 'Team' },
            { key: 'goals', label: 'Goals' },
            { key: 'assists', label: 'Assists' },
            { key: 'games', label: 'Games' },
          ],
          rows: [
            { player: 'Alex Martinez', team: 'Eagles', goals: 18, assists: 7, games: 16 },
            { player: 'Jordan Smith', team: 'Tigers', goals: 15, assists: 11, games: 16 },
            { player: 'Sam Williams', team: 'Eagles', goals: 14, assists: 5, games: 15 },
            { player: 'Riley Johnson', team: 'Wolves', goals: 12, assists: 9, games: 16 },
            { player: 'Casey Brown', team: 'Hawks', goals: 11, assists: 8, games: 14 },
          ],
        },
      ],
    },
  },
  {
    id: 'hr-people',
    departments: ['hr', 'human resources', 'people', 'people ops', 'talent'],
    primary: ['hr', 'hiring', 'headcount', 'people', 'retention'],
    keywords: ['attrition', 'turnover', 'onboarding', 'engagement', 'diversity', 'open roles'],
    data: {
      meta: {
        title: 'People & HR Dashboard',
        subtitle: 'Headcount, Hiring & Retention',
        department: 'Human Resources',
        generated_at: new Date().toISOString(),
        data_source: 'sample',
      },
      kpis: [
        { id: 'headcount', label: 'Total Headcount', value: 342, change: 4.2, trend: 'up', change_period: 'vs last quarter', format: 'number' },
        { id: 'open-roles', label: 'Open Roles', value: 28, change: -5, trend: 'down', change_period: 'vs last month', format: 'number' },
        { id: 'attrition', label: 'Annual Attrition', value: 8.4, change: -1.2, trend: 'down', change_period: 'vs last year', format: 'percent' },
        { id: 'time-to-fill', label: 'Avg Time to Fill', value: '34 days', change: -6, trend: 'down', change_period: 'vs last quarter', format: 'text' },
        { id: 'enps', label: 'eNPS Score', value: 42, change: 5, trend: 'up', change_period: 'vs last survey', format: 'number' },
        { id: 'new-hires', label: 'New Hires (QTD)', value: 18, format: 'number' },
      ],
      charts: [
        {
          id: 'headcount-trend',
          type: 'area',
          title: 'Headcount Growth',
          x_key: 'quarter',
          y_keys: ['headcount', 'target'],
          data: [
            { quarter: 'Q1 2025', headcount: 280, target: 290 },
            { quarter: 'Q2 2025', headcount: 298, target: 310 },
            { quarter: 'Q3 2025', headcount: 315, target: 330 },
            { quarter: 'Q4 2025', headcount: 328, target: 345 },
            { quarter: 'Q1 2026', headcount: 342, target: 360 },
          ],
        },
        {
          id: 'dept-breakdown',
          type: 'bar',
          title: 'Headcount by Department',
          x_key: 'department',
          y_keys: ['count'],
          data: [
            { department: 'Engineering', count: 124 },
            { department: 'Sales', count: 68 },
            { department: 'Marketing', count: 42 },
            { department: 'Operations', count: 38 },
            { department: 'Customer Success', count: 35 },
            { department: 'G&A', count: 35 },
          ],
        },
      ],
    },
  },
  {
    id: 'operations',
    departments: ['operations', 'ops', 'supply chain', 'logistics', 'warehouse'],
    primary: ['operations', 'ops', 'supply chain', 'logistics'],
    keywords: ['inventory', 'throughput', 'sla', 'capacity', 'uptime', 'fulfillment'],
    data: {
      meta: {
        title: 'Operations Command Center',
        subtitle: 'Throughput, SLA & Capacity',
        department: 'Operations',
        generated_at: new Date().toISOString(),
        data_source: 'sample',
      },
      kpis: [
        { id: 'throughput', label: 'Daily Throughput', value: 12450, change: 3.8, trend: 'up', change_period: 'vs last week', format: 'number' },
        { id: 'sla', label: 'SLA Compliance', value: 97.2, change: 0.8, trend: 'up', change_period: 'vs last month', format: 'percent' },
        { id: 'uptime', label: 'System Uptime', value: 99.95, format: 'percent' },
        { id: 'backlog', label: 'Backlog Items', value: 184, change: -12, trend: 'down', change_period: 'vs last week', format: 'number' },
        { id: 'capacity', label: 'Capacity Utilization', value: 78, change: 2, trend: 'up', change_period: 'vs last month', format: 'percent' },
        { id: 'incidents', label: 'Open Incidents', value: 3, change: -2, trend: 'down', change_period: 'vs last week', format: 'number' },
      ],
      charts: [
        {
          id: 'throughput-trend',
          type: 'area',
          title: 'Daily Throughput (30 Days)',
          x_key: 'day',
          y_keys: ['processed', 'target'],
          data: Array.from({ length: 12 }, (_, i) => ({
            day: `Apr ${i + 1}`,
            processed: 11000 + Math.round(Math.sin(i * 0.5) * 1500 + i * 120),
            target: 12000,
          })),
        },
        {
          id: 'sla-by-category',
          type: 'bar',
          title: 'SLA Compliance by Category',
          x_key: 'category',
          y_keys: ['compliance'],
          data: [
            { category: 'Fulfillment', compliance: 98.5 },
            { category: 'Support', compliance: 96.8 },
            { category: 'Delivery', compliance: 97.1 },
            { category: 'Returns', compliance: 94.2 },
            { category: 'Onboarding', compliance: 99.1 },
          ],
        },
      ],
    },
  },
  {
    id: 'finance-pnl',
    departments: ['finance', 'accounting', 'fp&a', 'treasury'],
    primary: ['finance', 'p&l', 'budget', 'revenue'],
    keywords: ['expenses', 'margin', 'burn', 'ebitda', 'cash', 'forecast', 'variance'],
    data: {
      meta: {
        title: 'Finance & P&L Dashboard',
        subtitle: 'Revenue, Expenses & Margin Analysis',
        department: 'Finance',
        generated_at: new Date().toISOString(),
        data_source: 'sample',
      },
      kpis: [
        { id: 'revenue', label: 'Total Revenue', value: 4850000, change: 18, trend: 'up', change_period: 'YoY', format: 'currency' },
        { id: 'gross-margin', label: 'Gross Margin', value: 72.5, change: 2.3, trend: 'up', change_period: 'vs last quarter', format: 'percent' },
        { id: 'opex', label: 'Operating Expenses', value: 2100000, change: 5.2, trend: 'up', change_period: 'vs budget', format: 'currency' },
        { id: 'net-income', label: 'Net Income', value: 680000, change: 22, trend: 'up', change_period: 'YoY', format: 'currency' },
        { id: 'runway', label: 'Cash Runway', value: '18 months', format: 'text' },
        { id: 'arr', label: 'ARR', value: 5200000, change: 24, trend: 'up', change_period: 'YoY', format: 'currency' },
      ],
      charts: [
        {
          id: 'revenue-expenses',
          type: 'area',
          title: 'Revenue vs Expenses',
          x_key: 'month',
          y_keys: ['revenue', 'expenses'],
          data: [
            { month: 'Jan', revenue: 380000, expenses: 320000 },
            { month: 'Feb', revenue: 395000, expenses: 325000 },
            { month: 'Mar', revenue: 410000, expenses: 330000 },
            { month: 'Apr', revenue: 420000, expenses: 335000 },
            { month: 'May', revenue: 435000, expenses: 340000 },
            { month: 'Jun', revenue: 445000, expenses: 348000 },
            { month: 'Jul', revenue: 460000, expenses: 352000 },
            { month: 'Aug', revenue: 470000, expenses: 358000 },
            { month: 'Sep', revenue: 485000, expenses: 362000 },
            { month: 'Oct', revenue: 495000, expenses: 368000 },
            { month: 'Nov', revenue: 510000, expenses: 372000 },
            { month: 'Dec', revenue: 520000, expenses: 378000 },
          ],
        },
        {
          id: 'expense-breakdown',
          type: 'bar',
          title: 'Expense Breakdown (Monthly)',
          x_key: 'category',
          y_keys: ['amount'],
          data: [
            { category: 'Payroll', amount: 195000 },
            { category: 'Infrastructure', amount: 45000 },
            { category: 'Marketing', amount: 38000 },
            { category: 'Sales', amount: 32000 },
            { category: 'R&D', amount: 28000 },
            { category: 'G&A', amount: 22000 },
          ],
        },
      ],
    },
  },
  {
    id: 'customer-success',
    departments: ['customer success', 'cs', 'support', 'client services', 'account management'],
    primary: ['customer success', 'churn', 'nps', 'retention'],
    keywords: ['health', 'renewal', 'onboarding', 'csat', 'tickets', 'expansion'],
    data: {
      meta: {
        title: 'Customer Success Dashboard',
        subtitle: 'Health Scores, Retention & Satisfaction',
        department: 'Customer Success',
        generated_at: new Date().toISOString(),
        data_source: 'sample',
      },
      kpis: [
        { id: 'nps', label: 'NPS Score', value: 62, change: 8, trend: 'up', change_period: 'vs last quarter', format: 'number' },
        { id: 'churn', label: 'Monthly Churn', value: 1.6, change: -0.4, trend: 'down', change_period: 'vs last month', format: 'percent' },
        { id: 'nrr', label: 'Net Revenue Retention', value: 118, change: 3, trend: 'up', change_period: 'vs last quarter', format: 'percent' },
        { id: 'csat', label: 'CSAT Score', value: 4.6, change: 0.2, trend: 'up', change_period: 'vs last month', format: 'number' },
        { id: 'health-green', label: 'Healthy Accounts', value: 78, format: 'percent' },
        { id: 'renewals', label: 'Renewals Due (90d)', value: 42, format: 'number' },
      ],
      charts: [
        {
          id: 'health-distribution',
          type: 'bar',
          title: 'Account Health Distribution',
          x_key: 'status',
          y_keys: ['accounts'],
          data: [
            { status: 'Healthy', accounts: 185 },
            { status: 'Neutral', accounts: 38 },
            { status: 'At Risk', accounts: 14 },
            { status: 'Red', accounts: 5 },
          ],
        },
        {
          id: 'nps-trend',
          type: 'line',
          title: 'NPS Trend',
          x_key: 'quarter',
          y_keys: ['nps'],
          data: [
            { quarter: 'Q1 2025', nps: 45 },
            { quarter: 'Q2 2025', nps: 48 },
            { quarter: 'Q3 2025', nps: 54 },
            { quarter: 'Q4 2025', nps: 58 },
            { quarter: 'Q1 2026', nps: 62 },
          ],
        },
      ],
      alerts: [
        { id: 'at-risk', severity: 'warning', message: '5 accounts flagged as Red health — review scheduled with CS leads this week.' },
        { id: 'expansion', severity: 'info', message: '12 accounts showing expansion signals (usage >150% of plan). Notify sales.' },
      ],
    },
  },
  {
    id: 'product-analytics',
    departments: ['product', 'product management', 'pm', 'ux'],
    primary: ['product', 'usage', 'adoption', 'feature', 'dau'],
    keywords: ['mau', 'funnel', 'activation', 'engagement', 'retention', 'stickiness'],
    data: {
      meta: {
        title: 'Product Analytics Dashboard',
        subtitle: 'Usage, Adoption & Engagement',
        department: 'Product',
        generated_at: new Date().toISOString(),
        data_source: 'sample',
      },
      kpis: [
        { id: 'dau', label: 'Daily Active Users', value: 8420, change: 12.5, trend: 'up', change_period: 'vs last month', format: 'number' },
        { id: 'mau', label: 'Monthly Active Users', value: 34500, change: 8.2, trend: 'up', change_period: 'vs last month', format: 'number' },
        { id: 'stickiness', label: 'DAU/MAU Ratio', value: 24.4, change: 1.8, trend: 'up', change_period: 'vs last month', format: 'percent' },
        { id: 'activation', label: 'Activation Rate', value: 58, change: 3.5, trend: 'up', change_period: 'vs last quarter', format: 'percent' },
        { id: 'retention-d7', label: 'Day-7 Retention', value: 42, change: 2.1, trend: 'up', change_period: 'vs last month', format: 'percent' },
        { id: 'avg-session', label: 'Avg Session', value: '6.2 min', change: 8, trend: 'up', change_period: 'vs last month', format: 'text' },
      ],
      charts: [
        {
          id: 'dau-trend',
          type: 'area',
          title: 'Daily Active Users (30 Days)',
          x_key: 'day',
          y_keys: ['users'],
          data: Array.from({ length: 14 }, (_, i) => ({
            day: `Apr ${i + 1}`,
            users: 7500 + Math.round(Math.sin(i * 0.4) * 800 + i * 65),
          })),
        },
        {
          id: 'feature-adoption',
          type: 'bar',
          title: 'Feature Adoption Rate',
          x_key: 'feature',
          y_keys: ['adoption'],
          data: [
            { feature: 'Dashboard Builder', adoption: 82 },
            { feature: 'Data Connectors', adoption: 64 },
            { feature: 'Team Sharing', adoption: 58 },
            { feature: 'Export/PDF', adoption: 45 },
            { feature: 'API Access', adoption: 28 },
            { feature: 'Custom Themes', adoption: 22 },
          ],
        },
      ],
      tables: [
        {
          id: 'funnel',
          title: 'Activation Funnel',
          columns: [
            { key: 'step', label: 'Step' },
            { key: 'users', label: 'Users' },
            { key: 'rate', label: 'Conversion' },
            { key: 'dropoff', label: 'Drop-off' },
          ],
          rows: [
            { step: 'Sign Up', users: '12,400', rate: '100%', dropoff: '-' },
            { step: 'Onboarding Complete', users: '9,300', rate: '75%', dropoff: '25%' },
            { step: 'First Build', users: '7,200', rate: '58%', dropoff: '17%' },
            { step: 'Team Invite', users: '4,100', rate: '33%', dropoff: '25%' },
            { step: 'Second Week Return', users: '3,400', rate: '27%', dropoff: '6%' },
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

  // ── Live data fetch — replace sample data with connected CRM data ──
  let liveData: typeof template.data | null = null;
  const teamId = project.team_id;
  if (teamId) {
    try {
      const nango = getNangoService();
      const activeConnectors = await nango.listActiveConnections(teamId);
      const hasHubSpot = activeConnectors.includes('hubspot' as any);
      const hasSalesforce = activeConnectors.includes('salesforce' as any);

      if ((hasHubSpot || hasSalesforce) && template.id === 'sales-pipeline') {
        liveData = await buildLiveSalesPipeline(teamId, hasHubSpot ? 'hubspot' : 'salesforce');
        await storage.logEvent(taskId, `Live CRM data fetched for ${template.id} (${hasHubSpot ? 'HubSpot' : 'Salesforce'})`, 'info');
      }
      // Future: add live data transforms for other templates
      // e.g. marketing-performance from GA4/Mixpanel, finance from Snowflake, etc.
    } catch (err: any) {
      console.warn(`[DASHBOARD-TEMPLATE] Live data fetch failed, using sample data: ${err.message}`);
      await storage.logEvent(taskId, `Live data fetch failed (falling back to sample): ${err.message}`, 'warning');
    }
  }

  // Merge brand tokens into template data
  const baseData = liveData ?? template.data;
  const meta = {
    ...baseData.meta,
    generated_at: new Date().toISOString(),
    data_source: liveData ? 'connected' as const : baseData.meta.data_source,
    theme: {
      mode: (brandTheme.mode as 'light' | 'dark' | 'system') ?? 'dark',
      primaryColor: brandTheme.primaryColor ?? undefined,
      logoUrl: brandTheme.logoUrl ?? undefined,
      companyName: brandTheme.companyName ?? undefined,
    },
  };
  if (brandTheme.companyName) {
    meta.title = `${brandTheme.companyName} — ${baseData.meta.title}`;
  }
  const data = { ...baseData, meta };

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
  await storage.logEvent(taskId, `Dashboard completed (template: ${template.id}${liveData ? ' + live data' : ''} — zero credits consumed)`, 'success');
  return true;
}

// ── Live Data Transformers ──────────────────────────────────────────
// Each transformer fetches data from a connected provider and returns
// a DashboardData-shaped object that replaces the template's sample data.
// Provider-agnostic: uses NangoService.fetchRecords or typed helpers.

async function buildLiveSalesPipeline(teamId: string, provider: string): Promise<typeof DASHBOARD_TEMPLATES[0]['data']> {
  // Fetch deals through cache layer — provider-agnostic
  const model = provider === 'hubspot' ? 'deals' : 'Deal';
  const cached = await getCachedOrFetch(teamId, provider, model);
  const deals = cached.records as any[];

  if (!deals.length) throw new Error('No deals found in connected CRM');
  console.log(`[DASHBOARD-TEMPLATE] Live deals: ${deals.length} records (${cached.from_cache ? 'from cache' : 'fresh fetch'})`);

  // ── KPIs from live deals ──
  const totalValue = deals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const dealCount = deals.length;
  const avgDeal = dealCount > 0 ? Math.round(totalValue / dealCount) : 0;
  const closedWon = deals.filter((d) => /closed.*won|closedwon/i.test(d.stage ?? ''));
  const winRate = dealCount > 0 ? Math.round((closedWon.length / dealCount) * 100) : 0;

  // ── Funnel chart from deal stages ──
  const stageCounts: Record<string, { value: number; count: number }> = {};
  for (const deal of deals) {
    const stage = deal.stage || 'Unknown';
    if (!stageCounts[stage]) stageCounts[stage] = { value: 0, count: 0 };
    stageCounts[stage].value += deal.amount ?? 0;
    stageCounts[stage].count += 1;
  }
  const funnelData = Object.entries(stageCounts)
    .sort((a, b) => b[1].value - a[1].value)
    .map(([stage, { value, count }]) => ({ stage, value, count }));

  // ── Top deals table ──
  const topDeals = [...deals]
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    .slice(0, 10)
    .map((d) => ({
      deal: d.name || 'Unnamed Deal',
      stage: d.stage || 'Unknown',
      value: d.amount ? `$${Number(d.amount).toLocaleString()}` : '-',
      close_date: d.close_date ? new Date(d.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-',
      owner: d.owner || '-',
    }));

  return {
    meta: {
      title: 'Sales Pipeline Dashboard',
      subtitle: 'Live CRM Data',
      department: 'Sales',
      generated_at: new Date().toISOString(),
      data_source: 'connected',
    },
    kpis: [
      { id: 'pipeline-value', label: 'Total Pipeline Value', value: totalValue, format: 'currency' },
      { id: 'deal-count', label: 'Open Deals', value: dealCount, format: 'number' },
      { id: 'win-rate', label: 'Win Rate', value: winRate, format: 'percent' },
      { id: 'avg-deal', label: 'Average Deal Size', value: avgDeal, format: 'currency' },
      { id: 'closed-won', label: 'Closed Won', value: closedWon.length, format: 'number' },
    ],
    charts: [
      {
        id: 'funnel',
        type: 'bar',
        title: 'Pipeline by Stage',
        x_key: 'stage',
        y_keys: ['value'],
        data: funnelData,
      },
    ],
    tables: [
      {
        id: 'top-deals',
        title: 'Top Deals',
        columns: [
          { key: 'deal', label: 'Deal Name' },
          { key: 'stage', label: 'Stage' },
          { key: 'value', label: 'Value' },
          { key: 'close_date', label: 'Expected Close' },
          { key: 'owner', label: 'Owner' },
        ],
        rows: topDeals,
      },
    ],
  };
}
