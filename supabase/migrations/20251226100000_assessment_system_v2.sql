-- Assessment System V2 Migration
-- Adds tables for:
-- 1. Self-Compassion scores (6 subscales + overall)
-- 2. Strengths responses (60 strengths × 3 dimensions)
-- 3. Values Alignment results (metadata + storage path)
-- 4. Cross-Assessment Insights (Pattern Analyzer output)
-- Also adds 2 missing skill columns to executive_function_scores

-- ============================================================================
-- FIX: Add missing skill columns to executive_function_scores
-- ============================================================================
-- The Dawson assessment has 12 skills (max 252), not 10

ALTER TABLE executive_function_scores
ADD COLUMN IF NOT EXISTS response_inhibition INTEGER CHECK (response_inhibition >= 0 AND response_inhibition <= 21),
ADD COLUMN IF NOT EXISTS time_management INTEGER CHECK (time_management >= 0 AND time_management <= 21);

-- Update max_possible constraint (now 252 instead of 210)
ALTER TABLE executive_function_scores
DROP CONSTRAINT IF EXISTS executive_function_scores_total_score_check;

ALTER TABLE executive_function_scores
ADD CONSTRAINT executive_function_scores_total_score_check
CHECK (total_score >= 0 AND total_score <= 252);

-- ============================================================================
-- SELF-COMPASSION SCORES
-- ============================================================================
-- Based on Kristin Neff's Self-Compassion Scale (SCS)
-- Overall score: 1.0 - 5.0 scale
-- 6 subscales: 3 positive (higher = better), 3 negative (reverse-scored)

CREATE TABLE IF NOT EXISTS self_compassion_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assessment_date DATE NOT NULL,

  -- Overall self-compassion score (1.0 - 5.0)
  overall_score DECIMAL(3,2) NOT NULL CHECK (overall_score >= 1.0 AND overall_score <= 5.0),

  -- Positive subscales (higher = more self-compassion)
  self_kindness DECIMAL(3,2) CHECK (self_kindness >= 1.0 AND self_kindness <= 5.0),
  common_humanity DECIMAL(3,2) CHECK (common_humanity >= 1.0 AND common_humanity <= 5.0),
  mindfulness DECIMAL(3,2) CHECK (mindfulness >= 1.0 AND mindfulness <= 5.0),

  -- Negative subscales (lower = more self-compassion)
  self_judgment DECIMAL(3,2) CHECK (self_judgment >= 1.0 AND self_judgment <= 5.0),
  isolation DECIMAL(3,2) CHECK (isolation >= 1.0 AND isolation <= 5.0),
  over_identification DECIMAL(3,2) CHECK (over_identification >= 1.0 AND over_identification <= 5.0),

  -- Raw responses for Pattern Analyzer (optional)
  raw_responses JSONB,

  -- Metadata
  source TEXT DEFAULT 'self-compassion.org',
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, assessment_date)
);

-- ============================================================================
-- STRENGTHS RESPONSES
-- ============================================================================
-- Based on Cappfinity Strengths Profile (60 strengths × 3 dimensions)
-- Each strength rated on: Performance, Energy, Frequency (1-5 scale)
-- Quadrant computed from P/E/F scores

CREATE TABLE IF NOT EXISTS strengths_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assessment_date DATE NOT NULL,

  -- Strength identification
  strength_name TEXT NOT NULL,
  strength_family TEXT CHECK (strength_family IN ('being', 'communicating', 'motivating', 'relating', 'thinking')),

  -- Three dimensions (1-5 scale)
  performance INTEGER CHECK (performance >= 1 AND performance <= 5),
  energy INTEGER CHECK (energy >= 1 AND energy <= 5),
  frequency INTEGER CHECK (frequency >= 1 AND frequency <= 5),

  -- Computed quadrant based on P/E/F thresholds
  quadrant TEXT CHECK (quadrant IN ('realized', 'unrealized', 'learned', 'weakness')),

  -- Rank within quadrant (1 = highest in that quadrant)
  rank_in_quadrant INTEGER,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, assessment_date, strength_name)
);

-- ============================================================================
-- VALUES ALIGNMENT RESULTS
-- ============================================================================
-- Based on Brené Brown's "Living Into Our Values" framework
-- Core values + metadata; full narrative stored in Supabase Storage

