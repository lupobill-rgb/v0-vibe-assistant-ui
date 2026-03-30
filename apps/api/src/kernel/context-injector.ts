import { getPlatformSupabaseClient } from '../supabase/client';

// --- Design system rules injected AFTER department skills, BEFORE user prompt ---
const DESIGN_SYSTEM_RULES = `
DESIGN SYSTEM — non-negotiable:
- Colors come from the PRE-BUILT COLOR BLOCK (CSS variables). Use var(--bg), var(--text), var(--primary), var(--surface), var(--border) for ALL colors.
- Never hardcode hex color values. Never use bg-slate-900, bg-slate-950, text-white, or any Tailwind color class.
- All headings: Space Grotesk font-weight 700+. All body: Inter.`;

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
  if(!url||!key)return[];
  let ep=url+'/rest/v1/'+table+'?select=*';
  Object.entries(filters).forEach(([k,v])=>{ep+='&'+k+'=eq.'+v;});
  const r=await fetch(ep,{headers:{'apikey':key,'Authorization':'Bearer '+key}});
  return r.ok?await r.json():[];
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
function shouldInjectSpendHelper(department: string, prompt: string): boolean {
  if (department === 'finance') return true;
  const lower = prompt.toLowerCase();
  return lower.includes('budget') || lower.includes('spend');
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
export async function resolveKernelContext(userId: string, orgId: string, teamId?: string, prompt?: string): Promise<{ context: string; injectSupabaseHelpers: boolean }> {
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
    ? await resolveDepartmentSkills(sb, resolvedTeamId, teamName, prompt)
    : { text: '', needsSupabaseHelpers: false };

  // 5. Format and return
  const visibleTeams = resolvedTeamId ? await resolveVisibleTeams(sb, resolvedTeamId) : '';
  console.log(`[KERNEL] Context assembled — team=${teamName}, role=${role}, ownedScopes=${ownedScopes.length}, readScopes=${readScopes.length}, brand=${companyName}`);

  // Conditional helper injection — skill-driven, not always-on
  const resolvedDept = resolveDepartment(teamName);
  const userPrompt = prompt ?? '';
  const injectHelpers = shouldInjectHelpers(deptSkillsResult.text, userPrompt);
  const injectSpend = shouldInjectSpendHelper(resolvedDept, userPrompt);
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
    + deptSkillsResult.text
    + helperBlock
    + DESIGN_SYSTEM_RULES
    + CHART_LOADING_RULES
    + (activeConnectors.length > 0 ? `\nACTIVE DATA CONNECTORS:\n${activeConnectors.map(c => `- ${c}`).join('\n')}\nUse these connector names when referencing live data sources.` : '');

  return {
    context: contextStr,
    injectSupabaseHelpers: injectHelpers,
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
  general: 'general',
};

function resolveDepartment(teamName: string): string {
  const lower = teamName.toLowerCase().trim();
  return DEPARTMENT_MAP[lower] ?? 'general';
}

const MAX_SKILL_BYTES = 16 * 1024; // 16KB cap on injected skill text

/**
 * Tokenises a string into lowercase alpha-numeric words for scoring.
 */
function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

/**
 * Scores a skill against prompt tokens using keyword overlap
 * on skill_name + description.
 */
function scoreSkill(skill: { skill_name: string; description: string | null }, promptTokens: Set<string>): number {
  const skillText = `${skill.skill_name} ${skill.description ?? ''}`;
  const skillTokens = tokenize(skillText);
  let score = 0;
  for (const token of skillTokens) {
    if (promptTokens.has(token)) score++;
  }
  return score;
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
): Promise<{ text: string; needsSupabaseHelpers: boolean }> {
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
    return { text: '', needsSupabaseHelpers: false };
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

  if (finalSkills.length === 0) return { text: '', needsSupabaseHelpers: false };

  // Score skills against prompt and select top 2-3
  let selected: typeof finalSkills;
  if (prompt && prompt.trim().length > 0) {
    const promptTokens = tokenize(prompt);
    const scored = finalSkills.map(s => ({ skill: s, score: scoreSkill(s, promptTokens) }));
    scored.sort((a, b) => b.score - a.score);
    // Take top 3, but at least 2 if available
    selected = scored.slice(0, 3).map(s => s.skill);
  } else {
    // No prompt — return up to 3 skills (alphabetical)
    selected = finalSkills.slice(0, 3);
  }

  // Concatenate content and cap at 16KB
  let skillBlock = selected
    .map((s: any) => `[${s.skill_name}]\n${s.content}`)
    .join('\n\n');
  if (skillBlock.length > MAX_SKILL_BYTES) {
    skillBlock = skillBlock.slice(0, MAX_SKILL_BYTES);
  }

  const needsHelpers = shouldInjectHelpers(skillBlock, prompt ?? '');
  console.log(`[KERNEL] Injected ${selected.length}/${finalSkills.length} department skills (${resolvedDept}) for team ${teamId}, supabaseHelpers=${needsHelpers}`);
  return {
    text: `\n--- DEPARTMENT SKILLS (${resolvedDept}) ---\n${skillBlock}\n--- END DEPARTMENT SKILLS ---`,
    needsSupabaseHelpers: needsHelpers,
  };
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
