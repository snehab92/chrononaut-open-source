-- Fix search_path vulnerabilities in database functions
-- Adds "SET search_path = ''" to all 7 vulnerable functions
-- This prevents SQL injection via schema poisoning attacks

-- 1. Fix update_assessment_updated_at
CREATE OR REPLACE FUNCTION public.update_assessment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 2. Fix update_daily_usage
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
    total_input_tokens = public.token_usage_daily.total_input_tokens + EXCLUDED.total_input_tokens,
    total_output_tokens = public.token_usage_daily.total_output_tokens + EXCLUDED.total_output_tokens,
    total_cost_usd = public.token_usage_daily.total_cost_usd + EXCLUDED.total_cost_usd,
    cache_hits = public.token_usage_daily.cache_hits + EXCLUDED.cache_hits,
    total_requests = public.token_usage_daily.total_requests + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3. Fix cleanup_expired_cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- 5. Fix update_conversation_timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ai_conversations
  SET last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 6. Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 7. Fix handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Add comment explaining the security fix
COMMENT ON FUNCTION public.update_assessment_updated_at IS
  'Security: SET search_path prevents schema poisoning attacks';
COMMENT ON FUNCTION public.update_daily_usage IS
  'Security: SET search_path prevents schema poisoning attacks';
COMMENT ON FUNCTION public.cleanup_expired_cache IS
  'Security: SET search_path prevents schema poisoning attacks';
COMMENT ON FUNCTION public.update_updated_at_column IS
  'Security: SET search_path prevents schema poisoning attacks';
COMMENT ON FUNCTION public.update_conversation_timestamp IS
  'Security: SET search_path prevents schema poisoning attacks';
COMMENT ON FUNCTION public.handle_new_user IS
  'Security: SET search_path prevents schema poisoning attacks';
COMMENT ON FUNCTION public.handle_updated_at IS
  'Security: SET search_path prevents schema poisoning attacks';
