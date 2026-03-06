-- Add last_diff column if it doesn't already exist
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_diff text;

-- Ensure anon_read_jobs policy exists
DROP POLICY IF EXISTS anon_read_jobs ON jobs;
CREATE POLICY anon_read_jobs ON jobs
  FOR SELECT
  TO anon
  USING (true);
