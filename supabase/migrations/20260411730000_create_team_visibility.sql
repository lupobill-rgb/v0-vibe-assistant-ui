-- Migration: Create team_visibility table referenced by published_assets RLS policy
-- and context-injector.ts. This table was missing, causing branch migration failures.

CREATE TABLE IF NOT EXISTS team_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  target_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  visibility_level TEXT NOT NULL DEFAULT 'read',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_team_visibility UNIQUE (source_team_id, target_team_id),
  CONSTRAINT chk_no_self_visibility CHECK (source_team_id <> target_team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_visibility_source ON team_visibility(source_team_id);
CREATE INDEX IF NOT EXISTS idx_team_visibility_target ON team_visibility(target_team_id);

ALTER TABLE team_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_read_own_visibility" ON team_visibility;
CREATE POLICY "team_read_own_visibility" ON team_visibility
  FOR SELECT
  USING (source_team_id IN (SELECT public.user_team_ids()));

DROP POLICY IF EXISTS "service_role_manage_visibility" ON team_visibility;
CREATE POLICY "service_role_manage_visibility" ON team_visibility
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Re-add the published_assets cross-team read policy (removed from 20260324200000
-- because team_visibility didn't exist yet at that migration's execution time)
DROP POLICY IF EXISTS "visible_teams_read_assets" ON published_assets;
CREATE POLICY "visible_teams_read_assets" ON published_assets
  FOR SELECT
  USING (
    team_id IN (
      SELECT target_team_id FROM team_visibility
      WHERE source_team_id IN (SELECT public.user_team_ids())
    )
  );
