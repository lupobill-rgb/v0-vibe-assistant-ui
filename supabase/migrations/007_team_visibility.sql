-- Migration: Add team_visibility table
-- Layer 2 (3/4): Cross-team permission rules (none, aggregate, record)

CREATE TABLE public.team_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  target_team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  visibility_level text NOT NULL CHECK (visibility_level IN ('none', 'aggregate', 'record')),
  scope_filter text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_team_id, target_team_id)
);

ALTER TABLE public.team_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view visibility rules for their team"
  ON public.team_visibility
  FOR SELECT
  USING (
    source_team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );
