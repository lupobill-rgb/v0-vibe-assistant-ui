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
    USING (session_id IN (SELECT sess.id FROM onboarding_sessions sess JOIN org_members om ON om.org_id = sess.organization_id WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY onboarding_steps_update ON onboarding_steps FOR UPDATE TO authenticated
    USING (session_id IN (SELECT sess.id FROM onboarding_sessions sess JOIN org_members om ON om.org_id = sess.organization_id WHERE om.user_id = auth.uid()));
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
    USING (session_id IN (SELECT sess.id FROM onboarding_sessions sess JOIN org_members om ON om.org_id = sess.organization_id WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY onboarding_connectors_update ON onboarding_connectors FOR UPDATE TO authenticated
    USING (session_id IN (SELECT sess.id FROM onboarding_sessions sess JOIN org_members om ON om.org_id = sess.organization_id WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
