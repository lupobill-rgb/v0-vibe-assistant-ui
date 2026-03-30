-- GTM Deals & Leads tables with VIBE org-scoped RLS
-- Idempotent: uses IF NOT EXISTS throughout

-- ============================================================
-- 1. gtm_deals
-- ============================================================
CREATE TABLE IF NOT EXISTS gtm_deals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        REFERENCES organizations(id) ON DELETE CASCADE,
  team_id         uuid        REFERENCES teams(id),
  name            text        NOT NULL,
  company         text,
  contact_name    text,
  contact_email   text,
  stage           text        DEFAULT 'prospect',
  value           numeric(12,2),
  currency        text        DEFAULT 'USD',
  probability     integer     DEFAULT 0,
  expected_close_date date,
  actual_close_date   date,
  source          text,
  tags            text[],
  notes           text,
  created_by      uuid        REFERENCES auth.users(id),
  assigned_to     uuid        REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE gtm_deals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_gtm_deals_org_stage
  ON gtm_deals (organization_id, stage);

-- ============================================================
-- 2. gtm_leads
-- ============================================================
CREATE TABLE IF NOT EXISTS gtm_leads (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        REFERENCES organizations(id) ON DELETE CASCADE,
  team_id         uuid        REFERENCES teams(id),
  email           text,
  first_name      text,
  last_name       text,
  company         text,
  company_size    text,
  industry        text,
  job_title       text,
  status          text        DEFAULT 'new',
  score           integer,
  source          text,
  tags            text[],
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  contacted_at    timestamptz,
  qualified_at    timestamptz,
  converted_at    timestamptz,
  lost_at         timestamptz,
  next_follow_up_at timestamptz,
  assigned_to     uuid        REFERENCES auth.users(id),
  notes           text,
  created_by      uuid        REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE gtm_leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_gtm_leads_org_status
  ON gtm_leads (organization_id, status);

-- ============================================================
-- 3. RLS policies — org members only (SELECT, INSERT, UPDATE)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gtm_deals' AND policyname = 'gtm_deals_org_member'
  ) THEN
    CREATE POLICY gtm_deals_org_member ON gtm_deals
      FOR ALL
      USING (
        organization_id IN (
          SELECT o.id FROM organizations o
<<<<<<< HEAD
          JOIN teams t ON t.organization_id = o.id
=======
          JOIN teams t ON t.org_id = o.id
>>>>>>> origin/claude/port-revos-deals-leads-VMJaw
          JOIN team_members tm ON tm.team_id = t.id
          WHERE tm.user_id = auth.uid()
        )
      )
      WITH CHECK (
        organization_id IN (
          SELECT o.id FROM organizations o
<<<<<<< HEAD
          JOIN teams t ON t.organization_id = o.id
=======
          JOIN teams t ON t.org_id = o.id
>>>>>>> origin/claude/port-revos-deals-leads-VMJaw
          JOIN team_members tm ON tm.team_id = t.id
          WHERE tm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gtm_leads' AND policyname = 'gtm_leads_org_member'
  ) THEN
    CREATE POLICY gtm_leads_org_member ON gtm_leads
      FOR ALL
      USING (
        organization_id IN (
          SELECT o.id FROM organizations o
<<<<<<< HEAD
          JOIN teams t ON t.organization_id = o.id
=======
          JOIN teams t ON t.org_id = o.id
>>>>>>> origin/claude/port-revos-deals-leads-VMJaw
          JOIN team_members tm ON tm.team_id = t.id
          WHERE tm.user_id = auth.uid()
        )
      )
      WITH CHECK (
        organization_id IN (
          SELECT o.id FROM organizations o
<<<<<<< HEAD
          JOIN teams t ON t.organization_id = o.id
=======
          JOIN teams t ON t.org_id = o.id
>>>>>>> origin/claude/port-revos-deals-leads-VMJaw
          JOIN team_members tm ON tm.team_id = t.id
          WHERE tm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- 4. updated_at triggers (reuse existing set_updated_at fn)
-- ============================================================
DROP TRIGGER IF EXISTS trg_gtm_deals_updated_at ON gtm_deals;
CREATE TRIGGER trg_gtm_deals_updated_at
  BEFORE UPDATE ON gtm_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_gtm_leads_updated_at ON gtm_leads;
CREATE TRIGGER trg_gtm_leads_updated_at
  BEFORE UPDATE ON gtm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
