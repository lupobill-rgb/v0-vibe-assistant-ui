-- Migration: Ensure published_assets has ALL columns referenced by
-- ingestTeamAsset() and resolvePublishedAssets().
--
-- The original migration (20260324200000) creates the table correctly,
-- but if the table was created earlier without these columns (or the
-- migration was never applied), Supabase schema cache returns
-- "Could not find the 'column_schema' column" and writes 0 rows.

ALTER TABLE published_assets
  ADD COLUMN IF NOT EXISTS original_filename TEXT,
  ADD COLUMN IF NOT EXISTS raw_content TEXT,
  ADD COLUMN IF NOT EXISTS row_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS column_schema JSONB,
  ADD COLUMN IF NOT EXISTS sample_data JSONB,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS published_by UUID,
  ADD COLUMN IF NOT EXISTS mime_type TEXT NOT NULL DEFAULT 'text/csv';

-- Ensure the unique constraint exists for upsert ON CONFLICT
ALTER TABLE published_assets
  DROP CONSTRAINT IF EXISTS uq_published_asset_team_type;
ALTER TABLE published_assets
  ADD CONSTRAINT uq_published_asset_team_type
  UNIQUE (team_id, asset_type);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
