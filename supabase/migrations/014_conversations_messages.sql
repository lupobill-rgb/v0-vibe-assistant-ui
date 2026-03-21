-- Migration: Add conversations and conversation_messages for iterative project editing
-- Conversations link to projects; conversation_messages track the full prompt/response chain
-- NOTE: "messages" is reserved by Supabase Realtime — using "conversation_messages" instead

-- ============================================================================
-- Conversations (belong to projects)
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_by_project ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- ============================================================================
-- Conversation Messages (belong to conversations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_messages_by_conversation ON conversation_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conv_messages_by_job ON conversation_messages(job_id);

-- ============================================================================
-- Add conversation_id to jobs (optional FK — jobs can exist without conversation)
-- ============================================================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_by_conversation ON jobs(conversation_id);

-- ============================================================================
-- Auto-update updated_at on conversations when messages are added
-- ============================================================================
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conv_messages_update_conversation
  AFTER INSERT ON conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
