-- Migration: Create skill_registry table
-- Required by downstream migrations that INSERT/UPDATE skill_registry rows.

CREATE TABLE IF NOT EXISTS skill_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_name TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  team_function TEXT,
  description TEXT,
  content TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plugin_name, skill_name)
);

CREATE INDEX IF NOT EXISTS idx_skill_registry_plugin ON skill_registry(plugin_name);
CREATE INDEX IF NOT EXISTS idx_skill_registry_team_fn ON skill_registry(team_function);

ALTER TABLE skill_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY skill_registry_select ON skill_registry
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY skill_registry_service_all ON skill_registry
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
