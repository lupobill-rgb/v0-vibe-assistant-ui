import { getPlatformSupabaseClient } from '../supabase/client';
import { getNangoService, ConnectorType, type HubSpotDeal } from '../connectors/nango.service';
import type { GoldenMatch } from '../orchestrator/orchestrator.types';

// --- Design system rules injected AFTER department skills, BEFORE user prompt ---
const DESIGN_SYSTEM_RULES = `
DESIGN SYSTEM — non-negotiable (UbiVibe brand):

COLORS:
- ALL colors via CSS variables: var(--bg), var(--text), var(--primary), var(--surface), var(--border).
- Never hardcode hex values outside the UbiVibe palette. Never use bg-slate-900, bg-slate-950, or any Tailwind color class.
- UbiVibe palette: Vibe Core #00E5A0, Signal #00B4D8, Autonomy #7B61FF, Deep #0A0E17, Surface #0F1420, Light #E8ECF4.
- Gradients: hero sections and primary CTAs use linear-gradient(135deg, #00E5A0 0%, #00B4D8 50%, #7B61FF 100%).
- Signal color: #00B4D8 for secondary highlights, links, active states.
- Autonomy color: #7B61FF for violet accents, secondary actions.

TYPOGRAPHY:
- Headings: font-family 'Syne', sans-serif; font-weight 700-800.
- Body: font-family 'Inter', sans-serif; font-weight 400.
- Scale: text-xs(0.75rem) text-sm(0.875rem) text-base(1rem) text-lg(1.125rem) text-xl(1.25rem) text-2xl(1.5rem) text-3xl(1.875rem) text-4xl(2.25rem).
- Line height: headings 1.2, body 1.6.

SPACING & LAYOUT:
- 8px base grid. All padding/margin/gap in multiples of 0.5rem (8px).
- Border radius: 0.5rem default, 0.75rem cards, 9999px pills.
- Max content width: 1280px centered.

RESPONSIVE:
- Mobile-first. Single breakpoint: @media (min-width: 768px).
- Cards: single column on mobile, grid on desktop.
- Navigation: CSS-only hamburger on mobile, horizontal on desktop.

COMPONENTS:
- Buttons: rounded-lg, font-semibold, px-6 py-3, gradient on primary, border on secondary.
- Cards: var(--surface) bg, 1px solid var(--border), rounded-xl, p-6, hover:shadow-lg transition.
- Inputs: var(--surface) bg, var(--border) border, rounded-lg, px-4 py-2, focus:ring-2 focus:ring-[var(--primary)].
- Navbar: backdrop-blur-md, bg opacity-80, sticky top-0, z-50.

DASHBOARD LAYOUT:
- Sidebar: 240px fixed, var(--surface) bg, border-right var(--border).
- KPI cards: grid 4-col on desktop, 2-col tablet, 1-col mobile. Number large (text-3xl font-bold), label small (text-sm opacity-70).
- Charts: explicit canvas height, Chart.js IIFE pattern, loading skeleton while data loads.
- Data tables: striped rows, sticky header, horizontal scroll on mobile.
- Empty states: centered icon + message + CTA. Never show blank areas.

MOTION:
- Transitions: 200ms ease for hover, 300ms ease for layout changes.
- Scroll animations: .fade-up with IntersectionObserver (opacity 0→1, translateY 30px→0).
- No animation on prefers-reduced-motion.`;

