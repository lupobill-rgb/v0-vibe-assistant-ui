-- Reactive Kernel Stage 1: upgrade skill_registry trigger columns
-- trigger_on → JSONB (was TEXT), add autonomous_enabled flag

-- Convert trigger_on from TEXT to JSONB (wraps existing values as JSON strings)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skill_registry' AND column_name = 'trigger_on' AND data_type = 'text'
  ) THEN
    ALTER TABLE skill_registry
      ALTER COLUMN trigger_on TYPE jsonb USING
        CASE WHEN trigger_on IS NOT NULL THEN to_jsonb(trigger_on) ELSE NULL END;
  END IF;
END $$;

-- Add trigger_on as JSONB if it doesn't exist at all
ALTER TABLE skill_registry
  ADD COLUMN IF NOT EXISTS trigger_on jsonb DEFAULT NULL;

-- Add autonomous_enabled flag
ALTER TABLE skill_registry
  ADD COLUMN IF NOT EXISTS autonomous_enabled boolean NOT NULL DEFAULT false;

-- Partial index: only rows with a trigger defined
DROP INDEX IF EXISTS idx_skill_registry_trigger_on;
CREATE INDEX IF NOT EXISTS idx_skill_registry_trigger_on
  ON skill_registry (trigger_on) WHERE trigger_on IS NOT NULL;

NOTIFY pgrst, 'reload schema';
