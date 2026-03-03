-- Add agent_results JSONB column to jobs table
-- Stores an array of AgentResultSummary objects from the executor pipeline
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS agent_results JSONB;
