ALTER TABLE team_integrations ADD COLUMN IF NOT EXISTS connection_id TEXT;
CREATE INDEX IF NOT EXISTS idx_team_integrations_connection_id ON team_integrations(connection_id);
