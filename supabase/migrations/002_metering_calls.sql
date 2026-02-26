-- Migration: metering_calls table for LLM usage tracking
-- Moves metering records from local SQLite to Supabase

CREATE TABLE IF NOT EXISTS metering_calls (
  call_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  model TEXT,
  provider TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_estimate REAL,
  latency_ms INTEGER,
  timestamp TEXT
);

CREATE INDEX IF NOT EXISTS idx_metering_calls_job_id ON metering_calls(job_id);
CREATE INDEX IF NOT EXISTS idx_metering_calls_team_id ON metering_calls(team_id);
CREATE INDEX IF NOT EXISTS idx_metering_calls_timestamp ON metering_calls(timestamp);

ALTER TABLE metering_calls ENABLE ROW LEVEL SECURITY;
