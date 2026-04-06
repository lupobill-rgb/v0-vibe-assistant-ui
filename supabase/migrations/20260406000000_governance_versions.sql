-- VIBE Trust Layer: governance version registry
-- Machine-readable anchor for North Star and policy documents
-- Enables provenance chain: generated asset → governance version that governed it

CREATE TABLE IF NOT EXISTS governance_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name TEXT NOT NULL,
  version_label TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL,
  supersedes UUID REFERENCES governance_versions(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

ALTER TABLE governance_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "governance_versions_read"
  ON governance_versions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "governance_versions_insert"
  ON governance_versions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_governance_versions_doc
  ON governance_versions (document_name, effective_date DESC);
