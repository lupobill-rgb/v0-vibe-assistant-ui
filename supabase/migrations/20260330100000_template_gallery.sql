-- Migration: Template Gallery — add gallery columns to published_assets
-- and create template_forks table for fork tracking.
-- Idempotent: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout.

-- ============================================================================
-- PART A: Add gallery columns to published_assets
-- ============================================================================

ALTER TABLE published_assets
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS screenshot_url text,
  ADD COLUMN IF NOT EXISTS preview_html text,
  ADD COLUMN IF NOT EXISTS source_prompt text,
  ADD COLUMN IF NOT EXISTS fork_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_avg numeric(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_seed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Add CHECK constraint for category values
-- (DROP first for idempotency, then re-add)
ALTER TABLE published_assets
  DROP CONSTRAINT IF EXISTS chk_published_assets_category;
ALTER TABLE published_assets
  ADD CONSTRAINT chk_published_assets_category
  CHECK (category IS NULL OR category IN (
    'sales','marketing','cross-team',
    'design','ops','finance','hr','product','engineering'
  ));

-- Index for gallery browsing by category
CREATE INDEX IF NOT EXISTS idx_published_assets_category
  ON published_assets(category) WHERE category IS NOT NULL;

-- Index for featured/seed filtering
CREATE INDEX IF NOT EXISTS idx_published_assets_featured
  ON published_assets(is_featured) WHERE is_featured = true;

-- ============================================================================
-- PART B: Create template_forks table
-- ============================================================================

CREATE TABLE IF NOT EXISTS template_forks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES published_assets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  team_id uuid REFERENCES teams(id),
  project_id uuid REFERENCES projects(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_forks_template
  ON template_forks(template_id);

CREATE INDEX IF NOT EXISTS idx_template_forks_user
  ON template_forks(user_id);

-- ============================================================================
-- PART C: RLS on template_forks
-- ============================================================================

ALTER TABLE template_forks ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all forks (gallery stats are public)
DROP POLICY IF EXISTS "authenticated_read_forks" ON template_forks;
CREATE POLICY "authenticated_read_forks" ON template_forks
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can only insert forks for themselves
DROP POLICY IF EXISTS "user_insert_own_forks" ON template_forks;
CREATE POLICY "user_insert_own_forks" ON template_forks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass for platform operations
DROP POLICY IF EXISTS "service_role_full_access_forks" ON template_forks;
CREATE POLICY "service_role_full_access_forks" ON template_forks
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Reload schema cache so PostgREST picks up new columns/tables
NOTIFY pgrst, 'reload schema';
