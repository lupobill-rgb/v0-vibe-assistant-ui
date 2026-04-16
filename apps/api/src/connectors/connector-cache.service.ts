/**
 * Connector data cache layer.
 *
 * Sits between dashboard templates and Nango. Caches fetched records in
 * team_connector_data with a configurable TTL. Provider-agnostic — all
 * providers go through the same cache path.
 *
 * Flow:
 *   1. getCachedOrFetch(teamId, provider, model)
 *   2. Check team_connector_data for fresh cache (stale_after > now)
 *   3. Fresh → return cached records
 *   4. Stale/missing → fetch via Nango proxy → upsert cache → return
 */

import { getPlatformSupabaseClient } from '../supabase/client';
import { getNangoService } from './nango.service';

const DEFAULT_TTL_HOURS = 1;

interface CachedData {
  records: unknown[];
  record_count: number;
  fetched_at: string;
  from_cache: boolean;
}

/**
 * Get cached connector data or fetch fresh from provider.
 * Provider-agnostic: works with any Nango-connected provider.
 */
export async function getCachedOrFetch(
  teamId: string,
  provider: string,
  model: string,
  ttlHours: number = DEFAULT_TTL_HOURS,
): Promise<CachedData> {
  const sb = getPlatformSupabaseClient();

  // Check cache
  const { data: cached } = await sb
    .from('team_connector_data')
    .select('records, record_count, fetched_at, stale_after')
    .eq('team_id', teamId)
    .eq('provider', provider)
    .eq('model', model)
    .single();

  if (cached && new Date(cached.stale_after) > new Date()) {
    return {
      records: cached.records as unknown[],
      record_count: cached.record_count,
      fetched_at: cached.fetched_at,
      from_cache: true,
    };
  }

  // Cache miss or stale — fetch from provider
  const nango = getNangoService();
  let records: unknown[];

  // Provider-specific fetch methods for richer data
  if (provider === 'hubspot' && model === 'deals') {
    records = await nango.fetchHubSpotDeals(teamId);
  } else if (provider === 'hubspot' && model === 'contacts') {
    records = await nango.fetchHubSpotContacts(teamId);
  } else {
    // Generic fetch for all other provider/model combos
    records = await nango.fetchRecords(teamId, provider, model, 200);
  }

  const now = new Date();
  const staleAfter = new Date(now.getTime() + ttlHours * 3600_000);

  // Upsert cache
  await sb
    .from('team_connector_data')
    .upsert(
      {
        team_id: teamId,
        provider,
        model,
        records: JSON.parse(JSON.stringify(records)),
        record_count: records.length,
        fetched_at: now.toISOString(),
        stale_after: staleAfter.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: 'team_id,provider,model' },
    );

  return {
    records,
    record_count: records.length,
    fetched_at: now.toISOString(),
    from_cache: false,
  };
}

/**
 * Check which providers have cached data for a team.
 * Returns providers with fresh cache — no API calls made.
 */
export async function listCachedProviders(teamId: string): Promise<string[]> {
  const sb = getPlatformSupabaseClient();
  const { data } = await sb
    .from('team_connector_data')
    .select('provider')
    .eq('team_id', teamId)
    .gt('stale_after', new Date().toISOString());

  return [...new Set((data ?? []).map((r: { provider: string }) => r.provider))];
}

/**
 * Invalidate cache for a team/provider/model combo.
 * Call this when a webhook indicates new data is available.
 */
export async function invalidateCache(
  teamId: string,
  provider: string,
  model?: string,
): Promise<void> {
  const sb = getPlatformSupabaseClient();
  let query = sb
    .from('team_connector_data')
    .update({ stale_after: new Date(0).toISOString() })
    .eq('team_id', teamId)
    .eq('provider', provider);

  if (model) {
    query = query.eq('model', model);
  }

  await query;
}
