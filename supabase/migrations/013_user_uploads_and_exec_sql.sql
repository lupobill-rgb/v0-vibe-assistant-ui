-- Migration: user_uploads tracking table + exec_sql helper for dynamic DDL
-- Used by the file-upload feature to create tables from CSV/Excel uploads.

-- 1. exec_sql: allows the service-role client to run dynamic DDL
CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  EXECUTE query;
END;
$$;

-- 2. user_uploads: metadata table tracking every uploaded file/table
CREATE TABLE IF NOT EXISTS user_uploads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  table_name text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: users can only see their own uploads
ALTER TABLE user_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_uploads"
  ON user_uploads FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert (bypasses RLS anyway, but explicit policy)
CREATE POLICY "service_insert_uploads"
  ON user_uploads FOR INSERT
  WITH CHECK (true);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_user_uploads_user_id ON user_uploads(user_id);
