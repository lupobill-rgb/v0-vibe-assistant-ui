-- Add trigger_on column to skill_registry for webhook-based skill activation.
-- Stores the provider name (e.g. 'hubspot', 'stripe', 'slack') that triggers this skill.

ALTER TABLE skill_registry ADD COLUMN IF NOT EXISTS trigger_on text;

CREATE INDEX IF NOT EXISTS idx_skill_registry_trigger_on ON skill_registry(trigger_on)
  WHERE trigger_on IS NOT NULL;
