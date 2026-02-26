-- Migration: RLS policies for tenant isolation
-- Every table is restricted so that only members of the owning team can access rows.
-- The authenticated user's ID comes from auth.uid() (the JWT "sub" claim).

-- ============================================================================
-- Helper: returns the set of team_ids the current user belongs to.
-- Used by all policies below.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_team_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM team_members WHERE user_id = auth.uid();
$$;

-- ============================================================================
-- organizations
-- Access: users who belong to any team within the org
-- ============================================================================
CREATE POLICY "org_select" ON organizations FOR SELECT
  USING (id IN (
    SELECT org_id FROM teams WHERE id IN (SELECT public.user_team_ids())
  ));

CREATE POLICY "org_insert" ON organizations FOR INSERT
  WITH CHECK (true);  -- any authenticated user can create an org

CREATE POLICY "org_update" ON organizations FOR UPDATE
  USING (id IN (
    SELECT org_id FROM teams WHERE id IN (SELECT public.user_team_ids())
  ));

CREATE POLICY "org_delete" ON organizations FOR DELETE
  USING (id IN (
    SELECT org_id FROM teams WHERE id IN (SELECT public.user_team_ids())
  ));

-- ============================================================================
-- teams
-- Access: members of the team
-- ============================================================================
CREATE POLICY "team_select" ON teams FOR SELECT
  USING (id IN (SELECT public.user_team_ids()));

CREATE POLICY "team_insert" ON teams FOR INSERT
  WITH CHECK (true);  -- creating a team is allowed; the creator should add themselves as owner

CREATE POLICY "team_update" ON teams FOR UPDATE
  USING (id IN (SELECT public.user_team_ids()));

CREATE POLICY "team_delete" ON teams FOR DELETE
  USING (id IN (SELECT public.user_team_ids()));

-- ============================================================================
-- team_members
-- Access: members of the same team
-- ============================================================================
CREATE POLICY "team_members_select" ON team_members FOR SELECT
  USING (team_id IN (SELECT public.user_team_ids()));

CREATE POLICY "team_members_insert" ON team_members FOR INSERT
  WITH CHECK (team_id IN (SELECT public.user_team_ids()));

CREATE POLICY "team_members_update" ON team_members FOR UPDATE
  USING (team_id IN (SELECT public.user_team_ids()));

CREATE POLICY "team_members_delete" ON team_members FOR DELETE
  USING (team_id IN (SELECT public.user_team_ids()));

-- ============================================================================
-- projects
-- Access: members of the owning team
-- ============================================================================
CREATE POLICY "projects_select" ON projects FOR SELECT
  USING (team_id IN (SELECT public.user_team_ids()));

CREATE POLICY "projects_insert" ON projects FOR INSERT
  WITH CHECK (team_id IN (SELECT public.user_team_ids()));

CREATE POLICY "projects_update" ON projects FOR UPDATE
  USING (team_id IN (SELECT public.user_team_ids()));

CREATE POLICY "projects_delete" ON projects FOR DELETE
  USING (team_id IN (SELECT public.user_team_ids()));

-- ============================================================================
-- jobs
-- Access: members of the team that owns the parent project
-- ============================================================================
CREATE POLICY "jobs_select" ON jobs FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE team_id IN (SELECT public.user_team_ids())
  ));

CREATE POLICY "jobs_insert" ON jobs FOR INSERT
  WITH CHECK (project_id IN (
    SELECT id FROM projects WHERE team_id IN (SELECT public.user_team_ids())
  ));

CREATE POLICY "jobs_update" ON jobs FOR UPDATE
  USING (project_id IN (
    SELECT id FROM projects WHERE team_id IN (SELECT public.user_team_ids())
  ));

CREATE POLICY "jobs_delete" ON jobs FOR DELETE
  USING (project_id IN (
    SELECT id FROM projects WHERE team_id IN (SELECT public.user_team_ids())
  ));

-- ============================================================================
-- job_events
-- Access: members of the team that owns the parent project (via job)
-- ============================================================================
CREATE POLICY "job_events_select" ON job_events FOR SELECT
  USING (job_id IN (
    SELECT id FROM jobs WHERE project_id IN (
      SELECT id FROM projects WHERE team_id IN (SELECT public.user_team_ids())
    )
  ));

CREATE POLICY "job_events_insert" ON job_events FOR INSERT
  WITH CHECK (job_id IN (
    SELECT id FROM jobs WHERE project_id IN (
      SELECT id FROM projects WHERE team_id IN (SELECT public.user_team_ids())
    )
  ));

CREATE POLICY "job_events_update" ON job_events FOR UPDATE
  USING (job_id IN (
    SELECT id FROM jobs WHERE project_id IN (
      SELECT id FROM projects WHERE team_id IN (SELECT public.user_team_ids())
    )
  ));

CREATE POLICY "job_events_delete" ON job_events FOR DELETE
  USING (job_id IN (
    SELECT id FROM jobs WHERE project_id IN (
      SELECT id FROM projects WHERE team_id IN (SELECT public.user_team_ids())
    )
  ));

-- ============================================================================
-- supabase_connections
-- Access: members of the team that owns the parent project
-- ============================================================================
CREATE POLICY "supabase_connections_select" ON supabase_connections FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE team_id IN (SELECT public.user_team_ids())
  ));

CREATE POLICY "supabase_connections_insert" ON supabase_connections FOR INSERT
  WITH CHECK (project_id IN (
    SELECT id FROM projects WHERE team_id IN (SELECT public.user_team_ids())
  ));

CREATE POLICY "supabase_connections_update" ON supabase_connections FOR UPDATE
  USING (project_id IN (
    SELECT id FROM projects WHERE team_id IN (SELECT public.user_team_ids())
  ));

CREATE POLICY "supabase_connections_delete" ON supabase_connections FOR DELETE
  USING (project_id IN (
    SELECT id FROM projects WHERE team_id IN (SELECT public.user_team_ids())
  ));

-- ============================================================================
-- tenant_budgets
-- Access: members of any team within the org
-- ============================================================================
CREATE POLICY "tenant_budgets_select" ON tenant_budgets FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM teams WHERE id IN (SELECT public.user_team_ids())
  ));

CREATE POLICY "tenant_budgets_insert" ON tenant_budgets FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM teams WHERE id IN (SELECT public.user_team_ids())
  ));

CREATE POLICY "tenant_budgets_update" ON tenant_budgets FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM teams WHERE id IN (SELECT public.user_team_ids())
  ));

CREATE POLICY "tenant_budgets_delete" ON tenant_budgets FOR DELETE
  USING (org_id IN (
    SELECT org_id FROM teams WHERE id IN (SELECT public.user_team_ids())
  ));

-- ============================================================================
-- metering_calls
-- Access: members of the team
-- ============================================================================
CREATE POLICY "metering_calls_select" ON metering_calls FOR SELECT
  USING (team_id::uuid IN (SELECT public.user_team_ids()));

CREATE POLICY "metering_calls_insert" ON metering_calls FOR INSERT
  WITH CHECK (team_id::uuid IN (SELECT public.user_team_ids()));

CREATE POLICY "metering_calls_update" ON metering_calls FOR UPDATE
  USING (team_id::uuid IN (SELECT public.user_team_ids()));

CREATE POLICY "metering_calls_delete" ON metering_calls FOR DELETE
  USING (team_id::uuid IN (SELECT public.user_team_ids()));
