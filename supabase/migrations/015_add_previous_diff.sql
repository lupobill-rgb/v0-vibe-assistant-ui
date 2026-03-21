-- Add previous_diff column to jobs table for edit undo capability
-- Stores the pre-edit HTML so truncated edits can be reverted
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS previous_diff TEXT;