// --- Supabase helper scripts (conditionally injected) ---
const SUPABASE_FORM_HELPERS = `
SUPABASE FORM INTEGRATION — required on every page with a form:
Inject this script in <head> (platform replaces placeholders at deploy time):
<script>
window.__VIBE_SUPABASE_URL__="__SUPABASE_URL__";
window.__VIBE_SUPABASE_ANON_KEY__="__SUPABASE_ANON_KEY__";
</script>
Every <form> must use this pattern instead of action="...formspree...":
<form onsubmit="return vibeSubmitForm(event, this)">
Add this script before </body>:
<script>
async function vibeSubmitForm(e, form) {
  e.preventDefault();
  const btn = form.querySelector('[type=submit]');
  const origText = btn.textContent;
  btn.textContent = 'Sending...'; btn.disabled = true;
  const data = Object.fromEntries(new FormData(form));
  try {
    const res = await fetch(window.__VIBE_SUPABASE_URL__ + '/rest/v1/form_submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': window.__VIBE_SUPABASE_ANON_KEY__,
        'Authorization': 'Bearer ' + window.__VIBE_SUPABASE_ANON_KEY__,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ project_id: document.body.dataset.projectId || '', page_route: location.pathname, form_name: form.dataset.formName || 'contact', payload: data })
    });
    if (res.ok) { form.reset(); const msg = form.querySelector('.form-success'); if (msg) msg.classList.remove('hidden'); }
    else { alert('Something went wrong. Please try again.'); }
  } catch { alert('Network error. Please try again.'); }
  finally { btn.textContent = origText; btn.disabled = false; }
  return false;
}
</script>

LIVE DATA INTEGRATION — required on ALL pages that display Supabase data (including dashboards):
The <head> SUPABASE_URL/ANON_KEY script (see above) must also be present.
Add this script before </body>:
<script>
async function vibeLoadData(table,filters={}){
  const url=window.__VIBE_SUPABASE_URL__;
  const key=window.__VIBE_SUPABASE_ANON_KEY__;
  if(!url||!key){console.error('[VIBE] vibeLoadData: missing URL or key',{url:!!url,key:!!key});return[];}
  let token=key;
  try{const ref=url.split('//')[1].split('.')[0];const s=JSON.parse(localStorage.getItem('sb-'+ref+'-auth-token')||'{}');if(s.access_token)token=s.access_token;}catch(e){}
  let ep=url+'/rest/v1/'+table+'?select=*';
  Object.entries(filters).forEach(([k,v])=>{ep+='&'+k+'=eq.'+v;});
  try{const r=await fetch(ep,{headers:{'apikey':key,'Authorization':'Bearer '+token}});if(!r.ok){console.error('[VIBE] vibeLoadData error:',r.status,await r.text());return[];}return await r.json();}
  catch(e){console.error('[VIBE] vibeLoadData fetch failed:',e);return[];}
}
</script>
VARIABLE NAMES — in all JS code, read credentials from window.__VIBE_SUPABASE_URL__, window.__VIBE_SUPABASE_ANON_KEY__, and window.__VIBE_TEAM_ID__. The double-underscore placeholders (__SUPABASE_URL__ etc.) are ONLY valid inside the <head> assignment scripts where the platform replaces them at deploy time.`;

const SUPABASE_SPEND_HELPER = `
SPEND FORM INTEGRATION — required on any page with an expense or spend form:
The <head> SUPABASE_URL/ANON_KEY script (see above) must also be present.
Add this script in <head> (platform replaces __TEAM_ID__ at deploy time):
<script>window.__VIBE_TEAM_ID__="__TEAM_ID__";</script>
Use this form pattern:
<form onsubmit="return vibeLogSpend(event, this)">
  <select name="category" required>...</select>
  <input name="amount" type="number" step="0.01" min="0" required />
  <input name="description" type="text" />
  <input name="vendor" type="text" />
  <input name="date" type="date" />
  <button type="submit">Log Spend</button>
</form>
Add this script before </body>:
<script>
async function vibeLogSpend(e, form) {
  e.preventDefault();
  const btn = form.querySelector('[type=submit]');
  const origText = btn.textContent;
  btn.textContent = 'Saving...'; btn.disabled = true;
  const fd = Object.fromEntries(new FormData(form));
  try {
    const res = await fetch(window.__VIBE_SUPABASE_URL__ + '/rest/v1/team_spend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': window.__VIBE_SUPABASE_ANON_KEY__,
        'Authorization': 'Bearer ' + window.__VIBE_SUPABASE_ANON_KEY__,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        team_id: window.__VIBE_TEAM_ID__,
        category: fd.category,
        amount: parseFloat(fd.amount),
        description: fd.description || '',
        vendor: fd.vendor || '',
        quarter: Math.ceil((new Date().getMonth() + 1) / 3),
        spend_date: fd.date || new Date().toISOString().split('T')[0]
      })
    });
    if (res.ok) {
      form.reset();
      const msg = form.querySelector('.form-success');
      if (msg) msg.classList.remove('hidden');
      else { const t = document.createElement('div'); t.textContent = 'Spend logged successfully!'; t.className = 'text-green-600 mt-2 font-medium'; form.appendChild(t); setTimeout(() => t.remove(), 3000); }
    } else { alert('Failed to log spend. Please try again.'); }
  } catch { alert('Network error. Please try again.'); }
  finally { btn.textContent = origText; btn.disabled = false; }
  return false;
}
</script>`;

const HELPER_KEYWORDS = [
  'form', 'submit', 'save', 'dashboard', 'data', 'report',
  'spend', 'budget', 'table', 'list', 'load', 'fetch',
];

/**
 * Returns true if resolvedSkills or prompt contains data-related keywords
 * that warrant injecting vibeSubmitForm / vibeLoadData helpers.
 */
export function shouldInjectHelpers(resolvedSkills: string, prompt: string): boolean {
  const combined = (resolvedSkills + ' ' + prompt).toLowerCase();
  return HELPER_KEYWORDS.some(kw => combined.includes(kw));
}

/**
 * vibeLogSpend is ONLY injected when department = 'finance' OR prompt
 * contains 'budget' or 'spend'.
 */
