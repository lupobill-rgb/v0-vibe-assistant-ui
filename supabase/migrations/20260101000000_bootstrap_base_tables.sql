-- Bootstrap: create base tables that were originally created outside migrations.
-- All statements are IF NOT EXISTS / DO $$ so this is safe on existing databases.

-- ==========================================================================
-- 1. Types
-- ==========================================================================
DO $$ BEGIN
  CREATE TYPE team_role AS ENUM ('IC', 'Lead', 'Manager', 'Director', 'Executive', 'Admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================================================
-- 2. organizations
-- ==========================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text NOT NULL,
  slug                    text NOT NULL UNIQUE,
  created_at              timestamptz NOT NULL DEFAULT now(),
  stripe_customer_id      text,
  tier_slug               text DEFAULT 'starter',
  subscription_status     text DEFAULT 'active',
  stripe_subscription_id  text,
  current_period_end      timestamptz,
  credits_used_this_period integer DEFAULT 0,
  email_domain            text UNIQUE,
  account_type            text NOT NULL DEFAULT 'individual',
  promoted_at             timestamptz
);

-- ==========================================================================
-- 3. teams
-- ==========================================================================
CREATE TABLE IF NOT EXISTS teams (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                      text NOT NULL,
  slug                      text NOT NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  function                  text CHECK (function IS NULL OR function IN (
    'sales','marketing','finance','hr','legal','engineering',
    'operations','product','support','design','data','executive','admin'
  )),
  custom_domain             text UNIQUE,
  domain_verified           boolean DEFAULT false,
  domain_verification_token text,
  UNIQUE (org_id, slug)
);

-- ==========================================================================
-- 4. team_members
-- ==========================================================================
CREATE TABLE IF NOT EXISTS team_members (
  team_id   uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL,
  role      team_role NOT NULL DEFAULT 'IC',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- ==========================================================================
-- 5. org_members
-- ==========================================================================
CREATE TABLE IF NOT EXISTS org_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL,
  org_id    uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin','owner')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id)
);

-- ==========================================================================
-- 6. projects  (published_job_id FK added AFTER jobs table exists)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS projects (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id                   uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name                      text NOT NULL,
  repository_url            text,
  local_path                text NOT NULL,
  last_synced               timestamptz,
  published_url             text,
  published_at              timestamptz,
  published_job_id          uuid,
  created_at                timestamptz NOT NULL DEFAULT now(),
  is_private                boolean DEFAULT false,
  upload_id                 uuid,
  custom_domain             text UNIQUE,
  domain_verified           boolean DEFAULT false,
  domain_verification_token text
);

-- ==========================================================================
-- 7. conversations
-- ==========================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title      text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==========================================================================
-- 8. jobs
-- ==========================================================================
CREATE TABLE IF NOT EXISTS jobs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_prompt          text NOT NULL,
  repository_url       text,
  source_branch        text NOT NULL DEFAULT 'main',
  destination_branch   text NOT NULL,
  execution_state      text NOT NULL DEFAULT 'queued',
  pull_request_link    text,
  preview_url          text,
  iteration_count      integer NOT NULL DEFAULT 0,
  llm_model            text DEFAULT 'claude',
  llm_prompt_tokens    integer,
  llm_completion_tokens integer,
  llm_total_tokens     integer,
  preflight_seconds    double precision,
  total_job_seconds    double precision,
  files_changed_count  integer,
  last_diff            text,
  initiated_at         timestamptz NOT NULL DEFAULT now(),
  last_modified        timestamptz NOT NULL DEFAULT now(),
  agent_results        jsonb,
  conversation_id      uuid REFERENCES conversations(id) ON DELETE SET NULL,
  previous_diff        text
);

-- ==========================================================================
-- 9. job_events
-- ==========================================================================
CREATE TABLE IF NOT EXISTS job_events (
  id            bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  job_id        uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_message text NOT NULL,
  severity      text NOT NULL DEFAULT 'info',
  event_time    timestamptz NOT NULL DEFAULT now()
);

-- ==========================================================================
-- 10. Deferred FKs (circular: projects ↔ jobs)
-- ==========================================================================
DO $$ BEGIN
  ALTER TABLE projects
    ADD CONSTRAINT fk_projects_published_job
    FOREIGN KEY (published_job_id) REFERENCES jobs(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================================================
-- 11. Helper function used by RLS policies
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.user_team_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT team_id FROM team_members WHERE user_id = auth.uid();
$$;

-- ==========================================================================
-- 12. RLS + base policies for jobs
-- ==========================================================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY jobs_select ON jobs FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY jobs_insert ON jobs FOR INSERT
    WITH CHECK (project_id IN (
      SELECT id FROM projects WHERE team_id IN (SELECT user_team_ids())
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY jobs_update ON jobs FOR UPDATE
    USING (project_id IN (
      SELECT id FROM projects WHERE team_id IN (SELECT user_team_ids())
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY jobs_delete ON jobs FOR DELETE
    USING (project_id IN (
      SELECT id FROM projects WHERE team_id IN (SELECT user_team_ids())
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================================================
-- 13. Indexes
-- ==========================================================================
CREATE INDEX IF NOT EXISTS idx_jobs_by_project ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_by_conversation ON jobs(conversation_id);
