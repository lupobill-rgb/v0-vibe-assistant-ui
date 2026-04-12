-- Extend skill_registry for runtime vs build-time orchestration.
-- Additive only. No RLS changes, no renames, no drops.
-- Template gallery continues to work because defaults preserve existing behavior:
--   mode='build' matches today's skill_registry semantics (build-time generation).
--
-- Context: Sprint work for runtime/hybrid skill execution. Existing 109 rows
-- default to mode='build' so no application code changes are required.

ALTER TABLE public.skill_registry
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'build'
    CHECK (mode IN ('build', 'runtime', 'hybrid'));

ALTER TABLE public.skill_registry
  ADD COLUMN IF NOT EXISTS inputs_schema JSONB;

ALTER TABLE public.skill_registry
  ADD COLUMN IF NOT EXISTS outputs_schema JSONB;

ALTER TABLE public.skill_registry
  ADD COLUMN IF NOT EXISTS tool_grants TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

ALTER TABLE public.skill_registry
  ADD COLUMN IF NOT EXISTS composable BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS skill_registry_mode_idx
  ON public.skill_registry(mode);

COMMENT ON COLUMN public.skill_registry.mode IS
  'Orchestration mode: build=generate at build-time, runtime=invoked at request-time, hybrid=both.';
COMMENT ON COLUMN public.skill_registry.inputs_schema IS
  'JSON Schema describing runtime inputs for runtime/hybrid skills.';
COMMENT ON COLUMN public.skill_registry.outputs_schema IS
  'JSON Schema describing outputs returned by runtime/hybrid skills.';
COMMENT ON COLUMN public.skill_registry.tool_grants IS
  'Tool names this skill is authorized to invoke at runtime.';
COMMENT ON COLUMN public.skill_registry.composable IS
  'Whether this skill can be chained/composed inside another skill.';