CREATE TABLE IF NOT EXISTS values_alignment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assessment_date DATE NOT NULL,

  -- Top 3 core values
  value_1 TEXT,
  value_2 TEXT,
  value_3 TEXT,

  -- Supporting/slippery behaviors (summarized)
  value_1_supporting TEXT[],
  value_1_slippery TEXT[],
  value_2_supporting TEXT[],
  value_2_slippery TEXT[],
  value_3_supporting TEXT[],
  value_3_slippery TEXT[],

  -- Early warning signs
  early_warning_signs TEXT[],

  -- Living Aligned Score (computed by Pattern Analyzer from 30d patterns)
  living_aligned_score INTEGER CHECK (living_aligned_score >= 0 AND living_aligned_score <= 100),
  living_aligned_trend TEXT CHECK (living_aligned_trend IN ('up', 'down', 'stable')),
  living_aligned_highlights TEXT[],
  living_aligned_concerns TEXT[],

  -- Full narrative stored in Supabase Storage
  storage_path TEXT,

  -- Cached Pattern Analyzer insights
  pattern_insights JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, assessment_date)
);

-- ============================================================================
-- CROSS-ASSESSMENT INSIGHTS (Pattern Analyzer output)
-- ============================================================================
-- Stores AI-generated insights that connect findings across assessments
-- e.g., "Low Emotional Control + High Over-Identification → DBT skills recommended"

CREATE TABLE IF NOT EXISTS assessment_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Which assessments contributed to this insight
  source_assessments TEXT[] NOT NULL,

  -- Insight classification
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'cross_correlation',      -- Patterns across assessments
    'pattern_connection',     -- Behavioral pattern identified
    'strength_leverage',      -- Using strength to compensate for challenge
    'warning_indicator',      -- Something to watch out for
    'progress_milestone'      -- Improvement detected
  )),

  -- Insight content
  content TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('gentle', 'notable', 'significant')),

  -- Context for when this insight is relevant
  trigger_context TEXT[],  -- ['morning_insights', 'weekly_review', 'therapist_chat', 'executive_coach_chat']

  -- Freshness tracking
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,  -- Insights expire and need regeneration
  is_dismissed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE self_compassion_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE strengths_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE values_alignment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_insights ENABLE ROW LEVEL SECURITY;

-- Self-Compassion policies
CREATE POLICY "Users can view own SC scores"
  ON self_compassion_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own SC scores"
  ON self_compassion_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own SC scores"
  ON self_compassion_scores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own SC scores"
  ON self_compassion_scores FOR DELETE
  USING (auth.uid() = user_id);

-- Strengths policies
CREATE POLICY "Users can view own strengths"
  ON strengths_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strengths"
  ON strengths_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strengths"
  ON strengths_responses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strengths"
  ON strengths_responses FOR DELETE
  USING (auth.uid() = user_id);

-- Values policies
CREATE POLICY "Users can view own values"
  ON values_alignment_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own values"
  ON values_alignment_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own values"
  ON values_alignment_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own values"
  ON values_alignment_results FOR DELETE
  USING (auth.uid() = user_id);

-- Assessment Insights policies
CREATE POLICY "Users can view own insights"
  ON assessment_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights"
  ON assessment_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
  ON assessment_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights"
  ON assessment_insights FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Self-Compassion: trend queries
CREATE INDEX idx_sc_scores_user_date
  ON self_compassion_scores(user_id, assessment_date DESC);

-- Strengths: quadrant queries
CREATE INDEX idx_strengths_user_date
  ON strengths_responses(user_id, assessment_date DESC);

CREATE INDEX idx_strengths_quadrant
  ON strengths_responses(user_id, assessment_date, quadrant);

-- Values: latest lookup
CREATE INDEX idx_values_user_date
  ON values_alignment_results(user_id, assessment_date DESC);

-- Insights: active insights for dashboard/chat
CREATE INDEX idx_insights_user_active
  ON assessment_insights(user_id, generated_at DESC)
  WHERE is_dismissed = FALSE;

CREATE INDEX idx_insights_trigger
  ON assessment_insights USING GIN(trigger_context);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps
CREATE TRIGGER update_sc_scores_updated_at
  BEFORE UPDATE ON self_compassion_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_updated_at();

CREATE TRIGGER update_values_updated_at
  BEFORE UPDATE ON values_alignment_results
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_updated_at();
