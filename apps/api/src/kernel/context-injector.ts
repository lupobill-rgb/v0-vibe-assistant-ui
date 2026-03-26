import { getPlatformSupabaseClient } from '../supabase/client';

// ── Design System Rules (Sprint 4) ──────────────────────────────────────────
// Injected after department skills, before Supabase helpers.
// Template vars: {BRAND_PRIMARY}, {BRAND_SECONDARY}, {TEAM_NAME}, {ORG_NAME}
const DESIGN_SYSTEM_RULES = `
--- DESIGN SYSTEM ---

You are producing production-grade, deployment-ready UI. Every output must look like it was designed by a senior product designer and built by a senior frontend engineer. Not a prototype. Not a wireframe. A finished product.

BRAND CONTEXT:
Primary: {BRAND_PRIMARY}
Team: {TEAM_NAME} | Org: {ORG_NAME}

COLOR SYSTEM — derive full palette from brand primary:
--color-primary: {BRAND_PRIMARY}
--color-primary-hover: primary darkened 10%
--color-primary-subtle: primary at 8% opacity
--color-surface: determined by user intent (light or dark)
--color-surface-raised: 1 step lighter/darker than surface
--color-text-primary: high contrast against surface (min 7:1)
--color-text-secondary: medium contrast (min 4.5:1)
--color-text-muted: low contrast for labels (min 3:1)
--color-border: 6-8% opacity of text color
--color-success: #059669
--color-warning: #D97706
--color-error: #DC2626
--color-info: #2563EB
If intent implies dark: surface #0F0F14, text #F1F1F4
If intent implies light: surface #FAFAFA, text #111111
If ambiguous: warm primary = light, cool primary = dark

TYPOGRAPHY — system fonts only:
--font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif
--font-mono: 'SF Mono', Consolas, monospace
Scale: 0.75rem(xs) 0.8125rem(sm) 0.875rem(base) 1rem(lg) 1.25rem(xl) 1.5rem(2xl) 1.875rem(3xl)
Weights: 400(body) 500(emphasis) 600(headings) 700(KPI values)
Letter-spacing: -0.01em on xl+, 0.01em on xs

SPACING — 4px base unit, multiples only: 4 8 12 16 20 24 32 40 48 64
Card padding: 20-24px. Section gaps: 24-32px. Page margins: 24px mobile, 48px desktop.

BORDERS + SHADOWS:
Radius: 6px(buttons) 8px(cards) 12px(panels) 16px(hero) 9999px(pills)
Shadows: sm(1px 2px 4%) md(2px 8px 6%) lg(8px 24px 8%) xl(16px 48px 10%)
On dark: use borders instead of shadows.

LAYOUT:
Full viewport width for dashboards. NEVER narrow centered column.
CSS Grid for page layout. Flexbox for components.
Sidebar: 240px fixed desktop, collapsible mobile.
Dashboard grids: repeat(auto-fit, minmax(280px, 1fr))
ALWAYS responsive: sm:640 md:768 lg:1024 xl:1280

COMPONENT PATTERNS:

KPI Card: surface-raised bg, radius-12, shadow-sm. Value: 1.875rem bold. Label: 0.75rem uppercase muted, letter-spacing 0.05em. Trend: inline arrow SVG. Green=up+good, red=down+bad. Show % change.

Chart: surface-raised bg, radius-12. Header: 1rem semibold + 0.8125rem muted subtitle. Chart.js: brand primary as main color, 0.1 alpha for fills. Gridlines: border color 50% opacity. Tooltips: overlay bg, radius-6, shadow-md.

Table: radius-12, overflow hidden. Header: 0.75rem uppercase, 600 weight, muted. Rows: border-bottom 1px. Hover: primary-subtle bg. Sortable: arrow on hover. Pagination at 20 rows.

Button: Primary: brand bg, white text, radius-6. Hover: darken 8%. Secondary: transparent, 1px border, brand text. Ghost: no border, muted text. Padding: 8px 16px. Font: 0.8125rem 500 weight. Transition: 150ms ease.

Sidebar: 240px fixed. Items: 0.8125rem, pad 8px/16px. Active: primary-subtle bg + primary text + 500 weight. Section headers: 0.75rem uppercase muted.

Empty State: centered, 48px icon, description text, primary action button. Loading: skeleton rectangles matching layout shape, 1.5s pulse animation.

ANTI-PATTERNS — NEVER:
Rainbow chart palettes. More than 2 fonts. Shadows on dark bg.
Center-aligned body text. ALL CAPS beyond labels. Horizontal scroll.
Fixed pixel widths on containers. Bare HTML without design system.
Placeholder text as only empty state. Animation that delays usability.

--- END DESIGN SYSTEM ---`;

/**
 * Darkens a hex color by a given percentage (0–100).
 */
