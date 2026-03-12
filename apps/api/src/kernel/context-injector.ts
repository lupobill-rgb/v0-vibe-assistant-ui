import { getPlatformSupabaseClient } from '../supabase/client';

/**
 * Resolves the kernel context string injected before every job prompt.
 * Queries team membership, data scopes, and brand tokens for the given user+org.
 */
export async function resolveKernelContext(userId: string, orgId: string): Promise<string> {
  const sb = getPlatformSupabaseClient();
  console.log(`[KERNEL] resolveKernelContext called — userId=${userId}, orgId=${orgId}`);

  // 1. Find the user's team and role within this org
  const { data: membership } = await sb
    .from('team_members')
    .select('role, teams!inner(id, name)')
    .eq('user_id', userId)
    .eq('teams.org_id', orgId)
    .limit(1)
    .single();

  let teamId = (membership?.teams as any)?.id ?? null;
  let teamName = (membership?.teams as any)?.name ?? 'unknown';
  let role = membership?.role ?? 'unknown';

  // Fallback: if no team_member row, pick the first team in the org
  if (!teamId) {
    console.log(`[KERNEL] No team_member row for user=${userId}, falling back to first org team`);
    const { data: fallbackTeam } = await sb
      .from('teams')
      .select('id, name')
      .eq('org_id', orgId)
      .limit(1)
      .single();

    teamId = fallbackTeam?.id ?? null;
    teamName = fallbackTeam?.name ?? 'unknown';
    role = 'Admin';
  }

  // 2. Query data_scopes for owned and readable scopes
  let ownedScopes: string[] = [];
  let readScopes: string[] = [];

  if (teamId) {
    const { data: scopes } = await sb
      .from('data_scopes')
      .select('scope_name, scope_type')
      .eq('team_id', teamId)
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

  // 4. Format and return
  const visibleTeams = teamId ? await resolveVisibleTeams(sb, teamId) : '';
  console.log(`[KERNEL] Context assembled — team=${teamName}, role=${role}, ownedScopes=${ownedScopes.length}, readScopes=${readScopes.length}, brand=${companyName}`);

  return `TEAM CONTEXT:
Org: ${companyName}
Team: ${teamName}
Role: ${role}
Data owned: ${ownedScopes.join(', ') || 'none'}
Data readable: ${readScopes.join(', ') || 'none'}
Brand voice: ${brandVoice}
Brand color fallback (only use if user prompt specifies no colors): ${primaryColor}
Font: ${fontHeading}` + visibleTeams;
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
