-- Migration: Convert team_members.role from TEXT with CHECK to a proper enum
-- Layer 2 prerequisite: org hierarchy needs typed roles for RBAC

-- Step 1: Create the enum type
CREATE TYPE team_role AS ENUM ('IC', 'Lead', 'Manager', 'Director', 'Executive', 'Admin');

-- Step 2: Drop the existing CHECK constraint on role
-- The constraint was defined inline in 001, Postgres names it: team_members_role_check
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_role_check;

-- Step 3: Alter column from TEXT to the enum
-- Table has 0 rows so no data conversion needed
ALTER TABLE team_members
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role SET DATA TYPE team_role USING role::team_role,
  ALTER COLUMN role SET DEFAULT 'IC';

-- Step 4: Add a comment for documentation
COMMENT ON TYPE team_role IS 'RBAC role hierarchy: IC < Lead < Manager < Director < Executive < Admin';
