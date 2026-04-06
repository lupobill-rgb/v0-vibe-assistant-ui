-- Skill recommendations + approval workflow

CREATE TABLE IF NOT EXISTS skill_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  team_id uuid NOT NULL,
  skill_id uuid REFERENCES skill_registry(id),
  recommended_by text NOT NULL DEFAULT 'vibe-ai',
  title text NOT NULL,
  rationale text NOT NULL,
  proposed_action text NOT NULL,
  estimated_impact text,
  context_data jsonb,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days'
);

CREATE TABLE IF NOT EXISTS skill_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL REFERENCES skill_recommendations(id),
  org_id uuid NOT NULL,
  team_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  decided_by uuid NOT NULL REFERENCES auth.users(id),
  decision_note text,
  execution_id uuid REFERENCES autonomous_executions(id),
  decided_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE skill_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_members_read_recommendations" ON skill_recommendations
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "team_members_insert_recommendations" ON skill_recommendations
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "team_members_update_recommendations" ON skill_recommendations
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "team_members_read_approvals" ON skill_approvals
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "team_members_insert_approvals" ON skill_approvals
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );
