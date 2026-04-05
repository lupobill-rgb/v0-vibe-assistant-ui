-- Migration: Seed 4 GTM dashboard templates into published_assets.
-- Adds name + organization_id columns if missing, then inserts seed rows.
-- Idempotent: columns use IF NOT EXISTS, inserts use NOT EXISTS guard.

-- ============================================================================
-- Ensure required columns exist
-- ============================================================================

ALTER TABLE published_assets
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_published_assets_org
  ON published_assets(organization_id) WHERE organization_id IS NOT NULL;

-- ============================================================================
-- Seed 4 dashboard templates
-- ============================================================================

DO $$
DECLARE
  v_org_id uuid := '3de82e57-4813-4ad6-83bd-2adb461604f0';
  v_team_id uuid := '2a68d841-a6f0-4abd-8cfa-947767378684'; -- Marketing team
BEGIN

  -- Row 1: Phase 0 GTM Scorecard
  IF NOT EXISTS (
    SELECT 1 FROM published_assets
    WHERE name = 'Phase 0 GTM Scorecard' AND organization_id = v_org_id
  ) THEN
    INSERT INTO published_assets (
      team_id, organization_id, name, asset_type, category, is_seed, is_featured,
      source_prompt, preview_html
    ) VALUES (
      v_team_id,
      v_org_id,
      'Phase 0 GTM Scorecard',
      'dashboard_template',
      'sales',
      true,
      true,
      'Build a GTM scorecard showing MRR, customer count, pipeline value, and conversion rate. Data from gtm_metrics and gtm_deals. Use vibeLoadData.',
      '<div>Phase 0 Scorecard preview</div>'
    );
  END IF;

  -- Row 2: Prospect Pipeline Tracker
  IF NOT EXISTS (
    SELECT 1 FROM published_assets
    WHERE name = 'Prospect Pipeline Tracker' AND organization_id = v_org_id
  ) THEN
    INSERT INTO published_assets (
      team_id, organization_id, name, asset_type, category, is_seed, is_featured,
      source_prompt, preview_html
    ) VALUES (
      v_team_id,
      v_org_id,
      'Prospect Pipeline Tracker',
      'dashboard_template',
      'sales',
      true,
      true,
      'Build a pipeline tracker showing deals by stage, lead scores, and next follow-up dates. Data from gtm_deals, gtm_leads, gtm_prospect_scores. Use vibeLoadData.',
      '<div>Pipeline Tracker preview</div>'
    );
  END IF;

  -- Row 3: Competitive Positioning Radar
  IF NOT EXISTS (
    SELECT 1 FROM published_assets
    WHERE name = 'Competitive Positioning Radar' AND organization_id = v_org_id
  ) THEN
    INSERT INTO published_assets (
      team_id, organization_id, name, asset_type, category, is_seed, is_featured,
      source_prompt, preview_html
    ) VALUES (
      v_team_id,
      v_org_id,
      'Competitive Positioning Radar',
      'dashboard_template',
      'marketing',
      true,
      true,
      'Build a competitive radar chart comparing VIBE vs Retool, Lovable, v0, Bolt on: NLP-to-UI, enterprise, speed, price, white-label. Use vibeLoadData for scores from gtm_metrics.',
      '<div>Competitive Radar preview</div>'
    );
  END IF;

  -- Row 4: Platform Health Monitor
  IF NOT EXISTS (
    SELECT 1 FROM published_assets
    WHERE name = 'Platform Health Monitor' AND organization_id = v_org_id
  ) THEN
    INSERT INTO published_assets (
      team_id, organization_id, name, asset_type, category, is_seed, is_featured,
      source_prompt, preview_html
    ) VALUES (
      v_team_id,
      v_org_id,
      'Platform Health Monitor',
      'dashboard_template',
      'engineering',
      true,
      true,
      'Build a platform health dashboard showing API uptime, Edge Function latency, error rates, and active jobs. Data from gtm_metrics. Use vibeLoadData.',
      '<div>Platform Health preview</div>'
    );
  END IF;

END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
