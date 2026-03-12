-- Migration: form_submissions table for generated site forms
-- Stores submissions from forms on VIBE-generated sites that POST to Supabase.

CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_route TEXT NOT NULL DEFAULT '/',
  form_name TEXT NOT NULL DEFAULT 'contact',
  payload JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_by_project
  ON form_submissions(project_id, submitted_at DESC);

-- RLS
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Anon insert: anyone can submit a form on a published site
CREATE POLICY "form_submissions_anon_insert" ON form_submissions FOR INSERT
  WITH CHECK (true);

-- Authenticated select: team members can read submissions for their projects
CREATE POLICY "form_submissions_select" ON form_submissions FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE team_id IN (SELECT public.user_team_ids())
  ));

-- Authenticated delete: team members can delete submissions
CREATE POLICY "form_submissions_delete" ON form_submissions FOR DELETE
  USING (project_id IN (
    SELECT id FROM projects WHERE team_id IN (SELECT public.user_team_ids())
  ));
