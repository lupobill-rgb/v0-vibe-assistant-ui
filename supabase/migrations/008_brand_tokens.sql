-- Migration: Add brand_tokens table
-- Layer 2 (4/4): Org identity injected into every prompt

CREATE TABLE public.brand_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  primary_color text,
  secondary_color text,
  accent_color text,
  font_heading text,
  font_body text,
  logo_url text,
  brand_voice text,
  company_name text,
  tagline text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

ALTER TABLE public.brand_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view brand tokens"
  ON public.brand_tokens
  FOR SELECT
  USING (
    org_id IN (
      SELECT t.org_id FROM public.teams t
      JOIN public.team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid()
    )
  );
