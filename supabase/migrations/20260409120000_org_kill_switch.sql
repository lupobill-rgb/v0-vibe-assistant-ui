ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS autonomous_kill_switch boolean NOT NULL DEFAULT false;
