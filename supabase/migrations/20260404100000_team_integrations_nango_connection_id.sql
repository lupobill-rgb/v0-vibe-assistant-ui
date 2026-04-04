-- Add nango_connection_id to team_integrations for webhook→org/team resolution
ALTER TABLE team_integrations
  ADD COLUMN IF NOT EXISTS nango_connection_id text;

-- Index for fast lookup from Nango webhook connectionId
CREATE INDEX IF NOT EXISTS idx_team_integrations_nango_conn
  ON team_integrations (nango_connection_id)
  WHERE nango_connection_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
