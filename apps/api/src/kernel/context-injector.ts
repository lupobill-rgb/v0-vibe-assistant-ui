import { getPlatformSupabaseClient } from '../supabase/client';

// --- Design system rules injected AFTER department skills, BEFORE user prompt ---
const DESIGN_SYSTEM_RULES = `
DESIGN SYSTEM — non-negotiable:
- Colors come from the PRE-BUILT COLOR BLOCK (CSS variables). Use var(--bg), var(--text), var(--primary), var(--surface), var(--border) for ALL colors.
- Never hardcode hex color values. Never use bg-slate-900, bg-slate-950, text-white, or any Tailwind color class.
- All headings: Space Grotesk font-weight 700+. All body: Inter.`;

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
export async function resolveKernelContext(userId: string, orgId: string, teamId?: string): Promise<{ context: string; injectSupabaseHelpers: boolean }> {
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

  // 4b. Resolve active Nango connectors for this team
  const activeConnectors = resolvedTeamId ? await resolveActiveConnectors(resolvedTeamId) : [];

  // 4c. Resolve budget context for this team
  const budgetContext = resolvedTeamId ? await resolveBudgetContext(sb, resolvedTeamId) : '';

  // 4d. Resolve published assets this team can see (own + visible teams)
  const publishedAssets = resolvedTeamId ? await resolvePublishedAssets(sb, resolvedTeamId) : '';

  // 4e. Resolve department skills for this team
  const deptSkillsResult = resolvedTeamId
    ? await resolveDepartmentSkills(sb, resolvedTeamId, teamName)
    : { text: '', needsSupabaseHelpers: false };

  // 5. Format and return
  const visibleTeams = resolvedTeamId ? await resolveVisibleTeams(sb, resolvedTeamId) : '';
  console.log(`[KERNEL] Context assembled — team=${teamName}, role=${role}, ownedScopes=${ownedScopes.length}, readScopes=${readScopes.length}, brand=${companyName}`);

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
    + deptSkillsResult.text
    + DESIGN_SYSTEM_RULES
    + CHART_LOADING_RULES
    + (activeConnectors.length > 0 ? `\nACTIVE DATA CONNECTORS:\n${activeConnectors.map(c => `- ${c}`).join('\n')}\nUse these connector names when referencing live data sources.` : '');

  return {
    context: contextStr,
    injectSupabaseHelpers: deptSkillsResult.needsSupabaseHelpers,
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
): Promise<{ text: string; needsSupabaseHelpers: boolean }> {
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
    return { text: '', needsSupabaseHelpers: false };
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

  if (finalSkills.length === 0) return { text: '', needsSupabaseHelpers: false };

  const skillBlock = finalSkills
    .map((s: any) => `[${s.skill_name}]\n${s.content}`)
    .join('\n\n');
  const needsHelpers = shouldInjectSupabaseHelpers(skillBlock);
  console.log(`[KERNEL] Injected ${finalSkills.length} department skills (${resolvedDept}) for team ${teamId}, supabaseHelpers=${needsHelpers}`);
  return {
    text: `\n--- DEPARTMENT SKILLS (${resolvedDept}) ---\n${skillBlock}\n--- END DEPARTMENT SKILLS ---`,
    needsSupabaseHelpers: needsHelpers,
  };
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
