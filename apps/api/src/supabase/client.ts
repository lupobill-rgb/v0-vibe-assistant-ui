import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase admin client using the service role key.
 * The service key must never be logged or returned in API responses.
 */
export function createSupabaseAdminClient(url: string, serviceKey: string): SupabaseClient {
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Returns a Supabase admin client from environment variables, or null if not configured.
 */
export function getDefaultSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdminClient(url, serviceKey);
}

/**
 * Returns the platform Supabase client used for VIBE's own data storage.
 * Throws if SUPABASE_URL or SUPABASE_SERVICE_KEY are not configured.
 */
let _platformClient: SupabaseClient | null = null;

export function getPlatformSupabaseClient(): SupabaseClient {
  if (_platformClient) return _platformClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_KEY must be set for Supabase storage'
    );
  }
  _platformClient = createSupabaseAdminClient(url, serviceKey);
  return _platformClient;
}