function shouldInjectSpendHelper(department: string, _prompt: string): boolean {
  return department === 'finance';
}

// --- Chart.js loading rules injected into every dashboard/chart context ---
const CHART_LOADING_RULES = `
CHART.JS LOADING — CRITICAL:
- Chart.js CDN MUST be in <head>: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
- Each chart <script> goes IMMEDIATELY after its <canvas>, using an IIFE: (function(){ new Chart(document.getElementById('id'), config); })();
- Every <canvas> needs a unique id and explicit height: <canvas id="chart1" height="200" style="height:200px !important; max-height:200px;"></canvas>
- Use getElementById, NEVER querySelector. Use the global Chart object, NEVER ES module imports.`;

/**
 * Resolves the kernel context string injected before every job prompt.
 * Queries team membership, data scopes, and brand tokens for the given user+org.
 */
export async function resolveKernelContext(userId: string, orgId: string, teamId?: string, prompt?: string, mode?: string): Promise<{ context: string; injectSupabaseHelpers: boolean; connectorNudges: string[] }> {
  const sb = getPlatformSupabaseClient();
  console.log(`[KERNEL] resolveKernelContext called — userId=${userId}, orgId=${orgId}, teamId=${teamId ?? 'auto'}`);

  // 1. Find the user's team and role within this org
  let resolvedTeamId: string | null = null;
  let teamName = 'unknown';
  let role = 'unknown';

  if (teamId) {
    // Direct lookup: we know the exact team
    const { data: membership } = await sb
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .limit(1)
      .single();

    if (membership) {
      role = membership.role ?? 'unknown';
      resolvedTeamId = teamId;
      const { data: t } = await sb.from('teams').select('name').eq('id', teamId).single();
      teamName = t?.name ?? 'unknown';
    }
  }

  // Fallback: find any team membership in this org
  if (!resolvedTeamId) {
    const { data: memberships } = await sb
      .from('team_members')
      .select('role, team_id')
      .eq('user_id', userId);

    if (memberships && memberships.length > 0) {
      // Filter to teams in this org
      const teamIds = memberships.map((m: any) => m.team_id);
      const { data: orgTeams } = await sb
        .from('teams')
        .select('id, name')
        .eq('org_id', orgId)
        .in('id', teamIds)
        .limit(1);

      if (orgTeams && orgTeams.length > 0) {
        resolvedTeamId = orgTeams[0].id;
        teamName = orgTeams[0].name;
        const match = memberships.find((m: any) => m.team_id === resolvedTeamId);
        role = match?.role ?? 'unknown';
      }
    }
  }

  // Fallback: if no team_member row, pick the first team in the org
  if (!resolvedTeamId) {
    console.log(`[KERNEL] No team_member row for user=${userId}, falling back to first org team`);
    const { data: fallbackTeam } = await sb
      .from('teams')
      .select('id, name')
      .eq('org_id', orgId)
      .limit(1)
      .single();

    resolvedTeamId = fallbackTeam?.id ?? null;
    teamName = fallbackTeam?.name ?? 'unknown';
    role = 'Admin';
  }

  // 2. Query data_scopes for owned and readable scopes
  let ownedScopes: string[] = [];
  let readScopes: string[] = [];

  if (resolvedTeamId) {
    const { data: scopes } = await sb
      .from('data_scopes')
      .select('scope_name, scope_type')
      .eq('team_id', resolvedTeamId)
      .in('scope_type', ['owned', 'read']);

    for (const s of scopes ?? []) {
      if (s.scope_type === 'owned') ownedScopes.push(s.scope_name);
      else if (s.scope_type === 'read') readScopes.push(s.scope_name);
    }
  }

  // 3. Query brand_tokens for the org
  const { data: brand } = await sb
    .from('brand_tokens')
    .select('company_name, brand_voice, primary_color, font_heading')
    .eq('org_id', orgId)
    .limit(1)
    .single();

  const companyName = brand?.company_name ?? 'unknown';
  const brandVoice = brand?.brand_voice ?? '';
  const primaryColor = brand?.primary_color ?? '';
  const fontHeading = brand?.font_heading ?? '';

  // 4. Resolve uploaded data tables for this user
  const uploadedData = await resolveUploadedData(sb, userId);

  // 4b. Resolve active Nango connectors + live HubSpot data for this team
  const activeConnectors = resolvedTeamId ? await resolveActiveConnectors(resolvedTeamId) : [];
  const hubSpotData = resolvedTeamId ? await resolveHubSpotData(resolvedTeamId) : '';

  // 4c. Resolve budget context for this team
  const budgetContext = resolvedTeamId ? await resolveBudgetContext(sb, resolvedTeamId) : '';

  // 4d. Resolve published assets this team can see (own + visible teams)
  const publishedAssets = resolvedTeamId ? await resolvePublishedAssets(sb, resolvedTeamId) : '';

  // 4d2. Resolve subscribed cross-team feeds
  const subscribedFeeds = resolvedTeamId ? await resolveSubscribedFeeds(sb, resolvedTeamId) : '';

  // 4e. Resolve department skills for this team (skip for dashboard — saves ~20K tokens)
  const isDashboard = mode === 'dashboard';
  const deptSkillsResult = (resolvedTeamId && !isDashboard)
    ? await resolveDepartmentSkills(sb, resolvedTeamId, teamName, prompt)
    : { text: '', needsSupabaseHelpers: false, connectorNudges: [] as string[] };

  // 5. Format and return
  const visibleTeams = resolvedTeamId ? await resolveVisibleTeams(sb, resolvedTeamId) : '';
  console.log(`[KERNEL] Context assembled — team=${teamName}, role=${role}, ownedScopes=${ownedScopes.length}, readScopes=${readScopes.length}, brand=${companyName}`);

  // Conditional helper injection — skill-driven, not always-on
  // Dashboard mode skips form helpers (no forms) but keeps vibeLoadData via CHART_LOADING_RULES
  const resolvedDept = resolveDepartment(teamName);
  const userPrompt = prompt ?? '';
  const injectHelpers = !isDashboard && shouldInjectHelpers(deptSkillsResult.text, userPrompt);
  const injectSpend = !isDashboard && shouldInjectSpendHelper(resolvedDept, userPrompt);
  let helperBlock = '';
  if (injectHelpers) {
    helperBlock = SUPABASE_FORM_HELPERS;
    if (injectSpend) helperBlock += SUPABASE_SPEND_HELPER;
  }

  const contextStr = `TEAM CONTEXT:
Org: ${companyName}
Team: ${teamName}
Role: ${role}
Data owned: ${ownedScopes.join(', ') || 'none'}
Data readable: ${readScopes.join(', ') || 'none'}
Brand voice: ${brandVoice}
Brand color fallback (only use if user prompt specifies no colors): ${primaryColor}
Font: ${fontHeading}` + visibleTeams + budgetContext + uploadedData
    + publishedAssets
    + subscribedFeeds
    + hubSpotData
    + deptSkillsResult.text
    + helperBlock
    + DESIGN_SYSTEM_RULES
    + CHART_LOADING_RULES
    + (activeConnectors.length > 0 ? `\nACTIVE DATA CONNECTORS:\n${activeConnectors.map(c => `- ${c}`).join('\n')}\nUse these connector names when referencing live data sources.` : '');

  return {
    context: contextStr,
    injectSupabaseHelpers: injectHelpers,
    connectorNudges: deptSkillsResult.connectorNudges,
  };
}

