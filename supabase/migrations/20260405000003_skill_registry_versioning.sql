-- VIBE Trust Layer: skill_registry versioning
-- Adds version tracking so every skill change is auditable
-- Zero runtime impact — existing queries are unaffected

ALTER TABLE skill_registry
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Auto-increment version on any update
CREATE OR REPLACE FUNCTION increment_skill_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_skill_version ON skill_registry;
CREATE TRIGGER trg_skill_version
  BEFORE UPDATE ON skill_registry
  FOR EACH ROW
  EXECUTE FUNCTION increment_skill_version();

-- Index for provenance lookups
CREATE INDEX IF NOT EXISTS idx_skill_registry_version
  ON skill_registry (id, version);
