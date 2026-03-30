-- GTM Metrics table: MRR, smoke tests, service status, deploy tracking
-- Idempotent: uses IF NOT EXISTS / ON CONFLICT throughout

-- ============================================================
-- 1. gtm_metrics table
-- ============================================================
CREATE TABLE IF NOT EXISTS gtm_metrics (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        REFERENCES organizations(id) ON DELETE CASCADE,
  metric_type     text        NOT NULL,
  metric_key      text        NOT NULL,
  metric_value    numeric,
  metric_text     text,
  metric_json     jsonb,
  status          text        DEFAULT 'ok',
  recorded_at     timestamptz DEFAULT now(),
  recorded_by     uuid        REFERENCES auth.users(id)
);

ALTER TABLE gtm_metrics ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_gtm_metrics_org_type
  ON gtm_metrics (organization_id, metric_type);

CREATE INDEX IF NOT EXISTS idx_gtm_metrics_org_key
  ON gtm_metrics (organization_id, metric_type, metric_key);

-- Unique constraint for seed idempotency (ON CONFLICT target)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_gtm_metrics_org_type_key'
  ) THEN
    ALTER TABLE gtm_metrics
      ADD CONSTRAINT uq_gtm_metrics_org_type_key
      UNIQUE (organization_id, metric_type, metric_key);
  END IF;
END $$;

-- ============================================================
-- 2. RLS policies
-- ============================================================

-- Read: org members can read their own org's metrics
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gtm_metrics' AND policyname = 'gtm_metrics_org_read'
  ) THEN
    CREATE POLICY gtm_metrics_org_read ON gtm_metrics
      FOR SELECT
      USING (
        organization_id IN (
          SELECT o.id FROM organizations o
          JOIN teams t ON t.org_id = o.id
          JOIN team_members tm ON tm.team_id = t.id
          WHERE tm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Insert: service_role only (no user-facing inserts)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gtm_metrics' AND policyname = 'gtm_metrics_service_insert'
  ) THEN
    CREATE POLICY gtm_metrics_service_insert ON gtm_metrics
      FOR INSERT
      WITH CHECK (
        (current_setting('role', true) = 'service_role')
      );
  END IF;
END $$;

-- Update: service_role only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gtm_metrics' AND policyname = 'gtm_metrics_service_update'
  ) THEN
    CREATE POLICY gtm_metrics_service_update ON gtm_metrics
      FOR UPDATE
      USING (
        (current_setting('role', true) = 'service_role')
      )
      WITH CHECK (
        (current_setting('role', true) = 'service_role')
      );
  END IF;
END $$;

-- ============================================================
-- 3. Seed UbiGrowth metrics (10 rows)
-- ============================================================
DO $$
DECLARE
  _org uuid := '3de82e57-4813-4ad6-83bd-2adb461604f0';
BEGIN
  INSERT INTO gtm_metrics (organization_id, metric_type, metric_key, metric_value, metric_text, status)
  VALUES
    (_org, 'mrr',              'current_mrr',         0,    NULL,            'ok'),
    (_org, 'customer_count',   'paying_customers',    0,    NULL,            'ok'),
    (_org, 'smoke_test',       'LP-01_landing_page',  NULL, 'pass',          'ok'),
    (_org, 'smoke_test',       'DASH-01_dashboard_load', NULL, 'pass',       'ok'),
    (_org, 'smoke_test',       'SITE-01_api_health',  NULL, 'pass',          'ok'),
    (_org, 'service_status',   'vercel_frontend',     NULL, 'operational',   'ok'),
    (_org, 'service_status',   'railway_api',         NULL, 'operational',   'ok'),
    (_org, 'service_status',   'supabase_db',         NULL, 'operational',   'ok'),
    (_org, 'channel_activity', 'linkedin_outreach',   0,    NULL,            'ok'),
    (_org, 'deploy',           'last_deploy_sha',     NULL, '',              'ok')
  ON CONFLICT ON CONSTRAINT uq_gtm_metrics_org_type_key DO NOTHING;
END $$;
