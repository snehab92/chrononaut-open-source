-- Add encrypted columns to AI conversations and messages
-- Supports E2EE for conversation titles and message content

-- Add encrypted title to conversations
ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS encrypted_title TEXT,
  ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Add encrypted content to messages
ALTER TABLE public.ai_messages
  ADD COLUMN IF NOT EXISTS encrypted_content TEXT,
  ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Create index for encrypted conversations
CREATE INDEX IF NOT EXISTS idx_ai_conversations_encrypted
  ON public.ai_conversations(user_id, created_at DESC)
  WHERE is_encrypted = true;

-- Create index for encrypted messages
CREATE INDEX IF NOT EXISTS idx_ai_messages_encrypted
  ON public.ai_messages(conversation_id, created_at ASC)
  WHERE is_encrypted = true;

-- Add comments
COMMENT ON COLUMN public.ai_conversations.encrypted_title IS
  'E2EE: Conversation title encrypted with master key from .env.local';
COMMENT ON COLUMN public.ai_conversations.is_encrypted IS
  'Flag indicating if this conversation uses E2EE encryption';
COMMENT ON COLUMN public.ai_messages.encrypted_content IS
  'E2EE: Message content encrypted with master key from .env.local';
COMMENT ON COLUMN public.ai_messages.is_encrypted IS
  'Flag indicating if this message uses E2EE encryption';
