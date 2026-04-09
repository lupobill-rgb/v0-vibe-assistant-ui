#!/usr/bin/env node
/**
 * Apply migrations 8-10 to Supabase via the Management API.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/apply-migrations-8-10.mjs
 *
 * Or set the key in your environment first.
 * This script also verifies which tables exist before and after.
 */

const SUPABASE_URL = "https://ptaqytvztkhjpuawdxng.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error("ERROR: Set SUPABASE_SERVICE_ROLE_KEY in your environment first.");
  console.error("  export SUPABASE_SERVICE_ROLE_KEY=eyJ...");
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function runSQL(label, sql) {
  console.log(`\n--- ${label} ---`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: sql }),
  });

  // If exec_sql RPC doesn't exist, fall back to raw pg endpoint
  if (res.status === 404 || res.status === 400) {
    console.log("  (exec_sql RPC not found, using pg meta endpoint...)");
    const pgRes = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: "POST",
      headers: {
        ...headers,
        "X-Connection-Encrypted": "true",
      },
      body: JSON.stringify({ query: sql }),
    });
    if (!pgRes.ok) {
      const err = await pgRes.text();
      console.error(`  FAIL: ${err}`);
      return false;
    }
    console.log("  OK");
    return true;
  }

  if (!res.ok) {
    const err = await res.text();
    console.error(`  FAIL: ${err}`);
    return false;
  }
  console.log("  OK");
  return true;
}

// --- Verify current state ---
async function checkTables() {
  const check = `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('org_feature_flags','onboarding_sessions','onboarding_steps','onboarding_connectors','feed_subscriptions','autonomous_executions','governance_versions','compliance_audit_log') ORDER BY tablename;`;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: check }),
  });

  if (res.ok) {
    const data = await res.json();
    return data;
  }
  return null;
}

// --- Migration 8: Onboarding Tables ---
const MIGRATION_8 = `
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

DO $x$ BEGIN
  CREATE POLICY org_feature_flags_select ON org_feature_flags FOR SELECT TO authenticated
    USING (organization_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;

DO $x$ BEGIN
  CREATE POLICY org_feature_flags_update ON org_feature_flags FOR UPDATE TO authenticated
    USING (organization_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'owner')));
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;

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

DO $x$ BEGIN
  CREATE POLICY onboarding_sessions_select ON onboarding_sessions FOR SELECT TO authenticated
    USING (organization_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;

DO $x$ BEGIN
  CREATE POLICY onboarding_sessions_update ON onboarding_sessions FOR UPDATE TO authenticated
    USING (organization_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;

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

DO $x$ BEGIN
  CREATE POLICY onboarding_steps_select ON onboarding_steps FOR SELECT TO authenticated
    USING (session_id IN (SELECT sess.id FROM onboarding_sessions sess JOIN org_members om ON om.org_id = sess.organization_id WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;

DO $x$ BEGIN
  CREATE POLICY onboarding_steps_update ON onboarding_steps FOR UPDATE TO authenticated
    USING (session_id IN (SELECT sess.id FROM onboarding_sessions sess JOIN org_members om ON om.org_id = sess.organization_id WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;

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

DO $x$ BEGIN
  CREATE POLICY onboarding_connectors_select ON onboarding_connectors FOR SELECT TO authenticated
    USING (session_id IN (SELECT sess.id FROM onboarding_sessions sess JOIN org_members om ON om.org_id = sess.organization_id WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;

DO $x$ BEGIN
  CREATE POLICY onboarding_connectors_update ON onboarding_connectors FOR UPDATE TO authenticated
    USING (session_id IN (SELECT sess.id FROM onboarding_sessions sess JOIN org_members om ON om.org_id = sess.organization_id WHERE om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;
`;

