-- Reactive Kernel Stage 1: evolve autonomous_executions to full spec
-- Adds missing columns for cascade tracking & aligns types

-- NOTE: org_id generated column removed — API uses organization_id directly.
-- Generated columns cause PostgREST 406 errors on schema cache reload.

-- trigger_event: convert from TEXT to JSONB if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'autonomous_executions'
      AND column_name = 'trigger_event'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE autonomous_executions
      ALTER COLUMN trigger_event TYPE jsonb USING
        CASE
          WHEN trigger_event IS NOT NULL THEN to_jsonb(trigger_event)
          ELSE '{}'::jsonb
        END;
  END IF;
END $$;

-- Add cascade columns
ALTER TABLE autonomous_executions
  ADD COLUMN IF NOT EXISTS cascade_depth integer NOT NULL DEFAULT 0;

ALTER TABLE autonomous_executions
  ADD COLUMN IF NOT EXISTS parent_execution_id uuid
    REFERENCES autonomous_executions(id);

-- Expand status CHECK to include 'queued' and 'skipped'
-- (original allows: pending, running, complete, failed)
DO $$
BEGIN
  -- Drop old constraint, add expanded one
  ALTER TABLE autonomous_executions
    DROP CONSTRAINT IF EXISTS autonomous_executions_status_check;
  ALTER TABLE autonomous_executions
    ADD CONSTRAINT autonomous_executions_status_check
    CHECK (status IN ('pending','queued','running','complete','failed','skipped'));
EXCEPTION WHEN undefined_object THEN
  -- constraint didn't exist; create it fresh
  ALTER TABLE autonomous_executions
    ADD CONSTRAINT autonomous_executions_status_check
    CHECK (status IN ('pending','queued','running','complete','failed','skipped'));
END $$;

-- RLS policy: team-scoped SELECT (supplement existing org-level policy)
DO $$
BEGIN
  CREATE POLICY "team_member_select" ON autonomous_executions
    FOR SELECT USING (
      team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes for the required access patterns
CREATE INDEX IF NOT EXISTS idx_auto_exec_org_team_status
  ON autonomous_executions (organization_id, team_id, status);

CREATE INDEX IF NOT EXISTS idx_auto_exec_skill_created
  ON autonomous_executions (skill_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auto_exec_parent
  ON autonomous_executions (parent_execution_id)
  WHERE parent_execution_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
