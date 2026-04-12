-- Migration: published_assets — Layer 4 Marketplace publish/subscribe store
-- Any team can publish assets (CSV, JSON, etc.) scoped by team_id + asset_type.
-- Re-uploads upsert via ON CONFLICT — new file replaces old one.

CREATE TABLE IF NOT EXISTS published_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,            -- e.g. 'budget_plan', 'price_list', 'product_catalog'
  mime_type TEXT NOT NULL DEFAULT 'text/csv',
  original_filename TEXT,
  raw_content TEXT,                    -- full file content for CSV/JSON
  row_count INTEGER DEFAULT 0,
  column_schema JSONB,                 -- [{name, pgType}] for structured data
  sample_data JSONB,                   -- first 20 rows for preview
  metadata JSONB DEFAULT '{}'::jsonb,  -- arbitrary KV (fiscal_year, version, etc.)
  published_by UUID,                   -- user who published
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active asset per team + type — re-upload replaces
ALTER TABLE published_assets
  DROP CONSTRAINT IF EXISTS uq_published_asset_team_type;
ALTER TABLE published_assets
  ADD CONSTRAINT uq_published_asset_team_type
  UNIQUE (team_id, asset_type);

CREATE INDEX IF NOT EXISTS idx_published_assets_team ON published_assets(team_id);
CREATE INDEX IF NOT EXISTS idx_published_assets_type ON published_assets(asset_type);

-- ============================================================================
-- Enable RLS
-- ============================================================================
ALTER TABLE published_assets ENABLE ROW LEVEL SECURITY;

-- Publishing team members can read and write their own assets
DROP POLICY IF EXISTS "team_manage_own_assets" ON published_assets;
CREATE POLICY "team_manage_own_assets" ON published_assets
  FOR ALL
  USING (team_id IN (SELECT public.user_team_ids()))
  WITH CHECK (team_id IN (SELECT public.user_team_ids()));

-- Subscriber teams can read assets they have visibility to (via team_visibility)
-- Policy moved to 20260411730000_create_team_visibility.sql to avoid forward reference

-- Service role bypasses RLS (platform API calls)
DROP POLICY IF EXISTS "service_role_full_access" ON published_assets;
CREATE POLICY "service_role_full_access" ON published_assets
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- Auto-update updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS trg_published_assets_updated_at ON published_assets;
CREATE TRIGGER trg_published_assets_updated_at
  BEFORE UPDATE ON published_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
