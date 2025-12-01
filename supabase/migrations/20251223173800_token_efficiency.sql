-- Token Efficiency Infrastructure for AI Agents
-- Tracks usage, caches responses, and stores pre-computed patterns

-- =============================================================================
-- TOKEN USAGE TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Request metadata
  agent_type TEXT NOT NULL,
  task_type TEXT NOT NULL,
  model_used TEXT NOT NULL,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,

  -- Token counts
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cached_response BOOLEAN DEFAULT FALSE,

  -- Cost calculation (stored for historical accuracy as pricing may change)
  input_cost_usd NUMERIC(10, 6) DEFAULT 0,
  output_cost_usd NUMERIC(10, 6) DEFAULT 0,
  total_cost_usd NUMERIC(10, 6) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_token_usage_user_date
  ON public.token_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_agent
  ON public.token_usage(user_id, agent_type);

-- =============================================================================
-- DAILY USAGE AGGREGATES (for fast dashboard queries)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.token_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  usage_date DATE NOT NULL,

  -- Aggregates by agent
  pattern_analyst_input_tokens INTEGER DEFAULT 0,
  pattern_analyst_output_tokens INTEGER DEFAULT 0,
  research_assistant_input_tokens INTEGER DEFAULT 0,
  research_assistant_output_tokens INTEGER DEFAULT 0,
  executive_coach_input_tokens INTEGER DEFAULT 0,
  executive_coach_output_tokens INTEGER DEFAULT 0,
  therapist_input_tokens INTEGER DEFAULT 0,
  therapist_output_tokens INTEGER DEFAULT 0,

  -- Totals
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_cost_usd NUMERIC(10, 4) DEFAULT 0,

  -- Cache efficiency
  cache_hits INTEGER DEFAULT 0,
  total_requests INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_token_usage_daily_lookup
  ON public.token_usage_daily(user_id, usage_date DESC);

-- =============================================================================
-- AI RESPONSE CACHE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Cache key components
  cache_key TEXT NOT NULL,           -- Hash of: task_type + context_hash + date
  task_type TEXT NOT NULL,
  context_hash TEXT NOT NULL,        -- SHA256 of input context (first 32 chars)

  -- Cached response
  response_content TEXT NOT NULL,
  model_used TEXT NOT NULL,

  -- Metadata
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_cache_key
  ON public.ai_response_cache(user_id, cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires
  ON public.ai_response_cache(expires_at);

-- =============================================================================
-- PRE-COMPUTED PATTERNS (daily recalculation)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.computed_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  pattern_type TEXT NOT NULL,        -- 'energy_forecast', 'mood_trends', 'task_patterns', 'daily_context'
  computation_date DATE NOT NULL,

  -- Store as JSON for flexibility
  pattern_data JSONB NOT NULL,

  -- Data sources used (for invalidation)
  source_data_hash TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, pattern_type, computation_date)
);

CREATE INDEX IF NOT EXISTS idx_patterns_lookup
  ON public.computed_patterns(user_id, pattern_type, computation_date DESC);

-- =============================================================================
-- CONTEXT SUMMARIES (for expensive context that changes infrequently)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.context_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  context_type TEXT NOT NULL,        -- 'journal_week', 'health_week', 'patterns_week'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  summary_content TEXT NOT NULL,
  source_data_hash TEXT NOT NULL,    -- Detect when underlying data changes

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  UNIQUE(user_id, context_type, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_context_lookup
  ON public.context_summaries(user_id, context_type, period_end DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.computed_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_summaries ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own token usage"
  ON public.token_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own token usage"
  ON public.token_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own daily usage"
  ON public.token_usage_daily FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cache"
  ON public.ai_response_cache FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own patterns"
  ON public.computed_patterns FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own summaries"
  ON public.context_summaries FOR ALL
  USING (auth.uid() = user_id);

-- =============================================================================
-- HELPER FUNCTION: Update daily usage aggregates
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_daily_usage(
  p_user_id UUID,
  p_date DATE,
  p_agent_type TEXT,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER,
  p_cost NUMERIC,
  p_cached BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.token_usage_daily (
    user_id,
    usage_date,
    total_input_tokens,
    total_output_tokens,
    total_cost_usd,
    cache_hits,
    total_requests
  )
  VALUES (
    p_user_id,
    p_date,
    p_input_tokens,
    p_output_tokens,
    p_cost,
    CASE WHEN p_cached THEN 1 ELSE 0 END,
    1
  )
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    total_input_tokens = token_usage_daily.total_input_tokens + EXCLUDED.total_input_tokens,
    total_output_tokens = token_usage_daily.total_output_tokens + EXCLUDED.total_output_tokens,
    total_cost_usd = token_usage_daily.total_cost_usd + EXCLUDED.total_cost_usd,
    cache_hits = token_usage_daily.cache_hits + EXCLUDED.cache_hits,
    total_requests = token_usage_daily.total_requests + 1,
    updated_at = NOW();

  -- Update agent-specific columns
  IF p_agent_type = 'pattern-analyst' THEN
    UPDATE public.token_usage_daily
    SET pattern_analyst_input_tokens = pattern_analyst_input_tokens + p_input_tokens,
        pattern_analyst_output_tokens = pattern_analyst_output_tokens + p_output_tokens
    WHERE user_id = p_user_id AND usage_date = p_date;
  ELSIF p_agent_type = 'research-assistant' THEN
    UPDATE public.token_usage_daily
    SET research_assistant_input_tokens = research_assistant_input_tokens + p_input_tokens,
        research_assistant_output_tokens = research_assistant_output_tokens + p_output_tokens
    WHERE user_id = p_user_id AND usage_date = p_date;
  ELSIF p_agent_type = 'executive-coach' THEN
    UPDATE public.token_usage_daily
    SET executive_coach_input_tokens = executive_coach_input_tokens + p_input_tokens,
        executive_coach_output_tokens = executive_coach_output_tokens + p_output_tokens
    WHERE user_id = p_user_id AND usage_date = p_date;
  ELSIF p_agent_type = 'therapist' THEN
    UPDATE public.token_usage_daily
    SET therapist_input_tokens = therapist_input_tokens + p_input_tokens,
        therapist_output_tokens = therapist_output_tokens + p_output_tokens
    WHERE user_id = p_user_id AND usage_date = p_date;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- CLEANUP: Delete expired cache entries (run via cron)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