async function resolveUploadedData(supabase: ReturnType<typeof getPlatformSupabaseClient>, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('user_uploads')
    .select('table_name, row_count, columns')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !data || data.length === 0) return '';

  const lines = data.map((u: any) => {
    const cols = typeof u.columns === 'string' ? JSON.parse(u.columns) : u.columns;
    const colList = (cols as { name: string; pgType: string }[])
      .map((c: { name: string; pgType: string }) => `${c.name} (${c.pgType})`)
      .join(', ');
    return `- "${u.table_name}": ${u.row_count} rows [${colList}]`;
  });

  return `\nUPLOADED DATA TABLES:\n${lines.join('\n')}\nUse SELECT * FROM "table_name" WHERE owner_id = auth.uid() to query.`;
}

async function resolveVisibleTeams(supabase: ReturnType<typeof getPlatformSupabaseClient>, teamId: string): Promise<string> {
  const { data, error } = await supabase
    .from('team_visibility')
    .select('target_team_id, visibility_level, teams!target_team_id(name, data_scopes(scope_name, scope_type))')
    .eq('source_team_id', teamId)
    .neq('target_team_id', teamId); // exclude self
  if (error) {
    console.log(`[KERNEL] resolveVisibleTeams error for team=${teamId}: ${error.message}`);
    return '';
  }
  if (!data || data.length === 0) return '';
  const lines = data.map((row: any) => {
    const name = row.teams?.name ?? row.target_team_id;
    const scopes = row.teams?.data_scopes?.map((s: any) => s.scope_name).join(', ') ?? 'unknown';
    return `- ${name}: ${scopes} (${row.visibility_level})`;
  });
  return `\nVISIBLE TEAM DATA:\n${lines.join('\n')}`;
}