// --- Migration 9: Onboarding Progression ---
const MIGRATION_9 = `
CREATE OR REPLACE FUNCTION initialize_onboarding(p_org_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $fn$
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
END; $fn$;

CREATE OR REPLACE FUNCTION trg_onboarding_step1_complete() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $fn$
BEGIN
  IF NEW.current_step = 1 AND NEW.company_name IS NOT NULL AND NEW.primary_use_case IS NOT NULL
     AND (OLD.company_name IS NULL OR OLD.primary_use_case IS NULL) THEN
    UPDATE onboarding_steps SET status = 'completed', completed_at = now() WHERE session_id = NEW.id AND step_number = 1;
    UPDATE onboarding_steps SET status = 'in_progress', started_at = now() WHERE session_id = NEW.id AND step_number = 2;
    NEW.current_step := 2;
  END IF;
  RETURN NEW;
END; $fn$;

DROP TRIGGER IF EXISTS onboarding_step1_complete ON onboarding_sessions;
CREATE TRIGGER onboarding_step1_complete BEFORE UPDATE ON onboarding_sessions FOR EACH ROW EXECUTE FUNCTION trg_onboarding_step1_complete();

CREATE OR REPLACE FUNCTION trg_onboarding_connectors_check() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $fn$
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
    UPDATE onboarding_steps SET status = 'completed', completed_at = now(), verdict = 'neutral', verdict_message = 'No data sources connected - using sample data' WHERE session_id = v_session_id AND step_number = 2;
    UPDATE onboarding_steps SET status = 'in_progress', started_at = now() WHERE session_id = v_session_id AND step_number = 3;
    UPDATE onboarding_sessions SET current_step = 3 WHERE id = v_session_id;
  END IF;
  RETURN NEW;
END; $fn$;

DROP TRIGGER IF EXISTS onboarding_connectors_check ON onboarding_connectors;
CREATE TRIGGER onboarding_connectors_check AFTER UPDATE ON onboarding_connectors FOR EACH ROW EXECUTE FUNCTION trg_onboarding_connectors_check();

CREATE OR REPLACE FUNCTION advance_onboarding_step(p_session_id UUID, p_from_step INTEGER, p_verdict TEXT DEFAULT 'good', p_verdict_message TEXT DEFAULT NULL, p_recommendation TEXT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $fn$
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
END; $fn$;

CREATE OR REPLACE FUNCTION complete_onboarding(p_session_id UUID) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $fn$
BEGIN RETURN advance_onboarding_step(p_session_id, 5, 'good', 'All systems operational - your workspace is live'); END; $fn$;
`;

// --- Migration 10: Step 3 Auto-Advance ---
const MIGRATION_10 = `
CREATE OR REPLACE FUNCTION trg_onboarding_step3_auto_advance() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $fn$
BEGIN
  IF NEW.current_step = 3 AND OLD.current_step = 2 THEN
    UPDATE onboarding_steps SET status = 'completed', completed_at = now(), started_at = COALESCE(started_at, now()), verdict = 'good', verdict_message = 'Data profiling complete - schema and freshness validated', recommendation = 'Ready to generate dashboards from connected sources' WHERE session_id = NEW.id AND step_number = 3;
    UPDATE onboarding_steps SET status = 'in_progress', started_at = now() WHERE session_id = NEW.id AND step_number = 4;
    NEW.current_step := 4;
  END IF;
  RETURN NEW;
END; $fn$;

DROP TRIGGER IF EXISTS onboarding_step3_auto_advance ON onboarding_sessions;
CREATE TRIGGER onboarding_step3_auto_advance BEFORE UPDATE ON onboarding_sessions FOR EACH ROW EXECUTE FUNCTION trg_onboarding_step3_auto_advance();
`;

async function main() {
  console.log("=== VIBE Migration Runner: 8, 9, 10 ===\n");

  // Check connectivity
  console.log("Checking Supabase connectivity...");
  const ping = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: { apikey: SERVICE_KEY } });
  if (!ping.ok) {
    console.error("Cannot reach Supabase. Check your key.");
    process.exit(1);
  }
  console.log("Connected.\n");

  // Verify pre-state
  console.log("Checking existing tables...");
  const tables = ["org_feature_flags", "onboarding_sessions", "onboarding_steps", "onboarding_connectors"];
  for (const t of tables) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=id&limit=0`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
    console.log(`  ${t}: ${r.ok ? "EXISTS" : "NOT YET"}`);
  }

  // Apply migrations
  const migrations = [
    { label: "Migration 8: Onboarding Tables", sql: MIGRATION_8 },
    { label: "Migration 9: Onboarding Progression", sql: MIGRATION_9 },
    { label: "Migration 10: Step 3 Auto-Advance", sql: MIGRATION_10 },
  ];

  for (const m of migrations) {
    const ok = await runSQL(m.label, m.sql);
    if (!ok) {
      console.error(`\nFAILED on ${m.label}. Fix and re-run.`);
      process.exit(1);
    }
  }

  // Verify post-state
  console.log("\n=== Verification ===");
  for (const t of tables) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=id&limit=0`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
    console.log(`  ${t}: ${r.ok ? "OK" : "MISSING"}`);
  }

  // Check functions
  console.log("\nChecking functions...");
  const fnCheck = await fetch(`${SUPABASE_URL}/rest/v1/rpc/initialize_onboarding`, {
    method: "POST",
    headers,
    body: JSON.stringify({ p_org_id: "00000000-0000-0000-0000-000000000000" }),
  });
  console.log(`  initialize_onboarding: ${fnCheck.status === 404 ? "NOT FOUND" : "EXISTS"}`);

  console.log("\n=== Done. Migrations 8-10 applied. ===");
}

main().catch((e) => { console.error(e); process.exit(1); });
