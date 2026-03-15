-- User file uploads: stores metadata + sample data for uploaded CSV/XLSX files
-- so the LLM can reference real data when generating dashboards.
CREATE TABLE IF NOT EXISTS user_uploads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  project_id     uuid REFERENCES projects(id) ON DELETE CASCADE,
  filename       text NOT NULL,
  table_name     text NOT NULL,                     -- sanitised identifier derived from filename
  columns        jsonb NOT NULL DEFAULT '[]',       -- array of column names
  column_schema  jsonb NOT NULL DEFAULT '{}',       -- { col_name: "string"|"number"|"boolean"|"date" }
  sample_data    jsonb NOT NULL DEFAULT '[]',       -- first 20 rows as array of objects
  row_count      integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by user (most recent first)
CREATE INDEX idx_user_uploads_user_id ON user_uploads(user_id, created_at DESC);

-- RLS: users can only see their own uploads
ALTER TABLE user_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own uploads"
  ON user_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own uploads"
  ON user_uploads FOR SELECT USING (auth.uid() = user_id);

-- Service role (platform client) bypasses RLS, so the API can always read/write.