async function resolveBudgetContext(
  supabase: ReturnType<typeof getPlatformSupabaseClient>,
  teamId: string,
): Promise<string> {
  const now = new Date();
  const fiscalYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const qCol = `q${currentQuarter}_amount` as const;

  // Fetch allocations for this team + fiscal year
  const { data: allocations, error: allocErr } = await supabase
    .from('budget_allocations')
    .select('id, category, q1_amount, q2_amount, q3_amount, q4_amount')
    .eq('team_id', teamId)
    .eq('fiscal_year', fiscalYear);

  if (allocErr) {
    console.log(`[KERNEL] resolveBudgetContext alloc error for team=${teamId}: ${allocErr.message}`);
    return '';
  }
  if (!allocations || allocations.length === 0) return '';

  // Fetch spend totals grouped by category for current quarter in one query
  const { data: spendRows, error: spendErr } = await supabase
    .from('team_spend')
    .select('category, amount')
    .eq('team_id', teamId)
    .eq('quarter', currentQuarter);

  if (spendErr) {
    console.log(`[KERNEL] resolveBudgetContext spend error for team=${teamId}: ${spendErr.message}`);
  }

  // Aggregate spend by category client-side (Supabase JS doesn't support GROUP BY)
  const spentByCategory = new Map<string, number>();
  for (const row of spendRows ?? []) {
    const cat = (row.category ?? '').toLowerCase();
    spentByCategory.set(cat, (spentByCategory.get(cat) ?? 0) + Number(row.amount));
  }

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  let totalAllocated = 0;
  let totalSpent = 0;

  const lines = allocations.map((a: any) => {
    const allocated = Number(a[qCol] ?? 0);
    const spent = spentByCategory.get((a.category ?? '').toLowerCase()) ?? 0;
    const remaining = allocated - spent;
    const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
    totalAllocated += allocated;
    totalSpent += spent;
    return `- ${a.category}: ${fmt(allocated)} allocated | ${fmt(spent)} spent | ${fmt(remaining)} remaining (${pct}%)`;
  });

  const totalRemaining = totalAllocated - totalSpent;
  const totalPct = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  return `\n--- BUDGET CONTEXT ---
Fiscal Year: ${fiscalYear}
Current Quarter: Q${currentQuarter}
Team Budget:
${lines.join('\n')}
Total: ${fmt(totalAllocated)} allocated | ${fmt(totalSpent)} spent | ${fmt(totalRemaining)} remaining (${totalPct}%)
--- END BUDGET CONTEXT ---`;
}

async function resolvePublishedAssets(
  supabase: ReturnType<typeof getPlatformSupabaseClient>,
  teamId: string,
): Promise<string> {
  // Fetch assets published by this team + teams visible to this team
  const { data: visibleTeamRows } = await supabase
    .from('team_visibility')
    .select('target_team_id')
    .eq('source_team_id', teamId);

  const teamIds = [teamId, ...(visibleTeamRows ?? []).map((r: any) => r.target_team_id)];

  const { data: assets, error } = await supabase
    .from('published_assets')
    .select('asset_type, team_id, original_filename, row_count, column_schema, updated_at, teams!inner(name)')
    .in('team_id', teamIds)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    console.log(`[KERNEL] resolvePublishedAssets error for team=${teamId}: ${error.message}`);
    return '';
  }
  if (!assets || assets.length === 0) return '';

  const lines = assets.map((a: any) => {
    const teamName = a.teams?.name ?? 'unknown';
    const cols = Array.isArray(a.column_schema)
      ? a.column_schema.map((c: any) => c.name).join(', ')
      : '';
    const updated = a.updated_at ? new Date(a.updated_at).toLocaleDateString() : '';
    return `- ${a.asset_type} (from ${teamName}): ${a.original_filename ?? 'unknown'}, ${a.row_count} rows${cols ? ` [${cols}]` : ''} — updated ${updated}`;
  });

  return `\n--- PUBLISHED ASSETS (Marketplace) ---
${lines.join('\n')}
Query via: vibeLoadData('published_assets', {asset_type: '<type>'}) or vibeLoadData('budget_allocations') for budget data.
--- END PUBLISHED ASSETS ---`;
}

async function resolveSubscribedFeeds(
  supabase: ReturnType<typeof getPlatformSupabaseClient>,
  teamId: string,
): Promise<string> {
  const { data: subs, error } = await supabase
    .from('feed_subscriptions')
    .select('asset_id, published_assets!inner(asset_type, original_filename, row_count, column_schema, team_id, teams!inner(name))')
    .eq('subscriber_team_id', teamId)
    .eq('status', 'active')
    .limit(10);

  if (error) {
    console.log(`[KERNEL] resolveSubscribedFeeds error for team=${teamId}: ${error.message}`);
    return '';
  }
  if (!subs || subs.length === 0) return '';

  const lines = subs.map((s: any) => {
    const a = s.published_assets;
    const teamName = a?.teams?.name ?? 'unknown';
    const cols = Array.isArray(a?.column_schema)
      ? a.column_schema.map((c: any) => c.name).join(', ')
      : '';
    return `- ${a?.asset_type} from ${teamName}: ${a?.original_filename ?? 'data feed'}, ${a?.row_count ?? 0} rows${cols ? ` [${cols}]` : ''}`;
  });

  return `\n--- SUBSCRIBED CROSS-TEAM FEEDS ---
This team subscribes to these cross-team data feeds:
${lines.join('\n')}
Use this data to enrich builds when relevant to the user's request.
--- END SUBSCRIBED FEEDS ---`;
}

