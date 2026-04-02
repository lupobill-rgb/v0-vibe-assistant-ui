-- Decipher (Forsta) survey response storage
CREATE TABLE IF NOT EXISTS decipher_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_path text NOT NULL,
  respondent_id text,
  response_data jsonb,
  completed_at timestamptz,
  team_id uuid REFERENCES teams(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decipher_responses_team_survey
  ON decipher_responses(team_id, survey_path);

-- RLS
ALTER TABLE decipher_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY decipher_responses_team_read ON decipher_responses
  FOR SELECT USING (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN org_members om ON om.org_id = t.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY decipher_responses_team_insert ON decipher_responses
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN org_members om ON om.org_id = t.org_id
      WHERE om.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
