-- Migration: Multi-tenant onboarding — org_members, email_domain, public_email_domains
-- Idempotent: all operations use IF NOT EXISTS / ON CONFLICT DO NOTHING

-- ============================================================================
-- 1. Add email_domain column to organizations
-- ============================================================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email_domain TEXT UNIQUE;

-- ============================================================================
-- 2. Create org_members table (org-level membership, separate from teams)
-- ============================================================================
CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_by_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_by_org ON org_members(org_id);

-- RLS
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Users can read their own membership rows
CREATE POLICY org_members_select_own ON org_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins/owners can read all rows for their org
CREATE POLICY org_members_select_admin ON org_members
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'owner')
    )
  );

-- Admins/owners can insert members into their org
CREATE POLICY org_members_insert_admin ON org_members
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- 3. Create public_email_domains table and seed
-- ============================================================================
CREATE TABLE IF NOT EXISTS public_email_domains (
  domain TEXT PRIMARY KEY
);

ALTER TABLE public_email_domains ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read public domains
CREATE POLICY public_email_domains_select ON public_email_domains
  FOR SELECT TO authenticated
  USING (true);

INSERT INTO public_email_domains (domain) VALUES
  ('gmail.com'),
  ('yahoo.com'),
  ('outlook.com'),
  ('hotmail.com'),
  ('icloud.com'),
  ('aol.com'),
  ('protonmail.com'),
  ('yahoo.co.uk'),
  ('live.com'),
  ('msn.com'),
  ('me.com'),
  ('mail.com'),
  ('zoho.com'),
  ('yandex.com'),
  ('gmx.com')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. Set UbiGrowth email domain
-- ============================================================================
UPDATE organizations
SET email_domain = 'ubigrowth.com'
WHERE id = '3de82e57-4813-4ad6-83bd-2adb461604f0';

-- ============================================================================
-- 5. Seed org_members: Suzi as member, Bill as owner of UbiGrowth
-- ============================================================================
INSERT INTO org_members (user_id, org_id, role)
VALUES (
  '2f75dd58-d634-4ae7-aa84-58423570e18b',
  '3de82e57-4813-4ad6-83bd-2adb461604f0',
  'member'
)
ON CONFLICT DO NOTHING;

INSERT INTO org_members (user_id, org_id, role)
VALUES (
  'e167c9d1-0680-4cbb-80a0-5c75453584b9',
  '3de82e57-4813-4ad6-83bd-2adb461604f0',
  'owner'
)
ON CONFLICT DO NOTHING;
