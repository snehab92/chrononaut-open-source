-- Migration: daily_commitments table
-- Purpose: Track user acknowledgment of daily AI insights for accountability
-- Pattern: Idempotent (safe to re-run)

-- Create table
CREATE TABLE IF NOT EXISTS daily_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  commitment_date date NOT NULL,
  committed_at timestamptz DEFAULT now(),
  insight_id uuid REFERENCES ai_insights(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, commitment_date)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_daily_commitments_user_date 
  ON daily_commitments(user_id, commitment_date DESC);

-- RLS policies
ALTER TABLE daily_commitments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own commitments" ON daily_commitments;
CREATE POLICY "Users can view own commitments" ON daily_commitments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own commitments" ON daily_commitments;
CREATE POLICY "Users can create own commitments" ON daily_commitments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own commitments" ON daily_commitments;
CREATE POLICY "Users can update own commitments" ON daily_commitments
  FOR UPDATE USING (auth.uid() = user_id);
