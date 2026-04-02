-- Generic table for API-key-based integrations not supported by Nango
CREATE TABLE IF NOT EXISTS team_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id),
  provider text NOT NULL,
  api_key text,
  config jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, provider)
);

-- RLS
ALTER TABLE team_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY team_integrations_team_read ON team_integrations
  FOR SELECT USING (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN org_members om ON om.org_id = t.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY team_integrations_team_insert ON team_integrations
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN org_members om ON om.org_id = t.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY team_integrations_team_update ON team_integrations
  FOR UPDATE USING (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN org_members om ON om.org_id = t.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY team_integrations_team_delete ON team_integrations
  FOR DELETE USING (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN org_members om ON om.org_id = t.org_id
      WHERE om.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