// --- Department mapping from team name → skill_registry.team_function ---
const DEPARTMENT_MAP: Record<string, string> = {
  sales: 'sales',
  marketing: 'marketing',
  finance: 'finance',
  product: 'product',
  engineering: 'engineering',
  hr: 'hr',
  people: 'hr',
  ops: 'operations',
  operations: 'operations',
  'customer success': 'support',
  cs: 'support',
  support: 'support',
  executive: 'admin',
  exec: 'admin',
  leadership: 'admin',
  design: 'design',
  data: 'data',
  analytics: 'data',
  legal: 'legal',
  admin: 'admin',
  general: 'general',
};

export function resolveDepartment(teamName: string): string {
  const lower = teamName.toLowerCase().trim();
  return DEPARTMENT_MAP[lower] ?? 'general';
}

// --- Connector-to-department mapping ---
const CONNECTOR_DEPT_MAP: Record<string, string[]> = {
  hubspot: ['sales', 'marketing'],
  salesforce: ['sales'],
  airtable: ['operations', 'product', 'engineering'],
  'google-analytics-4': ['marketing'],
};

/** All connector types that have department mappings */
const MAPPED_CONNECTORS = Object.keys(CONNECTOR_DEPT_MAP);

/**
 * Fetches active Nango connectors for a team via NangoService.
 * Returns empty array on failure — never blocks skill resolution.
 */
async function getTeamConnectors(teamId: string): Promise<string[]> {
  try {
    const nango = getNangoService();
    return await nango.listActiveConnections(teamId);
  } catch (err) {
    console.warn('[KERNEL] getTeamConnectors failed (non-blocking):', (err as Error).message);
    return [];
  }
}

/**
 * Returns connectors relevant to a department (connected or available).
 */
function getRelevantConnectors(department: string): string[] {
  return MAPPED_CONNECTORS.filter(c => CONNECTOR_DEPT_MAP[c]?.includes(department));
}

const MAX_SKILL_BYTES = 16 * 1024; // 16KB cap on injected skill text

/**
 * Tokenises a string into lowercase alpha-numeric words for scoring.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
  'she', 'they', 'them', 'their', 'what', 'which', 'who', 'when', 'where',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some',
  'any', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'about', 'above', 'after', 'again', 'also', 'as', 'because',
  'before', 'between', 'if', 'into', 'over', 'then', 'there', 'under',
  'up', 'out', 'use', 'using', 'show', 'build', 'create', 'make', 'get',
]);

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

function tokenizeKeywords(text: string): Set<string> {
  const all = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(all.filter(t => t.length > 2 && !STOP_WORDS.has(t)));
}

/**
 * Scores a skill against prompt tokens using keyword overlap
 * on skill_name + description.
 */
function scoreSkill(skill: { skill_name: string; description: string | null }, promptTokens: Set<string>): number {
  const skillText = `${skill.skill_name} ${skill.description ?? ''}`;
  const skillTokens = tokenize(skillText);
  let score = 0;
  for (const token of Array.from(skillTokens)) {
    if (promptTokens.has(token)) score++;
  }
  return score;
}

/**
 * Checks whether the user prompt closely matches a golden template in skill_registry.
 * Searches ALL active skills (cross-department). Uses bidirectional keyword matching
 * with stop-word filtering to handle both short and long prompts.
 *
 * Scoring: max(forward_ratio, reverse_ratio) where:
 *   forward  = description keywords found in prompt / description keyword count
 *   reverse  = prompt keywords found in description / prompt keyword count
 * This ensures short prompts like "sales pipeline dashboard" can match long descriptions.
 * Minimum 2 keyword overlaps required to prevent single-word false positives.
 */
