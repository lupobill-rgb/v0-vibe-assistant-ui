-- Seed: org, teams, and team_visibility self-reference rows
-- Each team should always have full record-level visibility into its own data.

-- Add description column to teams (used by seed data, not present in 001)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT;

-- Seed the VIBE org
INSERT INTO organizations (id, name, slug)
VALUES ('3de82e57-4813-4ad6-83bd-2adb461604f0', 'VIBE', 'vibe')
ON CONFLICT (id) DO NOTHING;

-- Seed the Marketing team
INSERT INTO teams (id, org_id, name, slug, description)
VALUES (
  '2a68d841-a6f0-4abd-8cfa-947767378684',
  '3de82e57-4813-4ad6-83bd-2adb461604f0',
  'Marketing',
  'marketing',
  'Marketing team — owns campaigns, attribution, and content'
)
ON CONFLICT (id) DO NOTHING;

-- VIBE Marketing team sees itself (record-level visibility)
INSERT INTO team_visibility (source_team_id, target_team_id, visibility_level)
VALUES
  ('2a68d841-a6f0-4abd-8cfa-947767378684', '2a68d841-a6f0-4abd-8cfa-947767378684', 'record')
ON CONFLICT DO NOTHING;

-- TODO: Add cross-team visibility rows once additional teams are seeded.
-- Planned rows (blocked on team seeds):
--   Marketing -> Sales pipeline (aggregate)
--   Sales -> Marketing campaign attribution (aggregate)
--   Sales -> Product retention by segment (aggregate)
--   Finance -> all teams (record for execs, aggregate for ICs)
--   Product -> Sales feature requests (aggregate)
--   Engineering -> all deploys (record)
