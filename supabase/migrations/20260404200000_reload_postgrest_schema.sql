-- Force PostgREST schema cache reload so trigger_on column and
-- team_integrations table are visible via the Supabase client API.
-- Without this, the frontend select("*") may not include trigger_on
-- and team_integrations queries may return 404.
NOTIFY pgrst, 'reload schema';
