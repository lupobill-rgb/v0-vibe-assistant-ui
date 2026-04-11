-- Migration: Create team_visibility table for cross-team asset sharing.
-- Must run BEFORE published_assets (20260324200000) which references this table.

CREATE TABLE IF NOT EXISTS team_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  target_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  visibility_level TEXT NOT NULL CHECK (visibility_level IN ('none', 'aggregate', 'record')),
  scope_filter TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_team_id, target_team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_visibility_source ON team_visibility(source_team_id);
CREATE INDEX IF NOT EXISTS idx_team_visibility_target ON team_visibility(target_team_id);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE team_visibility ENABLE ROW LEVEL SECURITY;

-- Team members can view visibility rules for their team
DROP POLICY IF EXISTS "team_read_own_visibility" ON team_visibility;
CREATE POLICY "team_read_own_visibility" ON team_visibility
  FOR SELECT
  USING (source_team_id IN (SELECT public.user_team_ids()));

-- Service role manages visibility rules
DROP POLICY IF EXISTS "service_role_manage_visibility" ON team_visibility;
CREATE POLICY "service_role_manage_visibility" ON team_visibility
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
