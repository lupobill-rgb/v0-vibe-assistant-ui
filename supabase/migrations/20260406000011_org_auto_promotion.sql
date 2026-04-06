-- Auto-promote organizations based on member count
-- individual → team (2+), team → enterprise (5+)

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS promoted_at timestamptz;

-- Promotion function: fires on org_members insert
CREATE OR REPLACE FUNCTION check_org_promotion()
RETURNS TRIGGER AS $$
DECLARE
  v_member_count integer;
BEGIN
  SELECT COUNT(*) INTO v_member_count
  FROM org_members WHERE org_id = NEW.org_id;

  IF v_member_count >= 5 THEN
    UPDATE organizations
    SET account_type = 'enterprise',
        tier_slug = 'enterprise',
        promoted_at = now()
    WHERE id = NEW.org_id
      AND account_type != 'enterprise';
  ELSIF v_member_count >= 2 THEN
    UPDATE organizations
    SET account_type = 'team'
    WHERE id = NEW.org_id
      AND account_type = 'individual';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS org_promotion_trigger ON org_members;
CREATE TRIGGER org_promotion_trigger
  AFTER INSERT ON org_members
  FOR EACH ROW EXECUTE FUNCTION check_org_promotion();