export async function resolveGoldenTemplateMatch(
  prompt: string,
): Promise<GoldenMatch> {
  const NO_MATCH: GoldenMatch = { matched: false, skillName: '', content: '', htmlSkeleton: null, sampleData: null };
  if (!prompt || prompt.trim().length < 5) return NO_MATCH;

  const sb = getPlatformSupabaseClient();
  const { data: skills, error } = await sb
    .from('skill_registry')
    .select('skill_name, description, content, html_skeleton, sample_data')
    .eq('is_active', true);

  if (error || !skills || skills.length === 0) {
    if (error) console.warn(`[KERNEL] resolveGoldenTemplateMatch error: ${error.message}`);
    return NO_MATCH;
  }

  const promptKeywords = tokenizeKeywords(prompt);
  if (promptKeywords.size < 1) return NO_MATCH;

  let bestScore = 0;
  let bestOverlap = 0;
  let bestSkill: typeof skills[0] | null = null;

  for (const skill of skills) {
    const descKeywords = tokenizeKeywords(`${skill.skill_name} ${skill.description ?? ''}`);
    if (descKeywords.size === 0) continue;

    // Bidirectional overlap: count keywords that appear in both sets
    let overlap = 0;
    for (const token of Array.from(descKeywords)) {
      if (promptKeywords.has(token)) overlap++;
    }

    // Forward: what fraction of description keywords are in the prompt
    const forwardRatio = overlap / descKeywords.size;
    // Reverse: what fraction of prompt keywords are in the description
    let reverseOverlap = 0;
    for (const token of Array.from(promptKeywords)) {
      if (descKeywords.has(token)) reverseOverlap++;
    }
    const reverseRatio = reverseOverlap / promptKeywords.size;

    // Use the higher ratio — this lets short prompts match long descriptions
    const score = Math.max(forwardRatio, reverseRatio);

    if (score > bestScore || (score === bestScore && overlap > bestOverlap)) {
      bestScore = score;
      bestOverlap = overlap;
      bestSkill = skill;
    }
  }

  // Threshold: 25% bidirectional match AND at least 3 overlapping keywords
  // Min 3 prevents weak matches like "track expenses" matching a full finance dashboard
  const MATCH_THRESHOLD = 0.25;
  const MIN_OVERLAP = 2;
  if (bestScore >= MATCH_THRESHOLD && bestOverlap >= MIN_OVERLAP && bestSkill) {
    const hasSkeleton = !!(bestSkill as any).html_skeleton;
    console.log(`[KERNEL] Golden template match: "${bestSkill.skill_name}" (score=${bestScore.toFixed(2)}, overlap=${bestOverlap}, skeleton=${hasSkeleton})`);
    return {
      matched: true,
      skillName: bestSkill.skill_name,
      content: bestSkill.content ?? '',
      htmlSkeleton: (bestSkill as any).html_skeleton ?? null,
      sampleData: (bestSkill as any).sample_data ?? null,
    };
  }

  console.log(`[KERNEL] No golden template match (best score=${bestScore.toFixed(2)}, overlap=${bestOverlap}, needed score>=${MATCH_THRESHOLD} + overlap>=${MIN_OVERLAP})`);
  return NO_MATCH;
}

/**
 * Resolves department-specific skills from skill_registry for a given team.
 * Maps team name → department, fetches active skills, scores against prompt,
 * returns top 2–3 skills capped at 16KB. Falls back to 'general' department.
 */
export async function resolveDepartmentSkills(
  supabase: ReturnType<typeof getPlatformSupabaseClient>,
  teamId: string,
  teamName: string,
  prompt?: string,
): Promise<{ text: string; needsSupabaseHelpers: boolean; connectorNudges: string[] }> {
  const resolvedDept = resolveDepartment(teamName);

  // Query skills for the resolved department
  const { data: skills, error } = await supabase
    .from('skill_registry')
    .select('skill_name, description, content')
    .eq('team_function', resolvedDept)
    .eq('is_active', true)
    .order('skill_name', { ascending: true });

  if (error) {
    console.log(`[KERNEL] resolveDepartmentSkills error for team=${teamId}: ${error.message}`);
    return { text: '', needsSupabaseHelpers: false, connectorNudges: [] };
  }

  let finalSkills = skills ?? [];

  // Fallback to 'general' if no skills found for this department
  if (finalSkills.length === 0 && resolvedDept !== 'general') {
    const { data: generalSkills } = await supabase
      .from('skill_registry')
      .select('skill_name, description, content')
      .eq('team_function', 'general')
      .eq('is_active', true)
      .order('skill_name', { ascending: true });
    finalSkills = generalSkills ?? [];
  }

  if (finalSkills.length === 0) return { text: '', needsSupabaseHelpers: false, connectorNudges: [] };

  // Score skills against prompt and select top 2-3
  let selected: typeof finalSkills;
  if (prompt && prompt.trim().length > 0) {
    const promptTokens = tokenize(prompt);
    const scored = finalSkills.map(s => ({ skill: s, score: scoreSkill(s, promptTokens) }));
    scored.sort((a, b) => b.score - a.score);
    selected = scored.slice(0, 3).map(s => s.skill);
  } else {
    selected = finalSkills.slice(0, 3);
  }

  // Concatenate content and cap at 16KB
  let skillBlock = selected
    .map((s: any) => `[${s.skill_name}]\n${s.content}`)
    .join('\n\n');
  if (skillBlock.length > MAX_SKILL_BYTES) {
    skillBlock = skillBlock.slice(0, MAX_SKILL_BYTES);
  }

  // --- Connector awareness: check Nango for active connections ---
  const relevantConnectors = getRelevantConnectors(resolvedDept);
  const connectorNudges: string[] = [];

  if (relevantConnectors.length > 0) {
    const activeConnectors = await getTeamConnectors(teamId);
    const activeSet = new Set(activeConnectors);

    for (const connector of relevantConnectors) {
      const label = connector.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      if (activeSet.has(connector)) {
        // Connected — append data source context to skill block
        skillBlock += `\n\nCONNECTED DATA SOURCE: ${label} — use vibeLoadData() to pull live ${connectorDataHint(connector)} data`;
        console.log(`[KERNEL] Connector ${connector} active for team=${teamId}, appending to skills`);
      } else {
        // Available but not connected — flag for vibePrompt nudge
        connectorNudges.push(connector);
        console.log(`[KERNEL] Connector ${connector} available but not connected for team=${teamId}`);
      }
    }
  }

  const needsHelpers = shouldInjectHelpers(skillBlock, prompt ?? '');
  console.log(`[KERNEL] Injected ${selected.length}/${finalSkills.length} department skills (${resolvedDept}) for team ${teamId}, supabaseHelpers=${needsHelpers}, nudges=${connectorNudges.length}`);
  return {
    text: `\n--- DEPARTMENT SKILLS (${resolvedDept}) ---\n${skillBlock}\n--- END DEPARTMENT SKILLS ---`,
    needsSupabaseHelpers: needsHelpers,
    connectorNudges,
  };
}

