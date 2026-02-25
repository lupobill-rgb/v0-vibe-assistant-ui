-- Migration: org -> team -> project -> job hierarchy
-- Replaces flat tenant_id model with proper organizational hierarchy

-- ============================================================================
-- Organizations
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Teams (belong to organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_teams_by_org ON teams(org_id);

-- ============================================================================
-- Team members
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_by_user ON team_members(user_id);

-- ============================================================================
-- Projects (belong to teams)
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  repository_url TEXT,
  local_path TEXT NOT NULL,
  last_synced TIMESTAMPTZ,
  published_url TEXT,
  published_at TIMESTAMPTZ,
  published_job_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_by_team ON projects(team_id);

-- ============================================================================
-- Jobs (belong to projects)
-- ============================================================================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_prompt TEXT NOT NULL,
  repository_url TEXT,
  source_branch TEXT NOT NULL DEFAULT 'main',
  destination_branch TEXT NOT NULL,
  execution_state TEXT NOT NULL DEFAULT 'queued'
    CHECK (execution_state IN (
      'queued', 'cloning', 'building_context', 'calling_llm',
      'applying_diff', 'running_preflight', 'creating_pr',
      'completed', 'failed'
    )),
  pull_request_link TEXT,
  preview_url TEXT,
  iteration_count INTEGER NOT NULL DEFAULT 0,
  llm_model TEXT DEFAULT 'claude',
  llm_prompt_tokens INTEGER,
  llm_completion_tokens INTEGER,
  llm_total_tokens INTEGER,
  preflight_seconds DOUBLE PRECISION,
  total_job_seconds DOUBLE PRECISION,
  files_changed_count INTEGER,
  last_diff TEXT,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_modified TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_by_project ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_by_state ON jobs(execution_state);
CREATE INDEX IF NOT EXISTS idx_jobs_initiated ON jobs(initiated_at DESC);

-- ============================================================================
-- Job events (belong to jobs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_events (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'error', 'success', 'warning')),
  event_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_events_by_job ON job_events(job_id, event_time);

-- ============================================================================
-- Supabase connections (per-project external Supabase instances)
-- ============================================================================
CREATE TABLE IF NOT EXISTS supabase_connections (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  anon_key TEXT NOT NULL,
  service_key_enc TEXT NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Tenant budgets (keyed by org)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_budgets (
  org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  limit_usd DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE supabase_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_budgets ENABLE ROW LEVEL SECURITY;

-- Service-role bypass: the API server uses the service key which bypasses RLS.
-- Application-level authorization is enforced in the API layer.
-- When adding anon/authenticated policies, add them here.
