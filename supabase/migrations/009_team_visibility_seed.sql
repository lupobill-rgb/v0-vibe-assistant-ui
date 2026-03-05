-- Seed: team_visibility self-reference rows
-- Each team should always have full record-level visibility into its own data.

-- VIBE Marketing team sees itself (full, record-level)
INSERT INTO team_visibility (source_team_id, target_team_id, visibility_level, data_granularity)
VALUES
  ('2a68d841-a6f0-4abd-8cfa-947767378684', '2a68d841-a6f0-4abd-8cfa-947767378684', 'full', 'record');

-- TODO: Add cross-team visibility rows once additional teams are seeded.
-- Planned rows (blocked on team seeds):
--   Marketing -> Sales pipeline (aggregate)
--   Sales -> Marketing campaign attribution (aggregate)
--   Sales -> Product retention by segment (aggregate)
--   Finance -> all teams (record for execs, aggregate for ICs)
--   Product -> Sales feature requests (aggregate)
--   Engineering -> all deploys (full)
