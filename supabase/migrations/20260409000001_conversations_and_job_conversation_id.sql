-- Create conversations and conversation_messages tables if they don't exist,
-- and add conversation_id column to jobs table.
-- This fixes "Failed to create task" errors when the API tries to insert
-- conversation_id into the jobs table.

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversation messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  job_id UUID REFERENCES jobs(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add conversation_id column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id);

-- RLS policies — service role bypasses RLS, but add anon read for dashboard polling
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_read_conversations ON conversations;
CREATE POLICY anon_read_conversations ON conversations FOR SELECT USING (true);

DROP POLICY IF EXISTS anon_read_conversation_messages ON conversation_messages;
CREATE POLICY anon_read_conversation_messages ON conversation_messages FOR SELECT USING (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_jobs_conversation_id ON jobs(conversation_id);

-- Reload PostgREST schema cache so new columns are visible
NOTIFY pgrst, 'reload schema';
