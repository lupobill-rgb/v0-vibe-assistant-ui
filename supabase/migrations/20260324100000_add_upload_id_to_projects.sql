-- Store file attachment reference on the project record.
-- This is the SINGLE SOURCE OF TRUTH for whether a file is attached,
-- replacing unreliable React state / request body references.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS upload_id uuid;
