-- v7.1 Track 1 — Add 'recommendation' to job_events.severity CHECK constraint.
-- Recommendation mode (autonomous execution output) writes a structured JSON
-- card to job_events with severity='recommendation'. The Build tab UI
-- (Track 2) subscribes via Supabase realtime and renders the card.
--
-- Applied to live DB via Supabase MCP apply_migration on 2026-04-15
-- prior to merge, per CLAUDE.md Section 4.3. This file exists for audit
-- trail only.

ALTER TABLE job_events DROP CONSTRAINT IF EXISTS job_events_severity_check;

ALTER TABLE job_events ADD CONSTRAINT job_events_severity_check
  CHECK (severity = ANY (ARRAY[
    'info'::text,
    'error'::text,
    'success'::text,
    'warning'::text,
    'warn'::text,
    'recommendation'::text
  ]));
