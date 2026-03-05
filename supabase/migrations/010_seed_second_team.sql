-- Seed a Sales team in the same org
INSERT INTO teams (id, org_id, name, description)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '3de82e57-4813-4ad6-83bd-2adb461604f0',
  'Sales',
  'Sales team — owns deals, contacts, and pipeline'
);

-- Sales owns: deals, contacts, pipeline
INSERT INTO data_scopes (team_id, scope_name, access_type)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'deals', 'owned'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'contacts', 'owned'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'pipeline', 'owned'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'campaign_attribution', 'read');

-- Marketing (2a68d841) can see Sales pipeline (aggregate)
INSERT INTO team_visibility (source_team_id, target_team_id, visibility_level)
VALUES (
  '2a68d841-a6f0-4abd-8cfa-947767378684',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'aggregate'
);

-- Sales can see Marketing campaigns (aggregate)
INSERT INTO team_visibility (source_team_id, target_team_id, visibility_level)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '2a68d841-a6f0-4abd-8cfa-947767378684',
  'aggregate'
);
