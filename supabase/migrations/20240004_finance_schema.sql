-- Migration: Finance schema — budget allocations and team spend tracking
-- Sprint: Finance Session 1
-- Depends on: 001_org_team_project_job (organizations, teams, team_members)

-- ============================================================================
-- Budget Allocations
-- ============================================================================
CREATE TABLE IF NOT EXISTS budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  q1_amount NUMERIC(12,2) DEFAULT 0,
  q2_amount NUMERIC(12,2) DEFAULT 0,
  q3_amount NUMERIC(12,2) DEFAULT 0,
  q4_amount NUMERIC(12,2) DEFAULT 0,
  annual_total NUMERIC(12,2) GENERATED ALWAYS AS
    (q1_amount + q2_amount + q3_amount + q4_amount) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One budget row per team+category+year
ALTER TABLE budget_allocations
  DROP CONSTRAINT IF EXISTS uq_budget_team_category_year;
ALTER TABLE budget_allocations
  ADD CONSTRAINT uq_budget_team_category_year
  UNIQUE (team_id, category, fiscal_year);

CREATE INDEX IF NOT EXISTS idx_budget_alloc_team ON budget_allocations(team_id);
CREATE INDEX IF NOT EXISTS idx_budget_alloc_org  ON budget_allocations(organization_id);

-- ============================================================================
-- Team Spend
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  allocation_id UUID REFERENCES budget_allocations(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  vendor TEXT,
  quarter INTEGER CHECK (quarter IN (1, 2, 3, 4)),
  spend_date DATE DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_spend_team       ON team_spend(team_id);
CREATE INDEX IF NOT EXISTS idx_team_spend_allocation  ON team_spend(allocation_id);
CREATE INDEX IF NOT EXISTS idx_team_spend_date        ON team_spend(spend_date);

-- ============================================================================
-- Enable RLS
-- ============================================================================
ALTER TABLE budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_spend         ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Policies: budget_allocations
-- ============================================================================

-- Team members can read their own team's allocations
DROP POLICY IF EXISTS "team_read_own_allocations" ON budget_allocations;
CREATE POLICY "team_read_own_allocations" ON budget_allocations
  FOR SELECT
  USING (
    team_id IN (SELECT public.user_team_ids())
  );

-- Finance team can read ALL allocations across all teams
DROP POLICY IF EXISTS "finance_read_all_allocations" ON budget_allocations;
CREATE POLICY "finance_read_all_allocations" ON budget_allocations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid()
        AND t.name = 'Finance'
    )
  );

-- ============================================================================
-- Policies: team_spend
-- ============================================================================

-- Team members can read their own team's spend
DROP POLICY IF EXISTS "team_read_own_spend" ON team_spend;
CREATE POLICY "team_read_own_spend" ON team_spend
  FOR SELECT
  USING (
    team_id IN (SELECT public.user_team_ids())
  );

-- Team members can insert spend for their own team only
DROP POLICY IF EXISTS "team_insert_own_spend" ON team_spend;
CREATE POLICY "team_insert_own_spend" ON team_spend
  FOR INSERT
  WITH CHECK (
    team_id IN (SELECT public.user_team_ids())
  );

-- Finance team can read ALL spend across all teams
DROP POLICY IF EXISTS "finance_read_all_spend" ON team_spend;
CREATE POLICY "finance_read_all_spend" ON team_spend
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid()
        AND t.name = 'Finance'
    )
  );

-- ============================================================================
-- Auto-update updated_at on budget_allocations
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_budget_allocations_updated_at ON budget_allocations;
CREATE TRIGGER trg_budget_allocations_updated_at
  BEFORE UPDATE ON budget_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
