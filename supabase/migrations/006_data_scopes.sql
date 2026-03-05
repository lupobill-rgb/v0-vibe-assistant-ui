-- Migration: Add data_scopes table
-- Layer 2 (2/4): Defines what each team owns, reads, or aggregates

CREATE TABLE public.data_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  scope_name text NOT NULL,
  scope_type text NOT NULL CHECK (scope_type IN ('owned', 'read', 'aggregate')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, scope_name)
);

ALTER TABLE public.data_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team scopes"
  ON public.data_scopes
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );
