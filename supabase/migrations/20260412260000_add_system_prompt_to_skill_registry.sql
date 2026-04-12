-- Add skill-scoped system_prompt column to skill_registry.
-- Consumed by apps/api/src/orchestrator/worker.service.ts (ClaudeWorker),
-- which composes a 5-line thin wrapper + skill.system_prompt for each
-- PlanStep. Worker already tolerates NULL, so no backfill is required —
-- existing skills fall back to the thin wrapper alone until authored.
--
-- Additive only. No RLS changes, no renames, no drops. Follows the
-- orchestration extension landed in 20260412250000.

ALTER TABLE public.skill_registry
  ADD COLUMN IF NOT EXISTS system_prompt TEXT;

COMMENT ON COLUMN public.skill_registry.system_prompt IS
  'Skill-scoped system prompt appended to the VIBE thin wrapper by ClaudeWorker. NULL means the skill relies on the thin wrapper alone.';
