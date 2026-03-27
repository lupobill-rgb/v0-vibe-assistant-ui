-- Migration: Auto-join org on signup trigger + seed public email domains
-- Fires AFTER INSERT on auth.users — assigns user to org based on email domain

-- ============================================================================
-- 1. Add missing columns to organizations and teams (idempotent)
-- ============================================================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tier_slug TEXT DEFAULT 'starter';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS function TEXT;

-- ============================================================================
-- 2. Seed additional public email domains
-- ============================================================================
INSERT INTO public_email_domains (domain) VALUES
  ('gmail.com'),('yahoo.com'),('outlook.com'),('hotmail.com'),('icloud.com'),
  ('aol.com'),('protonmail.com'),('yahoo.co.uk'),('live.com'),('msn.com'),
  ('me.com'),('mail.com'),('zoho.com'),('yandex.com'),('gmx.com'),
  ('tutanota.com'),('fastmail.com'),('hey.com'),('pm.me'),('proton.me'),
  ('outlook.co.uk'),('yahoo.co.in'),('yahoo.co.jp'),('googlemail.com'),
  ('ymail.com'),('rocketmail.com'),('inbox.com'),('mail.ru'),('qq.com'),
  ('163.com'),('126.com'),('naver.com'),('daum.net'),('hanmail.net'),
  ('rediffmail.com'),('libero.it'),('virgilio.it'),('laposte.net'),
  ('orange.fr'),('web.de'),('gmx.de'),('t-online.de'),('wp.pl'),('o2.pl'),
  ('seznam.cz'),('att.net'),('sbcglobal.net'),('bellsouth.net'),
  ('charter.net'),('cox.net'),('earthlink.net'),('juno.com'),
  ('comcast.net'),('verizon.net'),('optonline.net')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. Helper: slugify(text)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.slugify(input TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT trim(both '-' FROM
    regexp_replace(lower(input), '[^a-z0-9]+', '-', 'g')
  );
$$;

-- ============================================================================
-- 4. Trigger function: handle_new_user_org_assignment()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_org_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _domain      TEXT;
  _is_public   BOOLEAN;
  _org_id      UUID;
  _team_id     UUID;
  _short_id    TEXT;
  _domain_name TEXT;
BEGIN
  -- a) Extract domain from email
  _domain := lower(split_part(NEW.email, '@', 2));

  -- b) Check if public domain
  SELECT EXISTS(
    SELECT 1 FROM public_email_domains WHERE domain = _domain
  ) INTO _is_public;

  IF _is_public THEN
    -- c) PUBLIC DOMAIN: create personal org
    INSERT INTO organizations (name, slug, tier_slug, subscription_status)
    VALUES (NEW.email, public.slugify(NEW.email), 'starter', 'active')
    RETURNING id INTO _org_id;

    -- Add user as owner
    INSERT INTO org_members (user_id, org_id, role)
    VALUES (NEW.id, _org_id, 'owner')
    ON CONFLICT DO NOTHING;

    -- Create default team with short random suffix
    _short_id := substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 8);

    INSERT INTO teams (name, slug, org_id, function)
    VALUES ('My Team', 'my-team-' || _short_id, _org_id, 'admin')
    RETURNING id INTO _team_id;

    -- Add user to default team
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (_team_id, NEW.id, 'IC')
    ON CONFLICT DO NOTHING;

  ELSE
    -- d) COMPANY DOMAIN: check for existing org
    SELECT id INTO _org_id
    FROM organizations
    WHERE email_domain = _domain
    LIMIT 1;

    IF _org_id IS NOT NULL THEN
      -- Org exists — add as member
      INSERT INTO org_members (user_id, org_id, role)
      VALUES (NEW.id, _org_id, 'member')
      ON CONFLICT DO NOTHING;
    ELSE
      -- No org — create one for this domain
      _domain_name := split_part(_domain, '.', 1);

      INSERT INTO organizations (name, slug, email_domain, tier_slug, subscription_status)
      VALUES (_domain_name, public.slugify(_domain), _domain, 'starter', 'active')
      RETURNING id INTO _org_id;

      INSERT INTO org_members (user_id, org_id, role)
      VALUES (NEW.id, _org_id, 'owner')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 5. Attach trigger to auth.users
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_org_assignment();
