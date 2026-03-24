-- Store raw CSV content so the job pipeline can auto-ingest budget data
-- into budget_allocations before the Edge Function generates a dashboard.
ALTER TABLE user_uploads
  ADD COLUMN IF NOT EXISTS raw_content text;
