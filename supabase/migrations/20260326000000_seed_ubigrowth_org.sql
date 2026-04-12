-- Migration: Seed the UbiGrowth organization row.
-- Multiple later migrations reference this org by UUID. On branch replay the
-- row must exist before any FK-constrained seed data is inserted.

INSERT INTO organizations (id, name, slug, email_domain)
VALUES (
  '3de82e57-4813-4ad6-83bd-2adb461604f0',
  'UbiGrowth',
  'ubigrowth',
  'ubigrowth.com'
)
ON CONFLICT (id) DO NOTHING;
