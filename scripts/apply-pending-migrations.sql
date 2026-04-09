-- ============================================================================
-- VIBE: Combined migration script — 18 pending migrations
-- Apply via Supabase SQL Editor → paste entire file → Run
-- All statements use IF NOT EXISTS / IF EXISTS guards — safe to re-run
-- Generated: 2026-04-09
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. feed_subscriptions (20260403000000)
-- ============================================================================
CREATE TABLE IF NOT EXISTS feed_subscriptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id           uuid NOT NULL REFERENCES published_assets(id) ON DELETE CASCADE,
  subscriber_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  subscriber_user_id uuid REFERENCES auth.users(id),
  subscribed_at      timestamptz NOT NULL DEFAULT now(),
  status             text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','paused','cancelled')),
  UNIQUE(asset_id, subscriber_team_id)
);

ALTER TABLE feed_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_feed_subs_asset ON feed_subscriptions(asset_id);
CREATE INDEX IF NOT EXISTS idx_feed_subs_team  ON feed_subscriptions(subscriber_team_id);

DO $$ BEGIN
  CREATE POLICY "team_member_select" ON feed_subscriptions FOR SELECT USING (
    subscriber_team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "publisher_select" ON feed_subscriptions FOR SELECT USING (
    asset_id IN (SELECT id FROM published_assets WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "team_member_insert" ON feed_subscriptions FOR INSERT WITH CHECK (
    subscriber_team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "team_member_update" ON feed_subscriptions FOR UPDATE USING (
    subscriber_team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "team_member_delete" ON feed_subscriptions FOR DELETE USING (
    subscriber_team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 2. autonomous_executions + cascade_edges (20260403100000)
-- ============================================================================
CREATE TABLE IF NOT EXISTS autonomous_executions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id),
  team_id          uuid NOT NULL REFERENCES teams(id),
  skill_id         uuid NOT NULL REFERENCES skill_registry(id),
  trigger_source   text NOT NULL,
  trigger_event    text NOT NULL,
  trigger_payload  jsonb,
  job_id           uuid REFERENCES jobs(id),
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','running','complete','failed')),
  created_at       timestamptz DEFAULT now(),
  completed_at     timestamptz
);

ALTER TABLE autonomous_executions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_auto_exec_org_created ON autonomous_executions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_exec_skill       ON autonomous_executions(skill_id);

DO $$ BEGIN
  CREATE POLICY "org_member_select" ON autonomous_executions FOR SELECT USING (
    organization_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS cascade_edges (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id),
  source_execution_id   uuid NOT NULL REFERENCES autonomous_executions(id),
  target_execution_id   uuid NOT NULL REFERENCES autonomous_executions(id),
  source_skill_id       uuid NOT NULL REFERENCES skill_registry(id),
  target_skill_id       uuid NOT NULL REFERENCES skill_registry(id),
  feed_subscription_id  uuid,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE cascade_edges ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cascade_source ON cascade_edges(source_execution_id);
CREATE INDEX IF NOT EXISTS idx_cascade_org_created ON cascade_edges(organization_id, created_at DESC);

DO $$ BEGIN
  CREATE POLICY "org_member_select" ON cascade_edges FOR SELECT USING (
    organization_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 3. skill_registry trigger_on column (20260403200000)
-- ============================================================================
ALTER TABLE skill_registry ADD COLUMN IF NOT EXISTS trigger_on text;
CREATE INDEX IF NOT EXISTS idx_skill_registry_trigger_on ON skill_registry(trigger_on) WHERE trigger_on IS NOT NULL;

-- ============================================================================
-- 4. skill_triggers table (20260403210000)
-- ============================================================================
CREATE TABLE IF NOT EXISTS skill_triggers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id    uuid NOT NULL REFERENCES skill_registry(id) ON DELETE CASCADE,
  provider    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (skill_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_skill_triggers_skill_id ON skill_triggers(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_triggers_provider ON skill_triggers(provider);
ALTER TABLE skill_triggers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY skill_triggers_select ON skill_triggers FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY skill_triggers_service_all ON skill_triggers FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 5. Populate trigger_on (20260404000000)
-- ============================================================================
UPDATE skill_registry SET trigger_on = 'hubspot:deals'
WHERE team_function = 'sales' AND (skill_name LIKE 'pipeline-%' OR skill_name LIKE 'deal-%') AND trigger_on IS NULL;

UPDATE skill_registry SET trigger_on = 'hubspot:contacts'
WHERE team_function = 'sales' AND (skill_name LIKE 'contact-%' OR skill_name LIKE 'lead-%') AND trigger_on IS NULL;

UPDATE skill_registry SET trigger_on = 'hubspot:deals'
WHERE team_function = 'sales' AND skill_name LIKE 'forecast-%' AND trigger_on IS NULL;

UPDATE skill_registry SET trigger_on = 'hubspot:deals'
WHERE team_function = 'sales' AND skill_name LIKE 'crm-%' AND trigger_on IS NULL;

UPDATE skill_registry SET trigger_on = 'google-analytics-4:traffic'
WHERE team_function = 'marketing' AND (skill_name LIKE 'campaign-%' OR skill_name LIKE 'traffic-%') AND trigger_on IS NULL;

UPDATE skill_registry SET trigger_on = 'google-analytics-4:traffic'
WHERE team_function = 'marketing' AND (skill_name LIKE 'seo-%' OR skill_name LIKE 'analytics-%') AND trigger_on IS NULL;

UPDATE skill_registry SET trigger_on = 'mixpanel:events'
WHERE team_function = 'marketing' AND (skill_name LIKE 'funnel-%' OR skill_name LIKE 'conversion-%') AND trigger_on IS NULL;

UPDATE skill_registry SET trigger_on = 'hubspot:contacts'
WHERE team_function = 'support' AND skill_name LIKE 'ticket-%' AND trigger_on IS NULL;

UPDATE skill_registry SET trigger_on = 'airtable:records'
WHERE team_function = 'data' AND skill_name LIKE 'survey-%' AND trigger_on IS NULL;

-- ============================================================================
-- 6. team_integrations nango_connection_id (20260404100000)
-- ============================================================================
ALTER TABLE team_integrations ADD COLUMN IF NOT EXISTS nango_connection_id text;
CREATE INDEX IF NOT EXISTS idx_team_integrations_nango_conn ON team_integrations(nango_connection_id) WHERE nango_connection_id IS NOT NULL;

-- ============================================================================
-- 7. Reload PostgREST schema (20260404200000)
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- 8. Onboarding tables (20260405000000)
-- ============================================================================
CREATE TABLE IF NOT EXISTS org_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'active',
  flags JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);
ALTER TABLE org_feature_flags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY org_feature_flags_select ON org_feature_flags FOR SELECT TO authenticated
    USING (organization_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY org_feature_flags_update ON org_feature_flags FOR UPDATE TO authenticated
    USING (organization_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'owner')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 5),
  company_name TEXT, industry TEXT, team_size TEXT, primary_use_case TEXT,
  overall_verdict TEXT CHECK (overall_verdict IS NULL OR overall_verdict IN ('good', 'neutral', 'bad')),
  verdict_summary TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(organization_id)
);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_org ON onboarding_sessions(organization_id);
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY onboarding_sessions_select ON onboarding_sessions FOR SELECT TO authenticated
    USING (organization_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY onboarding_sessions_update ON onboarding_sessions FOR UPDATE TO authenticated
    USING (organization_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL CHECK (step_number BETWEEN 1 AND 5),
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  verdict TEXT CHECK (verdict IS NULL OR verdict IN ('good', 'neutral', 'bad')),
  verdict_message TEXT, recommendation TEXT, duration_seconds INTEGER,
  started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  UNIQUE(session_id, step_number)
);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_session ON onboarding_steps(session_id);
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY onboarding_steps_select ON onboarding_steps FOR SELECT TO authenticated
    USING (session_id IN (SELECT os.id FROM onboarding_sessions os JOIN org_members om ON om.org_id = os.organization_id WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY onboarding_steps_update ON onboarding_steps FOR UPDATE TO authenticated
    USING (session_id IN (SELECT os.id FROM onboarding_sessions os JOIN org_members om ON om.org_id = os.organization_id WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS onboarding_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'connecting', 'connected', 'failed', 'skipped')),
  record_count INTEGER NOT NULL DEFAULT 0,
  verdict TEXT CHECK (verdict IS NULL OR verdict IN ('good', 'neutral', 'bad')),
  verdict_message TEXT, connected_at TIMESTAMPTZ,
  UNIQUE(session_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_onboarding_connectors_session ON onboarding_connectors(session_id);
ALTER TABLE onboarding_connectors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY onboarding_connectors_select ON onboarding_connectors FOR SELECT TO authenticated
    USING (session_id IN (SELECT os.id FROM onboarding_sessions os JOIN org_members om ON om.org_id = os.organization_id WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY onboarding_connectors_update ON onboarding_connectors FOR UPDATE TO authenticated
    USING (session_id IN (SELECT os.id FROM onboarding_sessions os JOIN org_members om ON om.org_id = os.organization_id WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 9. Onboarding progression (20260405000001)
-- ============================================================================
CREATE OR REPLACE FUNCTION initialize_onboarding(p_org_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session_id UUID;
BEGIN
  INSERT INTO org_feature_flags (organization_id, stage) VALUES (p_org_id, 'onboarding')
  ON CONFLICT (organization_id) DO UPDATE SET stage = 'onboarding', updated_at = now();
  SELECT id INTO v_session_id FROM onboarding_sessions WHERE organization_id = p_org_id;
  IF v_session_id IS NOT NULL THEN RETURN v_session_id; END IF;
  INSERT INTO onboarding_sessions (organization_id, status, current_step) VALUES (p_org_id, 'in_progress', 1) RETURNING id INTO v_session_id;
  INSERT INTO onboarding_steps (session_id, step_number, step_name, status) VALUES
    (v_session_id, 1, 'Company Profile', 'in_progress'),
    (v_session_id, 2, 'Data Sources', 'pending'),
    (v_session_id, 3, 'Data Analysis', 'pending'),
    (v_session_id, 4, 'Dashboard Build', 'pending'),
    (v_session_id, 5, 'Go Live', 'pending');
  INSERT INTO onboarding_connectors (session_id, provider) VALUES
    (v_session_id, 'hubspot'), (v_session_id, 'salesforce'),
    (v_session_id, 'google-analytics'), (v_session_id, 'slack');
  RETURN v_session_id;
END; $$;

CREATE OR REPLACE FUNCTION trg_onboarding_step1_complete() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.current_step = 1 AND NEW.company_name IS NOT NULL AND NEW.primary_use_case IS NOT NULL
     AND (OLD.company_name IS NULL OR OLD.primary_use_case IS NULL) THEN
    UPDATE onboarding_steps SET status = 'completed', completed_at = now() WHERE session_id = NEW.id AND step_number = 1;
    UPDATE onboarding_steps SET status = 'in_progress', started_at = now() WHERE session_id = NEW.id AND step_number = 2;
    NEW.current_step := 2;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS onboarding_step1_complete ON onboarding_sessions;
CREATE TRIGGER onboarding_step1_complete BEFORE UPDATE ON onboarding_sessions FOR EACH ROW EXECUTE FUNCTION trg_onboarding_step1_complete();

CREATE OR REPLACE FUNCTION trg_onboarding_connectors_check() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session_id UUID; v_current_step INTEGER; v_pending_count INTEGER; v_connected_count INTEGER;
BEGIN
  v_session_id := NEW.session_id;
  SELECT current_step INTO v_current_step FROM onboarding_sessions WHERE id = v_session_id;
  IF v_current_step != 2 THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_pending_count FROM onboarding_connectors WHERE session_id = v_session_id AND status IN ('available', 'connecting');
  SELECT COUNT(*) INTO v_connected_count FROM onboarding_connectors WHERE session_id = v_session_id AND status = 'connected';
  IF v_pending_count = 0 AND v_connected_count >= 1 THEN
    UPDATE onboarding_steps SET status = 'completed', completed_at = now(), verdict = 'good', verdict_message = v_connected_count || ' data source(s) connected successfully' WHERE session_id = v_session_id AND step_number = 2;
    UPDATE onboarding_steps SET status = 'in_progress', started_at = now() WHERE session_id = v_session_id AND step_number = 3;
    UPDATE onboarding_sessions SET current_step = 3 WHERE id = v_session_id;
  ELSIF v_pending_count = 0 AND v_connected_count = 0 THEN
    UPDATE onboarding_steps SET status = 'completed', completed_at = now(), verdict = 'neutral', verdict_message = 'No data sources connected — using sample data' WHERE session_id = v_session_id AND step_number = 2;
    UPDATE onboarding_steps SET status = 'in_progress', started_at = now() WHERE session_id = v_session_id AND step_number = 3;
    UPDATE onboarding_sessions SET current_step = 3 WHERE id = v_session_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS onboarding_connectors_check ON onboarding_connectors;
CREATE TRIGGER onboarding_connectors_check AFTER UPDATE ON onboarding_connectors FOR EACH ROW EXECUTE FUNCTION trg_onboarding_connectors_check();

CREATE OR REPLACE FUNCTION advance_onboarding_step(p_session_id UUID, p_from_step INTEGER, p_verdict TEXT DEFAULT 'good', p_verdict_message TEXT DEFAULT NULL, p_recommendation TEXT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_current_step INTEGER; v_next_step INTEGER;
BEGIN
  SELECT current_step INTO v_current_step FROM onboarding_sessions WHERE id = p_session_id;
  IF v_current_step IS NULL OR v_current_step != p_from_step THEN RETURN FALSE; END IF;
  v_next_step := p_from_step + 1;
  UPDATE onboarding_steps SET status = 'completed', completed_at = now(), verdict = p_verdict, verdict_message = p_verdict_message, recommendation = p_recommendation WHERE session_id = p_session_id AND step_number = p_from_step;
  IF v_next_step <= 5 THEN
    UPDATE onboarding_steps SET status = 'in_progress', started_at = now() WHERE session_id = p_session_id AND step_number = v_next_step;
    UPDATE onboarding_sessions SET current_step = v_next_step WHERE id = p_session_id;
  END IF;
  IF p_from_step = 5 THEN
    UPDATE onboarding_steps SET status = 'completed', completed_at = now(), verdict = p_verdict, verdict_message = COALESCE(p_verdict_message, 'Onboarding complete') WHERE session_id = p_session_id AND step_number = 5;
    UPDATE onboarding_sessions SET status = 'completed', completed_at = now(), overall_verdict = p_verdict, verdict_summary = COALESCE(p_verdict_message, 'Your workspace is ready') WHERE id = p_session_id;
    UPDATE org_feature_flags SET stage = 'active', updated_at = now() WHERE organization_id = (SELECT organization_id FROM onboarding_sessions WHERE id = p_session_id);
  END IF;
  RETURN TRUE;
END; $$;

CREATE OR REPLACE FUNCTION complete_onboarding(p_session_id UUID) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN RETURN advance_onboarding_step(p_session_id, 5, 'good', 'All systems operational — your workspace is live'); END; $$;

-- ============================================================================
-- 10. Onboarding step 3 auto-advance (20260405000002)
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_onboarding_step3_auto_advance() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.current_step = 3 AND OLD.current_step = 2 THEN
    UPDATE onboarding_steps SET status = 'completed', completed_at = now(), started_at = COALESCE(started_at, now()), verdict = 'good', verdict_message = 'Data profiling complete — schema and freshness validated', recommendation = 'Ready to generate dashboards from connected sources' WHERE session_id = NEW.id AND step_number = 3;
    UPDATE onboarding_steps SET status = 'in_progress', started_at = now() WHERE session_id = NEW.id AND step_number = 4;
    NEW.current_step := 4;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS onboarding_step3_auto_advance ON onboarding_sessions;
CREATE TRIGGER onboarding_step3_auto_advance BEFORE UPDATE ON onboarding_sessions FOR EACH ROW EXECUTE FUNCTION trg_onboarding_step3_auto_advance();

-- ============================================================================
-- 11. Skill registry versioning (20260405000003)
-- ============================================================================
ALTER TABLE skill_registry
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION increment_skill_version() RETURNS TRIGGER AS $$
BEGIN NEW.version := OLD.version + 1; NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_skill_version ON skill_registry;
CREATE TRIGGER trg_skill_version BEFORE UPDATE ON skill_registry FOR EACH ROW EXECUTE FUNCTION increment_skill_version();
CREATE INDEX IF NOT EXISTS idx_skill_registry_version ON skill_registry (id, version);

-- ============================================================================
-- 12. governance_versions (20260406000000)
-- ============================================================================
CREATE TABLE IF NOT EXISTS governance_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name TEXT NOT NULL, version_label TEXT NOT NULL,
  sha256_hash TEXT NOT NULL, effective_date TIMESTAMPTZ NOT NULL,
  supersedes UUID REFERENCES governance_versions(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), notes TEXT
);
ALTER TABLE governance_versions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "governance_versions_read" ON governance_versions FOR SELECT USING (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "governance_versions_insert" ON governance_versions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_governance_versions_doc ON governance_versions (document_name, effective_date DESC);

-- ============================================================================
-- 13. compliance_audit_log (20260406000001)
-- ============================================================================
CREATE TABLE IF NOT EXISTS compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL, user_id UUID NOT NULL REFERENCES auth.users(id),
  team_id UUID REFERENCES teams(id), job_id UUID REFERENCES jobs(id),
  artifact_type TEXT NOT NULL, artifact_hash TEXT NOT NULL,
  skill_ids TEXT[] NOT NULL DEFAULT '{}', skill_versions INTEGER[] DEFAULT '{}',
  governance_version_id UUID REFERENCES governance_versions(id),
  department TEXT, metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE compliance_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "audit_log_read" ON compliance_audit_log FOR SELECT USING (org_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "audit_log_insert" ON compliance_audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_audit_log_org ON compliance_audit_log (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_job ON compliance_audit_log (job_id);

-- ============================================================================
-- 14. approval_signatures (20260406000002)
-- ============================================================================
CREATE TABLE IF NOT EXISTS approval_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID NOT NULL REFERENCES compliance_audit_log(id),
  approved_by UUID NOT NULL REFERENCES auth.users(id),
  approval_role TEXT NOT NULL, artifact_hash_at_approval TEXT NOT NULL,
  signature_method TEXT NOT NULL DEFAULT 'platform_auth',
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(), notes TEXT
);
ALTER TABLE approval_signatures ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "signatures_read" ON approval_signatures FOR SELECT USING (audit_log_id IN (SELECT id FROM compliance_audit_log WHERE org_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "signatures_insert" ON approval_signatures FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_signatures_audit ON approval_signatures (audit_log_id);
CREATE INDEX IF NOT EXISTS idx_signatures_user ON approval_signatures (approved_by, approved_at DESC);

-- ============================================================================
-- 15. org_auto_promotion (20260406000011)
-- ============================================================================
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS promoted_at timestamptz;

CREATE OR REPLACE FUNCTION check_org_promotion() RETURNS TRIGGER AS $$
DECLARE v_member_count integer;
BEGIN
  SELECT COUNT(*) INTO v_member_count FROM org_members WHERE org_id = NEW.org_id;
  IF v_member_count >= 5 THEN
    UPDATE organizations SET account_type = 'enterprise', tier_slug = 'enterprise', promoted_at = now() WHERE id = NEW.org_id AND account_type != 'enterprise';
  ELSIF v_member_count >= 2 THEN
    UPDATE organizations SET account_type = 'team' WHERE id = NEW.org_id AND account_type = 'individual';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS org_promotion_trigger ON org_members;
CREATE TRIGGER org_promotion_trigger AFTER INSERT ON org_members FOR EACH ROW EXECUTE FUNCTION check_org_promotion();

-- ============================================================================
-- 16. Executive team seeding (20260406000012)
-- ============================================================================
INSERT INTO teams (id, name, org_id, slug)
SELECT gen_random_uuid(), 'Executive', id, 'executive'
FROM organizations
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 17. skill_recommendations + skill_approvals (20260406000014)
-- ============================================================================
CREATE TABLE IF NOT EXISTS skill_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL, team_id uuid NOT NULL,
  skill_id uuid REFERENCES skill_registry(id),
  recommended_by text NOT NULL DEFAULT 'vibe-ai',
  title text NOT NULL, rationale text NOT NULL, proposed_action text NOT NULL,
  estimated_impact text, context_data jsonb,
  status text NOT NULL DEFAULT 'pending', priority text NOT NULL DEFAULT 'medium',
  created_at timestamptz DEFAULT now(), expires_at timestamptz DEFAULT now() + interval '7 days'
);

CREATE TABLE IF NOT EXISTS skill_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL REFERENCES skill_recommendations(id),
  org_id uuid NOT NULL, team_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  decided_by uuid NOT NULL REFERENCES auth.users(id),
  decision_note text, execution_id uuid REFERENCES autonomous_executions(id),
  decided_at timestamptz DEFAULT now()
);

ALTER TABLE skill_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_approvals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "team_members_read_recommendations" ON skill_recommendations FOR SELECT USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "team_members_insert_recommendations" ON skill_recommendations FOR INSERT WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "team_members_update_recommendations" ON skill_recommendations FOR UPDATE USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "team_members_read_approvals" ON skill_approvals FOR SELECT USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "team_members_insert_approvals" ON skill_approvals FOR INSERT WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 18. connection_id on team_integrations (20260407000001)
-- ============================================================================
ALTER TABLE team_integrations ADD COLUMN IF NOT EXISTS connection_id TEXT;
CREATE INDEX IF NOT EXISTS idx_team_integrations_connection_id ON team_integrations(connection_id);

-- ============================================================================
-- Final: reload PostgREST schema cache
-- ============================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
