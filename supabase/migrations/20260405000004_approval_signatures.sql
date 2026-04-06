-- VIBE Trust Layer: approval signatures
-- 21 CFR Part 11 electronic signature compliance
-- Immutable: no UPDATE or DELETE policies

CREATE TABLE IF NOT EXISTS approval_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID NOT NULL REFERENCES compliance_audit_log(id),
  approved_by UUID NOT NULL REFERENCES auth.users(id),
  approval_role TEXT NOT NULL,
  artifact_hash_at_approval TEXT NOT NULL,
  signature_method TEXT NOT NULL DEFAULT 'platform_auth',
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

ALTER TABLE approval_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signatures_read"
  ON approval_signatures FOR SELECT
  USING (audit_log_id IN (
    SELECT id FROM compliance_audit_log
    WHERE org_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "signatures_insert"
  ON approval_signatures FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- No UPDATE or DELETE = immutable signatures

CREATE INDEX IF NOT EXISTS idx_signatures_audit
  ON approval_signatures (audit_log_id);
CREATE INDEX IF NOT EXISTS idx_signatures_user
  ON approval_signatures (approved_by, approved_at DESC);
