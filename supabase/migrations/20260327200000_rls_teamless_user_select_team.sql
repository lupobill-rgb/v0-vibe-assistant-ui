-- Fix RLS for teamless users on /select-team page
-- Users in org_members but not yet in team_members need to:
--   1. See all teams in their org
--   2. See member counts per team
--   3. Join (INSERT into) a team in their org

-- 1. Teamless users in an org need to SEE all teams in their org
CREATE POLICY teams_select_via_org ON teams
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- 2. Teamless users need to see team_members rows to get member counts
--    Scoped: only for teams in orgs the user belongs to
CREATE POLICY team_members_select_via_org ON team_members
  FOR SELECT USING (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN org_members om ON om.org_id = t.org_id
      WHERE om.user_id = auth.uid()
    )
  );

-- 3. Teamless users need to INSERT themselves into a team (join).
--    Current team_members_insert policy requires user_team_ids() which
--    is empty for a user's first team join.
--    New policy: user can insert themselves into any team in their org.
CREATE POLICY team_members_insert_via_org ON team_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND team_id IN (
      SELECT t.id FROM teams t
      JOIN org_members om ON om.org_id = t.org_id
      WHERE om.user_id = auth.uid()
    )
  );
