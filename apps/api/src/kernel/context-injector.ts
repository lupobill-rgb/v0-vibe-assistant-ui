import { getPlatformSupabaseClient } from '../supabase/client';

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

  // 5. Format and return
  const visibleTeams = resolvedTeamId ? await resolveVisibleTeams(sb, resolvedTeamId) : '';
  console.log(`[KERNEL] Context assembled — team=${teamName}, role=${role}, ownedScopes=${ownedScopes.length}, readScopes=${readScopes.length}, brand=${companyName}`);

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

// --- Stop words for keyword overlap scoring ---
const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','shall','should','may','might','must','can',
  'could','i','me','my','we','our','you','your','he','she','it','they','them',
  'this','that','these','those','of','in','to','for','with','on','at','by',
  'from','as','into','about','between','through','and','but','or','not','no',
  'so','if','then','than','too','very','just','also','how','what','when','where',
  'who','which','why','all','each','every','any','few','more','most','some',
  'such','only','own','same','other','new','old','make','like','need','want',
  'use','get','create','build','add','show','please','help',
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function scoreOverlap(skillDesc: string, promptTokens: Set<string>): number {
  const skillTokens = tokenize(skillDesc);
  let hits = 0;
  for (const t of skillTokens) {
    if (promptTokens.has(t)) hits++;
  }
  return hits;
}

const MAX_OUTPUT_CHARS = 16_000;

/**
 * Resolves department-specific skills from skill_registry for a given team.
 * Scores each skill's description against the user prompt via keyword overlap,
 * returns top 2 (or top 3 if third scores > 50% of top) formatted as a context block.
 */
export async function resolveDepartmentSkills(
  teamId: string,
  userPrompt: string,
  supabase: { from: (table: string) => any },
): Promise<string> {
  // 1. Fetch the team's function
  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .select('function')
    .eq('id', teamId)
    .limit(1)
    .single();

  if (teamErr || !team?.function) return '';

  // 2. Query direct skills for this team function
  const { data: directSkills } = await supabase
    .from('skill_registry')
    .select('plugin_name, skill_name, description, content')
    .eq('team_function', team.function)
    .neq('content', 'PENDING_DESKTOP_SEED');

  // 2b. Query shared skills: source functions that share into this team function
  const { data: sharedSources } = await supabase
    .from('skill_sharing')
    .select('source_function')
    .eq('target_function', team.function);

  let sharedSkills: any[] = [];
  const sourceFns = (sharedSources ?? []).map((r: any) => r.source_function).filter(Boolean);
  if (sourceFns.length > 0) {
    const { data } = await supabase
      .from('skill_registry')
      .select('plugin_name, skill_name, description, content')
      .in('team_function', sourceFns)
      .neq('content', 'PENDING_DESKTOP_SEED');
    sharedSkills = data ?? [];
  }

  // 2c. Merge and deduplicate by skill_name
  const seen = new Set<string>();
  const skills: any[] = [];
  for (const s of [...(directSkills ?? []), ...sharedSkills]) {
    if (!seen.has(s.skill_name)) { seen.add(s.skill_name); skills.push(s); }
  }

  if (skills.length === 0) return '';

  // 3. Score each skill
  const promptTokens = tokenize(userPrompt);
  const scored = skills
    .map((s: any) => ({ ...s, score: scoreOverlap(s.description ?? s.skill_name, promptTokens) }))
    .sort((a: any, b: any) => b.score - a.score);

  if (scored[0].score === 0) return '';

  // 4. Pick top 2, optionally top 3
  const topScore = scored[0].score;
  let picks = scored.slice(0, Math.min(2, scored.length));
  if (scored.length > 2 && scored[2].score > topScore * 0.5) {
    picks = scored.slice(0, 3);
  }

  // 5. Format output, respecting 16k cap
  let output = '--- DEPARTMENT SKILLS ---\n';
  let count = 0;

  for (const skill of picks) {
    const block = `## ${skill.skill_name} (${skill.plugin_name})\n${skill.content}\n---\n`;
    if (output.length + block.length > MAX_OUTPUT_CHARS) {
      const remaining = MAX_OUTPUT_CHARS - output.length;
      if (remaining > 100) {
        output += block.slice(0, remaining - 4) + '\n---\n';
        count++;
      }
      break;
    }
    output += block;
    count++;
  }

  if (count === 0) return '';

  const bytes = Buffer.byteLength(output, 'utf-8');
  console.log(`[kernel] Injected ${count} department skills for team ${teamId} (${bytes} bytes)`);
  return output;
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
