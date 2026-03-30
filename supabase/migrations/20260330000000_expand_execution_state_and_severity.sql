-- Expand execution_state CHECK constraint to include agent pipeline states
-- and add 'self-healing' which was missing from the previous expansion.
-- Also documents the severity constraint expansion (warn) already applied.

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_execution_state_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_execution_state_check
  CHECK (execution_state IN (
    'queued', 'cloning', 'building_context', 'calling_llm',
    'applying_diff', 'running_preflight', 'creating_pr',
    'completed', 'complete', 'failed',
    'planning', 'building', 'validating', 'testing',
    'security', 'qa', 'ux', 'self-healing'
  ));

ALTER TABLE job_events DROP CONSTRAINT IF EXISTS job_events_severity_check;
ALTER TABLE job_events ADD CONSTRAINT job_events_severity_check
  CHECK (severity IN ('info', 'error', 'success', 'warning', 'warn'));
