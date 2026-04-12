-- Foundation seed — runs after bootstrap_base_tables, before all other migrations
-- Creates all parent rows that subsequent migrations reference
-- Safe to run multiple times (IF NOT EXISTS guards on everything)

DO $$
BEGIN
  -- 1. UbiGrowth organization
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = '3de82e57-4813-4ad6-83bd-2adb461604f0') THEN
    INSERT INTO organizations (id, name, slug)
    VALUES ('3de82e57-4813-4ad6-83bd-2adb461604f0', 'UbiGrowth', 'ubigrowth');
  END IF;

  -- 2. Sales team
  IF NOT EXISTS (SELECT 1 FROM teams WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890') THEN
    INSERT INTO teams (id, org_id, name, slug)
    VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            '3de82e57-4813-4ad6-83bd-2adb461604f0', 'Sales', 'sales');
  END IF;

  -- 3. Marketing team
  IF NOT EXISTS (SELECT 1 FROM teams WHERE id = '2a68d841-a6f0-4abd-8cfa-947767378684') THEN
    INSERT INTO teams (id, org_id, name, slug)
    VALUES ('2a68d841-a6f0-4abd-8cfa-947767378684',
            '3de82e57-4813-4ad6-83bd-2adb461604f0', 'Marketing', 'marketing');
  END IF;

  -- 4. Bill's user auth record — skip, auth.users managed by Supabase Auth
  NULL;
END $$;
