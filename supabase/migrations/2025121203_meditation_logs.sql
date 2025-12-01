-- Migration: Meditation logs table for manual tracking
-- Pattern: Idempotent (safe to re-run)

CREATE TABLE IF NOT EXISTS meditation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  logged_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- One log per day per user
  UNIQUE(user_id, date)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_meditation_logs_user_date ON meditation_logs(user_id, date DESC);

-- RLS
ALTER TABLE meditation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own meditation logs" ON meditation_logs;
CREATE POLICY "Users can manage own meditation logs" 
  ON meditation_logs FOR ALL 
  USING (auth.uid() = user_id);
