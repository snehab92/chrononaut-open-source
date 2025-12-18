-- Add missing columns to ai_conversations and ai_messages
-- (These tables already exist from migration 20251212050000)

-- Add missing columns to ai_conversations
ALTER TABLE public.ai_conversations 
  ADD COLUMN IF NOT EXISTS folder text default 'Conversations',
  ADD COLUMN IF NOT EXISTS is_starred boolean default false,
  ADD COLUMN IF NOT EXISTS is_archived boolean default false,
  ADD COLUMN IF NOT EXISTS last_message_at timestamp with time zone default now();

-- Add missing columns to ai_messages
ALTER TABLE public.ai_messages 
  ADD COLUMN IF NOT EXISTS saved_to_memory boolean default false,
  ADD COLUMN IF NOT EXISTS pushed_to_note_id uuid references public.notes(id) on delete set null,
  ADD COLUMN IF NOT EXISTS created_task_id uuid references public.tasks(id) on delete set null,
  ADD COLUMN IF NOT EXISTS tokens_used integer,
  ADD COLUMN IF NOT EXISTS model text;

-- Add missing index
CREATE INDEX IF NOT EXISTS idx_ai_conversations_context 
  ON public.ai_conversations(context_type, context_id);

-- Update RLS policies to simpler "all" policies
DROP POLICY IF EXISTS "Users can view own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.ai_conversations;

CREATE POLICY "Users can manage own ai_conversations" 
  ON public.ai_conversations FOR ALL 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.ai_messages;
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON public.ai_messages;
DROP POLICY IF EXISTS "Users can delete messages in own conversations" ON public.ai_messages;

CREATE POLICY "Users can manage own ai_messages" 
  ON public.ai_messages FOR ALL 
  USING (
    conversation_id IN (
      SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()
    )
  );
