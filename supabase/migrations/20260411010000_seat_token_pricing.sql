-- Migration: Seat + token consumption pricing model
-- Adds cost_rates table, token_usage tracking, and trial/seat columns on organizations.
-- Idempotent: all operations use IF NOT EXISTS / DO NOTHING.

-- ============================================================================
-- 1. cost_rates — LLM provider cost rates (source of truth for billing math)
--    DO NOT hardcode LLM costs; read from this table at runtime.
-- ============================================================================
CREATE TABLE IF NOT EXISTS cost_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,               -- e.g. 'anthropic', 'openai'
  model TEXT NOT NULL,                   -- e.g. 'claude-sonnet-4-20250514', 'gpt-4o'
  input_per_million NUMERIC(10,4) NOT NULL,  -- USD per 1M input tokens
  output_per_million NUMERIC(10,4) NOT NULL, -- USD per 1M output tokens
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ,           -- NULL = current rate
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, model, effective_from)
);

-- Seed current rates (can be updated without code deploys)
INSERT INTO cost_rates (provider, model, input_per_million, output_per_million)
VALUES
  ('anthropic', 'claude',   3.0,  15.0),
  ('anthropic', 'claude-sonnet', 3.0, 15.0),
  ('openai',    'gpt',     10.0,  30.0),
  ('openai',    'gpt-4o',   5.0,  15.0)
ON CONFLICT DO NOTHING;

ALTER TABLE cost_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY cost_rates_select ON cost_rates
  FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- 2. token_usage — per-user per-period token consumption ledger
-- ============================================================================
CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  period_start DATE NOT NULL DEFAULT date_trunc('month', now())::date,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_token_usage_org_period
  ON token_usage(org_id, period_start);

CREATE INDEX IF NOT EXISTS idx_token_usage_user_period
  ON token_usage(user_id, period_start);

ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY token_usage_select ON token_usage
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. Add trial and seat billing columns to organizations
-- ============================================================================
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_model TEXT DEFAULT 'seat_token'
    CHECK (billing_model IN ('legacy_tier', 'seat_token', 'enterprise_custom')),
  ADD COLUMN IF NOT EXISTS active_user_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_used_this_period BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_included_this_period BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;

-- Set trial_started_at for existing orgs that don't have it
UPDATE organizations
SET trial_started_at = created_at,
    trial_ends_at = created_at + INTERVAL '30 days'
WHERE trial_started_at IS NULL
  AND created_at IS NOT NULL;

-- ============================================================================
-- 4. RPC functions for atomic token usage updates
-- ============================================================================

-- Upsert per-user per-period token usage (atomic increment)
CREATE OR REPLACE FUNCTION upsert_token_usage(
  p_org_id UUID,
  p_user_id UUID,
  p_period_start DATE,
  p_input_tokens BIGINT,
  p_output_tokens BIGINT,
  p_total_tokens BIGINT,
  p_cost_usd NUMERIC
) RETURNS VOID AS $$
BEGIN
  INSERT INTO token_usage (org_id, user_id, period_start, input_tokens, output_tokens, total_tokens, estimated_cost_usd, updated_at)
  VALUES (p_org_id, p_user_id, p_period_start, p_input_tokens, p_output_tokens, p_total_tokens, p_cost_usd, now())
  ON CONFLICT (org_id, user_id, period_start)
  DO UPDATE SET
    input_tokens = token_usage.input_tokens + p_input_tokens,
    output_tokens = token_usage.output_tokens + p_output_tokens,
    total_tokens = token_usage.total_tokens + p_total_tokens,
    estimated_cost_usd = token_usage.estimated_cost_usd + p_cost_usd,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic increment of org-level token counter
CREATE OR REPLACE FUNCTION increment_org_tokens(
  p_org_id UUID,
  p_tokens BIGINT
) RETURNS BIGINT AS $$
DECLARE
  new_total BIGINT;
BEGIN
  UPDATE organizations
  SET tokens_used_this_period = COALESCE(tokens_used_this_period, 0) + p_tokens
  WHERE id = p_org_id
  RETURNING tokens_used_this_period INTO new_total;
  RETURN new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
