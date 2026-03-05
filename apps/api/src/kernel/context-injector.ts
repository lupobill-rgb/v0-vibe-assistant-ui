import { getPlatformSupabaseClient } from '../supabase/client';

/**
 * Resolves the kernel context string injected before every job prompt.
 * Queries team membership, data scopes, and brand tokens for the given user+org.
 */
export async function resolveKernelContext(userId: string, orgId: string): Promise<string> {
  const sb = getPlatformSupabaseClient();

  // 1. Find the user's team and role within this org
  const { data: membership } = await sb
    .from('team_members')
    .select('role, teams!inner(id, name)')
    .eq('user_id', userId)
    .eq('teams.org_id', orgId)
    .limit(1)
    .single();

  const teamId = (membership?.teams as any)?.id ?? null;
  const teamName = (membership?.teams as any)?.name ?? 'unknown';
  const role = membership?.role ?? 'unknown';

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
  return `TEAM CONTEXT:
Org: ${companyName}
Team: ${teamName}
Role: ${role}
Data owned: ${ownedScopes.join(', ') || 'none'}
Data readable: ${readScopes.join(', ') || 'none'}
Brand voice: ${brandVoice}
Primary color: ${primaryColor}
Font: ${fontHeading}`;
}
