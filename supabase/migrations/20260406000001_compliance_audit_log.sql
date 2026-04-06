-- VIBE Trust Layer: compliance audit log
-- Every kernel-generated asset gets a row
-- Append-only: no UPDATE or DELETE policies = immutable audit trail

CREATE TABLE IF NOT EXISTS compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  team_id UUID REFERENCES teams(id),
  job_id UUID REFERENCES jobs(id),
  artifact_type TEXT NOT NULL,
  artifact_hash TEXT NOT NULL,
  skill_ids TEXT[] NOT NULL DEFAULT '{}',
  skill_versions INTEGER[] DEFAULT '{}',
  governance_version_id UUID REFERENCES governance_versions(id),
  department TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE compliance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_read"
  ON compliance_audit_log FOR SELECT
  USING (org_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "audit_log_insert"
  ON compliance_audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- No UPDATE or DELETE policies = append-only by design

CREATE INDEX IF NOT EXISTS idx_audit_log_org
  ON compliance_audit_log (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_job
  ON compliance_audit_log (job_id);
