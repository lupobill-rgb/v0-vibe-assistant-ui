-- Migration: Seed 4 GTM dashboard templates into published_assets.
-- Idempotent: inserts use NOT EXISTS guard.

-- ============================================================================
-- Drop overly-restrictive unique constraint (1 asset per team+type) to allow
-- multiple dashboard_template rows per team
-- ============================================================================
ALTER TABLE published_assets
  DROP CONSTRAINT IF EXISTS uq_published_asset_team_type;

-- ============================================================================
-- Seed 4 dashboard templates
-- ============================================================================

DO $$
DECLARE
  v_org_id uuid := '3de82e57-4813-4ad6-83bd-2adb461604f0';
  v_team_id uuid := '2a68d841-a6f0-4abd-8cfa-947767378684'; -- Marketing team
BEGIN
  -- Ensure parent rows exist (defensive against silent foundation seed failures)
  INSERT INTO organizations (id, name, slug)
  VALUES (v_org_id, 'UbiGrowth', 'ubigrowth')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO teams (id, org_id, name, slug)
  VALUES (v_team_id, v_org_id, 'Marketing', 'marketing')
  ON CONFLICT (id) DO NOTHING;

  -- Row 1: Phase 0 GTM Scorecard
  IF NOT EXISTS (
    SELECT 1 FROM published_assets
    WHERE name = 'Phase 0 GTM Scorecard' AND org_id = v_org_id
  ) THEN
    INSERT INTO published_assets (
      team_id, org_id, name, asset_type, category, is_seed, is_featured,
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
    WHERE name = 'Prospect Pipeline Tracker' AND org_id = v_org_id
  ) THEN
    INSERT INTO published_assets (
      team_id, org_id, name, asset_type, category, is_seed, is_featured,
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
    WHERE name = 'Competitive Positioning Radar' AND org_id = v_org_id
  ) THEN
    INSERT INTO published_assets (
      team_id, org_id, name, asset_type, category, is_seed, is_featured,
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
    WHERE name = 'Platform Health Monitor' AND org_id = v_org_id
  ) THEN
    INSERT INTO published_assets (
      team_id, org_id, name, asset_type, category, is_seed, is_featured,
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