/** Returns a human-readable data hint for each connector type */
function connectorDataHint(connector: string): string {
  switch (connector) {
    case 'hubspot': return 'deal/contact';
    case 'salesforce': return 'opportunity/lead';
    case 'airtable': return 'base/record';
    case 'google-analytics-4': return 'traffic/conversion';
    default: return 'integration';
  }
}

async function resolveActiveConnectors(teamId: string): Promise<string[]> {
  try {
    const nango = getNangoService();
    return await nango.listActiveConnections(teamId);
  } catch (err) {
    console.error('[KERNEL] resolveActiveConnectors error:', err);
    return [];
  }
}

/**
 * Fetches live HubSpot deal + contact summaries when the team has an active
 * HubSpot connection. Injected into kernel context so the LLM can build
 * dashboards with real data.
 */
async function resolveHubSpotData(teamId: string): Promise<string> {
  try {
    const nango = getNangoService();
    const connection = await nango.getConnection(teamId, ConnectorType.HUBSPOT);
    if (!connection) return '';

    const [deals, contacts] = await Promise.all([
      nango.fetchHubSpotDeals(teamId).catch((): HubSpotDeal[] => []),
      nango.fetchHubSpotContacts(teamId).catch(() => [] as { id: string; name: string; email: string; company: string | null }[]),
    ]);

    if (deals.length === 0 && contacts.length === 0) return '';

    const lines: string[] = [];
    lines.push('\n--- HUBSPOT LIVE DATA ---');

    if (deals.length > 0) {
      const totalValue = deals.reduce((sum: number, d) => sum + (d.amount ?? 0), 0);
      const stages = new Map<string, number>();
      for (const d of deals) {
        stages.set(d.stage, (stages.get(d.stage) ?? 0) + 1);
      }
      lines.push(`Deals: ${deals.length} total, pipeline value $${totalValue.toLocaleString()}`);
      lines.push(`Stages: ${Array.from(stages.entries()).map(([s, n]) => `${s}(${n})`).join(', ')}`);
      // Include top 10 deals for the LLM to reference
      lines.push('Recent deals:');
      for (const d of deals.slice(0, 10)) {
        lines.push(`  - ${d.name}: ${d.stage} | $${d.amount ?? 0} | close ${d.close_date ?? 'TBD'}`);
      }
    }

    if (contacts.length > 0) {
      lines.push(`Contacts: ${contacts.length} total`);
      for (const c of contacts.slice(0, 10)) {
        lines.push(`  - ${c.name} <${c.email}>${c.company ? ` @ ${c.company}` : ''}`);
      }
    }

    lines.push('--- END HUBSPOT LIVE DATA ---');
    console.log(`[KERNEL] HubSpot data injected: ${deals.length} deals, ${contacts.length} contacts for team ${teamId}`);
    return lines.join('\n');
  } catch (err) {
    console.error('[KERNEL] resolveHubSpotData error:', err);
    return '';
  }
}
