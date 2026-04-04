-- Create skill_triggers table for managing per-skill webhook trigger providers.
-- Replaces the single trigger_on column with a many-to-many relationship.

CREATE TABLE IF NOT EXISTS skill_triggers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id    uuid NOT NULL REFERENCES skill_registry(id) ON DELETE CASCADE,
  provider    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (skill_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_skill_triggers_skill_id ON skill_triggers(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_triggers_provider ON skill_triggers(provider);

ALTER TABLE skill_triggers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read skill triggers (skills are org-visible)
CREATE POLICY skill_triggers_select ON skill_triggers
  FOR SELECT TO authenticated
  USING (true);

-- Only service role can insert/update/delete (managed by API)
CREATE POLICY skill_triggers_service_all ON skill_triggers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
