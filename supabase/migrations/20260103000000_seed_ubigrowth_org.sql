-- Seed the UbiGrowth organization so later migrations that reference it
-- (gtm_scoring_seed, seed_dashboard_templates, gtm_metrics, org_members)
-- can satisfy foreign key constraints during branch replay.

INSERT INTO organizations (id, name, slug, email_domain)
VALUES (
  '3de82e57-4813-4ad6-83bd-2adb461604f0',
  'UbiGrowth',
  'ubigrowth',
  'ubigrowth.com'
)
ON CONFLICT (id) DO NOTHING;
