-- Add aggregated_stats column to user_uploads so the LLM gets real
-- totals / distributions instead of a 20-row sample.
ALTER TABLE user_uploads
  ADD COLUMN IF NOT EXISTS aggregated_stats jsonb NOT NULL DEFAULT '{}';