function darkenHex(hex: string, percent: number): string {
  const h = hex.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(h.substring(0, 2), 16) * (1 - percent / 100)));
  const g = Math.max(0, Math.round(parseInt(h.substring(2, 4), 16) * (1 - percent / 100)));
  const b = Math.max(0, Math.round(parseInt(h.substring(4, 6), 16) * (1 - percent / 100)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Resolves the DESIGN_SYSTEM_RULES block with real brand values.
 */
function resolveDesignSystemBlock(
  brandPrimary: string,
  brandSecondary: string,
  teamName: string,
  orgName: string,
): string {
  return DESIGN_SYSTEM_RULES
    .replace(/\{BRAND_PRIMARY\}/g, brandPrimary)
    .replace(/\{BRAND_SECONDARY\}/g, brandSecondary)
    .replace(/\{TEAM_NAME\}/g, teamName)
    .replace(/\{ORG_NAME\}/g, orgName);
}

/**
 * Resolves the kernel context string injected before every job prompt.
 * Queries team membership, data scopes, and brand tokens for the given user+org.
 */
export async function resolveKernelContext(userId: string, orgId: string, teamId?: string): Promise<string> {
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
  const primaryColor = brand?.primary_color ?? '#7C3AED';
  const fontHeading = brand?.font_heading ?? '';
  const secondaryColor = (brand as any)?.secondary_color ?? darkenHex(primaryColor, 20);

  // 4. Resolve uploaded data tables for this user
  const uploadedData = await resolveUploadedData(sb, userId);

  // 4b. Resolve active Nango connectors for this team
  const activeConnectors = resolvedTeamId ? await resolveActiveConnectors(resolvedTeamId) : [];

  // 4c. Resolve budget context for this team
  const budgetContext = resolvedTeamId ? await resolveBudgetContext(sb, resolvedTeamId) : '';

  // 4d. Resolve published assets this team can see (own + visible teams)
  const publishedAssets = resolvedTeamId ? await resolvePublishedAssets(sb, resolvedTeamId) : '';

  // 4e. Resolve department skills for this team
  const deptSkills = resolvedTeamId ? await resolveDepartmentSkills(sb, resolvedTeamId, teamName) : '';

  // 5. Format and return
  const visibleTeams = resolvedTeamId ? await resolveVisibleTeams(sb, resolvedTeamId) : '';
  console.log(`[KERNEL] Context assembled — team=${teamName}, role=${role}, ownedScopes=${ownedScopes.length}, readScopes=${readScopes.length}, brand=${companyName}`);

  // 6. Resolve design system block with brand values
  const designSystemBlock = resolveDesignSystemBlock(primaryColor, secondaryColor, teamName, companyName);

  return `TEAM CONTEXT:
Org: ${companyName}
Team: ${teamName}
Role: ${role}
Data owned: ${ownedScopes.join(', ') || 'none'}
Data readable: ${readScopes.join(', ') || 'none'}
Brand voice: ${brandVoice}
Brand color fallback (only use if user prompt specifies no colors): ${primaryColor}
Font: ${fontHeading}` + visibleTeams + budgetContext + uploadedData
    + publishedAssets
    + deptSkills
    + '\n' + designSystemBlock
    + (activeConnectors.length > 0 ? `\nACTIVE DATA CONNECTORS:\n${activeConnectors.map(c => `- ${c}`).join('\n')}\nUse these connector names when referencing live data sources.` : '');
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
};

function resolveDepartment(teamName: string): string {
  const lower = teamName.toLowerCase().trim();
  return DEPARTMENT_MAP[lower] ?? 'admin';
}

/**
 * Resolves department-specific skills from skill_registry for a given team.
 * Maps team name → department, fetches active skills, falls back to General.
 */
export async function resolveDepartmentSkills(
  supabase: ReturnType<typeof getPlatformSupabaseClient>,
  teamId: string,
  teamName: string,
): Promise<string> {
  const resolvedDept = resolveDepartment(teamName);

  // Query skills for the resolved department (team_function column, content column)
  const { data: skills, error } = await supabase
    .from('skill_registry')
    .select('skill_name, content')
    .eq('team_function', resolvedDept)
    .eq('is_active', true)
    .order('skill_name', { ascending: true });

  if (error) {
    console.log(`[KERNEL] resolveDepartmentSkills error for team=${teamId}: ${error.message}`);
    return '';
  }

  let finalSkills = skills ?? [];

  // Fallback to admin if no skills found for this department
  if (finalSkills.length === 0 && resolvedDept !== 'admin') {
    const { data: adminSkills } = await supabase
      .from('skill_registry')
      .select('skill_name, content')
      .eq('team_function', 'admin')
      .eq('is_active', true)
      .order('skill_name', { ascending: true });
    finalSkills = adminSkills ?? [];
  }

  if (finalSkills.length === 0) return '';

  const skillBlock = finalSkills
    .map((s: any) => `[${s.skill_name}]\n${s.content}`)
    .join('\n\n');
  const needsHelpers = shouldInjectSupabaseHelpers(skillBlock);
  console.log(`[KERNEL] Injected ${finalSkills.length} department skills (${resolvedDept}) for team ${teamId}, supabaseHelpers=${needsHelpers}`);
  return `\n--- DEPARTMENT SKILLS (${resolvedDept}) ---\n${skillBlock}\n--- END DEPARTMENT SKILLS ---`
    + (needsHelpers ? '\n__INJECT_SUPABASE_HELPERS__' : '');
}

/**
 * Determines whether Supabase helper scripts (vibeSubmitForm, vibeLoadData, vibeLogSpend)
 * should be injected based on the skill content.
 */
function shouldInjectSupabaseHelpers(skillBlock: string): boolean {
  const dataKeywords = [
    'form', 'submit', 'crud', 'write', 'save', 'log',
    'track', 'store', 'insert', 'update', 'delete',
    'vibesubmitform', 'vibeloaddata', 'vibelogspend',
    'supabase', 'database', 'data table',
  ];
  const lower = skillBlock.toLowerCase();
  return dataKeywords.some(kw => lower.includes(kw));
}

async function resolveActiveConnectors(teamId: string): Promise<string[]> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const res = await fetch(
      `${supabaseUrl}/functions/v1/connectors/${teamId}`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
      }
    );
    if (!res.ok) return [];
    const data: any = await res.json();
    return Array.isArray(data?.connectors) ? data.connectors : [];
  } catch (err) {
    console.error('[KERNEL] resolveActiveConnectors error:', err);
    return [];
  }
}
