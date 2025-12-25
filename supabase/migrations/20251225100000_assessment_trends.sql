-- Assessment Trends and Reminders Migration
-- Adds tables for:
-- 1. Executive Function historical scores (quarterly tracking)
-- 2. Assessment reminders (quarterly retake prompts for EF)

-- ============================================================================
-- Executive Function Historical Scores
-- ============================================================================
-- Stores quarterly EF assessment scores for trend visualization

CREATE TABLE IF NOT EXISTS executive_function_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assessment_date DATE NOT NULL,

  -- Total score (sum of all skills, max 210)
  total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 210),

  -- Individual skill scores (0-21 each)
  goal_directed_persistence INTEGER CHECK (goal_directed_persistence >= 0 AND goal_directed_persistence <= 21),
  organization INTEGER CHECK (organization >= 0 AND organization <= 21),
  task_initiation INTEGER CHECK (task_initiation >= 0 AND task_initiation <= 21),
  metacognition INTEGER CHECK (metacognition >= 0 AND metacognition <= 21),
  planning_prioritization INTEGER CHECK (planning_prioritization >= 0 AND planning_prioritization <= 21),
  stress_tolerance INTEGER CHECK (stress_tolerance >= 0 AND stress_tolerance <= 21),
  flexibility INTEGER CHECK (flexibility >= 0 AND flexibility <= 21),
  sustained_attention INTEGER CHECK (sustained_attention >= 0 AND sustained_attention <= 21),
  working_memory INTEGER CHECK (working_memory >= 0 AND working_memory <= 21),
  emotional_control INTEGER CHECK (emotional_control >= 0 AND emotional_control <= 21),

  -- Metadata
  source_file TEXT,  -- Path to the markdown file
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One score entry per date per user
  UNIQUE(user_id, assessment_date)
);

-- ============================================================================
-- Assessment Reminders
-- ============================================================================
-- Tracks when assessments were last taken and when to remind user

CREATE TABLE IF NOT EXISTS assessment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Assessment type: 'values_alignment', 'strengths', 'self_compassion', 'executive_function'
  assessment_type TEXT NOT NULL CHECK (
    assessment_type IN ('values_alignment', 'strengths', 'self_compassion', 'executive_function')
  ),

  -- Tracking dates
  last_taken_date DATE,
  next_reminder_date DATE,

  -- Frequency in days (default 90 for quarterly)
  -- Set to null for assessments that don't need regular retakes
  reminder_frequency_days INTEGER DEFAULT 90,

  -- User can snooze/dismiss reminders
  dismissed_until DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One reminder per assessment type per user
  UNIQUE(user_id, assessment_type)
);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE executive_function_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_reminders ENABLE ROW LEVEL SECURITY;

-- EF Scores policies
CREATE POLICY "Users can view own EF scores"
  ON executive_function_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own EF scores"
  ON executive_function_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own EF scores"
  ON executive_function_scores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own EF scores"
  ON executive_function_scores FOR DELETE
  USING (auth.uid() = user_id);

-- Reminder policies
CREATE POLICY "Users can view own reminders"
  ON assessment_reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
  ON assessment_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON assessment_reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON assessment_reminders FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Fast lookup of EF scores by user, ordered by date (for trend charts)
CREATE INDEX idx_ef_scores_user_date
  ON executive_function_scores(user_id, assessment_date DESC);

-- Fast lookup of due reminders
CREATE INDEX idx_reminders_user_due
  ON assessment_reminders(user_id, next_reminder_date)
  WHERE next_reminder_date IS NOT NULL;

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_assessment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ef_scores_updated_at
  BEFORE UPDATE ON executive_function_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_updated_at();

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON assessment_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_updated_at();

-- ============================================================================
-- Initialize default reminders for EF (quarterly)
-- Other assessments don't need regular reminders by default
-- ============================================================================

-- Note: Reminders will be created when user first views their assessment
-- or when they complete an assessment. No default data needed here.
