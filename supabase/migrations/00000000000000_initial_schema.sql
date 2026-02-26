-- =============================================================================
-- CHRONONAUT: Consolidated Initial Schema
-- =============================================================================
-- This single migration file creates the complete database schema.
-- It replaces 21 incremental migration files into one clean starting point.
--
-- Sections:
--   1. Extensions
--   2. Enums
--   3. Functions (created before tables that reference them in triggers)
--   4. Tables (in dependency order)
--   5. Indexes
--   6. Row Level Security (RLS)
--   7. Triggers
--   8. Storage Policies
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- 2. ENUMS
-- =============================================================================

CREATE TYPE note_type AS ENUM (
  'meeting', 'document', 'assessment', 'quick capture'
);

CREATE TYPE assessment_type AS ENUM (
  'self_compassion', 'values_alignment', 'strengths_profile', 'executive_skills'
);

CREATE TYPE mood_label AS ENUM (
  'Threatened', 'Stressed', 'Unfocused', 'Rejected',
  'Creative', 'Adventurous', 'Angry', 'Manic',
  'Calm', 'Acceptance', 'Socially Connected', 'Romantic'
);

CREATE TYPE meeting_type AS ENUM (
  'work_internal', 'work_external', 'work_one_on_one',
  'personal_networking', 'personal_therapy', 'personal_coaching'
);

CREATE TYPE focus_mode AS ENUM (
  'admin', 'research', 'writing', 'meeting_prep', 'presentation'
);

CREATE TYPE cue_type AS ENUM (
  'meeting_proximity', 'rabbit_hole', 'task_mismatch',
  'break_reminder', 'wind_down'
);


-- =============================================================================
-- 3. FUNCTIONS
-- =============================================================================
-- Created before tables so triggers can reference them.

-- 3a. handle_new_user: auto-create profile row when a user signs up
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

-- 3b. handle_updated_at: generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- 3c. update_updated_at_column: used by about_me_files and agent_instructions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- 3d. update_assessment_updated_at: used by assessment tables
CREATE OR REPLACE FUNCTION public.update_assessment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3e. update_conversation_timestamp: updates ai_conversations.last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ai_conversations
  SET last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3f. update_daily_usage: upsert aggregated token usage per day
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3g. cleanup_expired_cache: removes expired AI response cache entries
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


-- =============================================================================
-- 4. TABLES (in dependency order)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 profiles
-- -----------------------------------------------------------------------------
-- Extends Supabase auth.users. Every user gets a profile row automatically
-- via the on_auth_user_created trigger.

CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  timezone text DEFAULT 'America/New_York',
  core_values text[] DEFAULT '{}',
  wind_down_time time DEFAULT '18:00',
  max_focus_minutes integer DEFAULT 90,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.2 strength_definitions
-- -----------------------------------------------------------------------------
-- Reference table: 60 strengths from the Strengths Profile assessment.
-- Populated once, never changes.

CREATE TABLE public.strength_definitions (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  family text NOT NULL CHECK (family IN ('Being', 'Communicating', 'Motivating', 'Relating', 'Thinking')),
  description text
);

-- -----------------------------------------------------------------------------
-- 4.3 folders
-- -----------------------------------------------------------------------------
-- Hierarchical organization for notes. Supports notebook and conversation types.

CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  folder_type text DEFAULT 'notebook',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.4 notes
-- -----------------------------------------------------------------------------
-- Central hub for all notes: meeting notes, documents, assessments, quick captures.

CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text,
  note_type note_type DEFAULT 'document',
  tags text[] DEFAULT '{}',
  calendar_event_id text,
  assessment_type assessment_type,
  assessment_score numeric(5,2),
  location_name text,
  location_lat numeric(10,7),
  location_lng numeric(10,7),
  photo_url text,
  folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  is_starred boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.5 tasks
-- -----------------------------------------------------------------------------
-- Task management with external sync support (e.g. TickTick).

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  external_id text UNIQUE,
  external_list_id text,
  external_list_name text,
  external_section_name text,
  sync_status text DEFAULT 'local_only',
  last_synced_at timestamptz,
  title text NOT NULL,
  content text,
  priority integer CHECK (priority BETWEEN 0 AND 4) DEFAULT 0,
  due_date timestamptz,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  estimated_minutes integer,
  actual_minutes integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.6 time_blocks
-- -----------------------------------------------------------------------------
-- Focus sessions with mode, duration, and interruption tracking.

CREATE TABLE public.time_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  focus_mode focus_mode NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  planned_minutes integer,
  interruption_count integer DEFAULT 0,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.7 journal_entries
-- -----------------------------------------------------------------------------
-- Daily journal with AI-inferred mood and energy ratings.

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  entry_date date NOT NULL,
  happened text,
  feelings text,
  grateful text,
  ai_insights text,
  location_name text,
  location_lat numeric(10,7),
  location_lng numeric(10,7),
  photo_url text,
  tags text[] DEFAULT '{}',
  mood_label mood_label,
  mood_override boolean DEFAULT false,
  energy_rating integer CHECK (energy_rating BETWEEN 1 AND 10),
  energy_override boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- -----------------------------------------------------------------------------
-- 4.8 health_metrics
-- -----------------------------------------------------------------------------
-- Daily health data synced from Whoop. Contains BOTH legacy column names
-- (metric_date, resting_hr, sleep_performance, sleep_duration_minutes) and
-- newer column names (date, sleep_hours, sleep_consistency, resting_heart_rate)
-- since both are referenced in the codebase.

CREATE TABLE public.health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  -- Legacy date column
  metric_date date NOT NULL,
  -- New date column
  date date,
  -- Whoop recovery data
  recovery_score numeric(5,2),
  hrv_rmssd numeric(6,2),
  -- Legacy resting heart rate (numeric)
  resting_hr numeric(5,2),
  -- New resting heart rate (integer)
  resting_heart_rate integer,
  -- Legacy sleep columns
  sleep_performance numeric(5,2),
  sleep_duration_minutes integer,
  -- New sleep columns
  sleep_hours real,
  sleep_consistency integer,
  -- Strain data
  strain_score numeric(5,2),
  -- Whoop sync metadata
  whoop_cycle_id text,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, metric_date)
);

-- -----------------------------------------------------------------------------
-- 4.9 meeting_notes
-- -----------------------------------------------------------------------------
-- Meeting screen with prep, transcription, coaching, and action items.

CREATE TABLE public.meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  note_id uuid REFERENCES public.notes(id) ON DELETE SET NULL,
  title text NOT NULL,
  attendees text[] DEFAULT '{}',
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  meeting_type meeting_type DEFAULT 'work_internal',
  risk_level integer CHECK (risk_level BETWEEN 1 AND 5) DEFAULT 3,
  action_items text[] DEFAULT '{}',
  prep_notes text,
  meeting_notes text,
  transcript text,
  ai_summary text,
  coach_feedback text,
  coach_enabled boolean DEFAULT true,
  recording_enabled boolean DEFAULT false,
  actual_start timestamptz,
  actual_end timestamptz,
  -- Transcription session state
  transcription_status text DEFAULT 'idle' CHECK (transcription_status IN ('idle', 'recording', 'paused', 'completed')),
  transcription_started_at timestamptz,
  transcription_ended_at timestamptz,
  transcription_duration_seconds integer DEFAULT 0,
  -- Speaker diarization
  speaker_map jsonb DEFAULT '{}',
  transcript_segments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.10 ai_insights
-- -----------------------------------------------------------------------------
-- Stores output from the Pattern Analyst agent. Powers the homepage dashboard
-- with daily ("Rise and Shine") and weekly ("Week In Review") summaries.

CREATE TABLE public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  insight_date date NOT NULL,
  insight_type text NOT NULL,
  energy_score numeric(5,2) CHECK (energy_score >= 0 AND energy_score <= 100),
  self_compassion_score numeric(5,2) CHECK (self_compassion_score >= 0 AND self_compassion_score <= 100),
  values_alignment_score numeric(5,2) CHECK (values_alignment_score >= 0 AND values_alignment_score <= 100),
  strengths_being numeric(5,2) CHECK (strengths_being >= 0 AND strengths_being <= 100),
  strengths_communicating numeric(5,2) CHECK (strengths_communicating >= 0 AND strengths_communicating <= 100),
  strengths_motivating numeric(5,2) CHECK (strengths_motivating >= 0 AND strengths_motivating <= 100),
  strengths_relating numeric(5,2) CHECK (strengths_relating >= 0 AND strengths_relating <= 100),
  strengths_thinking numeric(5,2) CHECK (strengths_thinking >= 0 AND strengths_thinking <= 100),
  executive_skills_score numeric(5,2) CHECK (executive_skills_score >= 0 AND executive_skills_score <= 100),
  summary text,
  recommendations text[] DEFAULT '{}',
  patterns_detected text[] DEFAULT '{}',
  journal_ids uuid[] DEFAULT '{}',
  health_metric_ids uuid[] DEFAULT '{}',
  meeting_note_ids uuid[] DEFAULT '{}',
  strength_assessment_ids uuid[] DEFAULT '{}',
  note_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.11 cue_rules
-- -----------------------------------------------------------------------------
-- Defines when and how contextual cues fire (meeting alerts, break reminders, etc.)

CREATE TABLE public.cue_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  cue_type cue_type NOT NULL,
  enabled boolean DEFAULT true,
  conditions jsonb DEFAULT '{}',
  message_template text,
  action_type text,
  cooldown_minutes integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.12 cue_instances
-- -----------------------------------------------------------------------------
-- Tracks every time a cue was shown and how the user responded.

CREATE TABLE public.cue_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  cue_rule_id uuid REFERENCES public.cue_rules(id) ON DELETE CASCADE NOT NULL,
  fired_at timestamptz DEFAULT now(),
  context jsonb DEFAULT '{}',
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamptz,
  action_taken text,
  was_helpful boolean
);

-- -----------------------------------------------------------------------------
-- 4.13 integration_tokens
-- -----------------------------------------------------------------------------
-- OAuth token storage for integrations (Whoop, Google, etc.)

CREATE TABLE public.integration_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  token_type text,
  expires_at timestamptz,
  scopes text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- -----------------------------------------------------------------------------
-- 4.14 audit_log
-- -----------------------------------------------------------------------------
-- Tracks sensitive actions for security review.

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  ip_address inet,
  user_agent text,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.15 strength_assessments
-- -----------------------------------------------------------------------------
-- Tracks strength quadrant placements over time for trending.

CREATE TABLE public.strength_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assessment_date date NOT NULL,
  strength_name text REFERENCES public.strength_definitions(name) NOT NULL,
  quadrant text NOT NULL CHECK (quadrant IN ('Realized', 'Unrealized', 'Learned', 'Weakness')),
  rank_in_quadrant integer,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.16 sync_log
-- -----------------------------------------------------------------------------
-- Tracks sync operations for debugging and monitoring.

CREATE TABLE public.sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('pull', 'push', 'both')),
  trigger_type text NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'page_focus', 'action', 'user_action', 'initial_connect')),
  status text NOT NULL CHECK (status IN ('started', 'success', 'partial', 'failed')),
  pulled_count integer DEFAULT 0,
  pushed_count integer DEFAULT 0,
  conflict_count integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  error_message text,
  error_details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.17 calendar_events
-- -----------------------------------------------------------------------------
-- Stores Google Calendar events locally for meeting prep and scheduling.

CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  google_event_id text NOT NULL,
  google_calendar_id text NOT NULL DEFAULT 'primary',
  title text NOT NULL,
  description text,
  location text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  attendees jsonb DEFAULT '[]',
  organizer_email text,
  status text DEFAULT 'confirmed',
  meeting_link text,
  sync_status text DEFAULT 'synced',
  last_synced_at timestamptz DEFAULT now(),
  google_updated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, google_event_id)
);

-- -----------------------------------------------------------------------------
-- 4.18 workouts
-- -----------------------------------------------------------------------------
-- Individual workout sessions including meditation, synced from Whoop.

CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  whoop_id text NOT NULL,
  activity_type text NOT NULL,
  sport_id integer,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  total_minutes real NOT NULL,
  date date NOT NULL,
  strain_score real,
  avg_heart_rate integer,
  max_heart_rate integer,
  calories real,
  zone_1_minutes real DEFAULT 0,
  zone_2_minutes real DEFAULT 0,
  zone_3_minutes real DEFAULT 0,
  zone_4_minutes real DEFAULT 0,
  zone_5_minutes real DEFAULT 0,
  is_meditation boolean DEFAULT false,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, whoop_id)
);

-- -----------------------------------------------------------------------------
-- 4.19 daily_commitments
-- -----------------------------------------------------------------------------
-- Tracks user acknowledgment of daily AI insights for accountability.

CREATE TABLE public.daily_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  commitment_date date NOT NULL,
  committed_at timestamptz DEFAULT now(),
  insight_id uuid REFERENCES public.ai_insights(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, commitment_date)
);

-- -----------------------------------------------------------------------------
-- 4.20 meditation_logs
-- -----------------------------------------------------------------------------
-- Manual meditation tracking (complements Whoop workout data).

CREATE TABLE public.meditation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  logged_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- -----------------------------------------------------------------------------
-- 4.21 ai_context_collections
-- -----------------------------------------------------------------------------
-- Collections that group notes for AI agent context ("About Me" folders).

CREATE TABLE public.ai_context_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.22 ai_context_notes
-- -----------------------------------------------------------------------------
-- Junction table: which notes belong to which context collections.

CREATE TABLE public.ai_context_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.ai_context_collections(id) ON DELETE CASCADE,
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE(collection_id, note_id)
);

-- -----------------------------------------------------------------------------
-- 4.23 ai_conversations
-- -----------------------------------------------------------------------------
-- AI chat conversations organized by agent type and context.

CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  agent_type text,
  context_type text,
  context_id uuid,
  title text,
  folder text DEFAULT 'Conversations',
  is_starred boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.24 ai_messages
-- -----------------------------------------------------------------------------
-- Individual messages within AI conversations.

CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.ai_conversations(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  saved_to_memory boolean DEFAULT false,
  pushed_to_note_id uuid REFERENCES public.notes(id) ON DELETE SET NULL,
  created_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  tokens_used integer,
  model text,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.25 about_me_files
-- -----------------------------------------------------------------------------
-- Files uploaded as context for AI agents (similar to Claude project files).

CREATE TABLE public.about_me_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'docx', 'xlsx', 'markdown', 'txt')),
  file_size integer,
  storage_path text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('assessments', 'feedback', 'inspiration', 'research', 'general')),
  agent_access text[] DEFAULT ARRAY[]::text[],
  description text,
  extracted_content text,
  is_assessment boolean DEFAULT false,
  assessment_type text CHECK (assessment_type IN ('self_compassion', 'values_alignment', 'executive_function', 'strengths')),
  assessment_date date,
  extracted_insights jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.26 agent_instructions
-- -----------------------------------------------------------------------------
-- Custom instructions per AI agent type.

CREATE TABLE public.agent_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  agent_type text NOT NULL CHECK (agent_type IN ('executive-coach', 'research-assistant', 'therapist', 'pattern-analyst')),
  instructions text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, agent_type)
);

-- -----------------------------------------------------------------------------
-- 4.27 token_usage
-- -----------------------------------------------------------------------------
-- Per-request token usage tracking for cost monitoring.

CREATE TABLE public.token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  agent_type text NOT NULL,
  task_type text NOT NULL,
  model_used text NOT NULL,
  conversation_id uuid REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cached_response boolean DEFAULT false,
  input_cost_usd numeric(10,6) DEFAULT 0,
  output_cost_usd numeric(10,6) DEFAULT 0,
  total_cost_usd numeric(10,6) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.28 token_usage_daily
-- -----------------------------------------------------------------------------
-- Daily aggregated token usage for fast dashboard queries.

CREATE TABLE public.token_usage_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  usage_date date NOT NULL,
  pattern_analyst_input_tokens integer DEFAULT 0,
  pattern_analyst_output_tokens integer DEFAULT 0,
  research_assistant_input_tokens integer DEFAULT 0,
  research_assistant_output_tokens integer DEFAULT 0,
  executive_coach_input_tokens integer DEFAULT 0,
  executive_coach_output_tokens integer DEFAULT 0,
  therapist_input_tokens integer DEFAULT 0,
  therapist_output_tokens integer DEFAULT 0,
  total_input_tokens integer DEFAULT 0,
  total_output_tokens integer DEFAULT 0,
  total_cost_usd numeric(10,4) DEFAULT 0,
  cache_hits integer DEFAULT 0,
  total_requests integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

-- -----------------------------------------------------------------------------
-- 4.29 ai_response_cache
-- -----------------------------------------------------------------------------
-- Caches AI responses to avoid redundant API calls.

CREATE TABLE public.ai_response_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  cache_key text NOT NULL,
  task_type text NOT NULL,
  context_hash text NOT NULL,
  response_content text NOT NULL,
  model_used text NOT NULL,
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  hit_count integer DEFAULT 0,
  last_accessed timestamptz DEFAULT now(),
  UNIQUE(user_id, cache_key)
);

-- -----------------------------------------------------------------------------
-- 4.30 computed_patterns
-- -----------------------------------------------------------------------------
-- Pre-computed patterns recalculated daily for token efficiency.

CREATE TABLE public.computed_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pattern_type text NOT NULL,
  computation_date date NOT NULL,
  pattern_data jsonb NOT NULL,
  source_data_hash text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, pattern_type, computation_date)
);

-- -----------------------------------------------------------------------------
-- 4.31 context_summaries
-- -----------------------------------------------------------------------------
-- Cached summaries for expensive context that changes infrequently.

CREATE TABLE public.context_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  context_type text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  summary_content text NOT NULL,
  source_data_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE(user_id, context_type, period_start, period_end)
);

-- -----------------------------------------------------------------------------
-- 4.32 executive_function_scores
-- -----------------------------------------------------------------------------
-- Quarterly executive function assessment scores for trend visualization.
-- 12 skills scored 0-21 each; total_score allows up to 252 for backwards compat.

CREATE TABLE public.executive_function_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assessment_date date NOT NULL,
  total_score integer NOT NULL CHECK (total_score >= 0 AND total_score <= 252),
  response_inhibition integer CHECK (response_inhibition >= 0 AND response_inhibition <= 21),
  working_memory integer CHECK (working_memory >= 0 AND working_memory <= 21),
  emotional_control integer CHECK (emotional_control >= 0 AND emotional_control <= 21),
  task_initiation integer CHECK (task_initiation >= 0 AND task_initiation <= 21),
  sustained_attention integer CHECK (sustained_attention >= 0 AND sustained_attention <= 21),
  planning_prioritization integer CHECK (planning_prioritization >= 0 AND planning_prioritization <= 21),
  organization integer CHECK (organization >= 0 AND organization <= 21),
  time_management integer CHECK (time_management >= 0 AND time_management <= 21),
  flexibility integer CHECK (flexibility >= 0 AND flexibility <= 21),
  metacognition integer CHECK (metacognition >= 0 AND metacognition <= 21),
  goal_directed_persistence integer CHECK (goal_directed_persistence >= 0 AND goal_directed_persistence <= 21),
  stress_tolerance integer CHECK (stress_tolerance >= 0 AND stress_tolerance <= 21),
  source_file text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, assessment_date)
);

-- -----------------------------------------------------------------------------
-- 4.33 assessment_reminders
-- -----------------------------------------------------------------------------
-- Tracks when assessments were last taken and when to remind the user.

CREATE TABLE public.assessment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assessment_type text NOT NULL CHECK (assessment_type IN ('values_alignment', 'strengths', 'self_compassion', 'executive_function')),
  last_taken_date date,
  next_reminder_date date,
  reminder_frequency_days integer DEFAULT 90,
  dismissed_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, assessment_type)
);

-- -----------------------------------------------------------------------------
-- 4.34 self_compassion_scores
-- -----------------------------------------------------------------------------
-- Self-compassion assessment with 6 subscales + overall score (1.0 - 5.0).

CREATE TABLE public.self_compassion_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assessment_date date NOT NULL,
  overall_score decimal(3,2) NOT NULL CHECK (overall_score >= 1.0 AND overall_score <= 5.0),
  self_kindness decimal(3,2) CHECK (self_kindness >= 1.0 AND self_kindness <= 5.0),
  common_humanity decimal(3,2) CHECK (common_humanity >= 1.0 AND common_humanity <= 5.0),
  mindfulness decimal(3,2) CHECK (mindfulness >= 1.0 AND mindfulness <= 5.0),
  self_judgment decimal(3,2) CHECK (self_judgment >= 1.0 AND self_judgment <= 5.0),
  isolation decimal(3,2) CHECK (isolation >= 1.0 AND isolation <= 5.0),
  over_identification decimal(3,2) CHECK (over_identification >= 1.0 AND over_identification <= 5.0),
  raw_responses jsonb,
  source text DEFAULT 'self-assessment',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, assessment_date)
);

-- -----------------------------------------------------------------------------
-- 4.35 strengths_responses
-- -----------------------------------------------------------------------------
-- Professional strengths rated on Performance, Energy, Frequency (1-5).

CREATE TABLE public.strengths_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assessment_date date NOT NULL,
  strength_name text NOT NULL,
  strength_family text CHECK (strength_family IN ('executing', 'influencing', 'relating', 'thinking', 'being', 'communicating', 'motivating')),
  performance integer CHECK (performance >= 1 AND performance <= 5),
  energy integer CHECK (energy >= 1 AND energy <= 5),
  frequency integer CHECK (frequency >= 1 AND frequency <= 5),
  quadrant text CHECK (quadrant IN ('realized', 'unrealized', 'learned', 'weakness')),
  rank_in_quadrant integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, assessment_date, strength_name)
);

-- -----------------------------------------------------------------------------
-- 4.36 values_alignment_results
-- -----------------------------------------------------------------------------
-- Values alignment assessment: core values, behaviors, and living aligned score.

CREATE TABLE public.values_alignment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assessment_date date NOT NULL,
  value_1 text,
  value_2 text,
  value_3 text,
  value_1_supporting text[],
  value_1_slippery text[],
  value_2_supporting text[],
  value_2_slippery text[],
  value_3_supporting text[],
  value_3_slippery text[],
  early_warning_signs text[],
  living_aligned_score integer CHECK (living_aligned_score >= 0 AND living_aligned_score <= 100),
  living_aligned_trend text CHECK (living_aligned_trend IN ('up', 'down', 'stable')),
  living_aligned_highlights text[],
  living_aligned_concerns text[],
  realignment_actions text[] DEFAULT '{}',
  storage_path text,
  pattern_insights jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, assessment_date)
);

-- -----------------------------------------------------------------------------
-- 4.37 assessment_insights
-- -----------------------------------------------------------------------------
-- AI-generated cross-assessment insights from the Pattern Analyzer.

CREATE TABLE public.assessment_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  source_assessments text[] NOT NULL,
  insight_type text NOT NULL CHECK (insight_type IN ('cross_correlation', 'pattern_connection', 'strength_leverage', 'warning_indicator', 'progress_milestone')),
  content text NOT NULL,
  severity text CHECK (severity IN ('gentle', 'notable', 'significant')),
  trigger_context text[],
  generated_at timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.38 folder_views
-- -----------------------------------------------------------------------------
-- Named views per folder with display configuration (database, kanban, gallery).

CREATE TABLE public.folder_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default View',
  view_type text NOT NULL DEFAULT 'database' CHECK (view_type IN ('database', 'kanban', 'gallery')),
  config jsonb NOT NULL DEFAULT '{"sortField": "updated_at", "sortDirection": "desc", "groupByField": null, "filters": [], "visibleColumns": ["title", "note_type", "tags", "is_starred", "updated_at"]}'::jsonb,
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.39 folder_templates
-- -----------------------------------------------------------------------------
-- Templates per folder for creating new notes with defaults.

CREATE TABLE public.folder_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default Template',
  default_content text,
  default_note_type text DEFAULT 'document',
  default_label text,
  ai_prompt text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- =============================================================================
-- 5. INDEXES
-- =============================================================================

-- profiles: no additional indexes needed (PK covers lookups)

-- notes
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_type ON public.notes(note_type);
CREATE INDEX idx_notes_created ON public.notes(created_at DESC);
CREATE INDEX idx_notes_folder ON public.notes(folder_id);
CREATE INDEX idx_notes_starred ON public.notes(is_starred) WHERE is_starred = true;

-- tasks
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_due ON public.tasks(due_date);
CREATE INDEX idx_tasks_completed ON public.tasks(completed);
CREATE INDEX idx_tasks_external ON public.tasks(external_id);

-- time_blocks
CREATE INDEX idx_time_blocks_user_id ON public.time_blocks(user_id);
CREATE INDEX idx_time_blocks_started ON public.time_blocks(started_at DESC);

-- journal_entries
CREATE INDEX idx_journal_user_id ON public.journal_entries(user_id);
CREATE INDEX idx_journal_date ON public.journal_entries(entry_date DESC);
CREATE INDEX idx_journal_mood ON public.journal_entries(mood_label);

-- health_metrics
CREATE INDEX idx_health_user_id ON public.health_metrics(user_id);
CREATE INDEX idx_health_date ON public.health_metrics(metric_date DESC);
CREATE INDEX idx_health_metrics_user_date ON public.health_metrics(user_id, date DESC);

-- meeting_notes
CREATE INDEX idx_meeting_user_id ON public.meeting_notes(user_id);
CREATE INDEX idx_meeting_scheduled ON public.meeting_notes(scheduled_start);
CREATE INDEX idx_meeting_notes_transcription_status ON public.meeting_notes(transcription_status) WHERE transcription_status != 'idle';

-- ai_insights
CREATE INDEX idx_insights_user_id ON public.ai_insights(user_id);
CREATE INDEX idx_insights_date ON public.ai_insights(insight_date DESC);

-- cue_instances
CREATE INDEX idx_cue_instances_user ON public.cue_instances(user_id);
CREATE INDEX idx_cue_instances_fired ON public.cue_instances(fired_at DESC);

-- audit_log
CREATE INDEX idx_audit_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);

-- strength_assessments
CREATE INDEX idx_strength_assessments_user ON public.strength_assessments(user_id);
CREATE INDEX idx_strength_assessments_date ON public.strength_assessments(assessment_date DESC);

-- sync_log
CREATE INDEX idx_sync_log_user ON public.sync_log(user_id);
CREATE INDEX idx_sync_log_provider ON public.sync_log(provider);
CREATE INDEX idx_sync_log_created ON public.sync_log(created_at DESC);

-- calendar_events
CREATE INDEX idx_calendar_events_user ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_start ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_google_id ON public.calendar_events(google_event_id);

-- workouts
CREATE INDEX idx_workouts_user_date ON public.workouts(user_id, date DESC);
CREATE INDEX idx_workouts_meditation ON public.workouts(user_id, is_meditation) WHERE is_meditation = true;
CREATE INDEX idx_workouts_activity ON public.workouts(user_id, activity_type);

-- daily_commitments
CREATE INDEX idx_daily_commitments_user_date ON public.daily_commitments(user_id, commitment_date DESC);

-- meditation_logs
CREATE INDEX idx_meditation_logs_user_date ON public.meditation_logs(user_id, date DESC);

-- folders
CREATE INDEX idx_folders_user ON public.folders(user_id);
CREATE INDEX idx_folders_parent ON public.folders(parent_id);
CREATE INDEX idx_folders_type ON public.folders(folder_type);

-- ai_context_collections
CREATE INDEX idx_ai_context_collections_user ON public.ai_context_collections(user_id);

-- ai_context_notes
CREATE INDEX idx_ai_context_notes_collection ON public.ai_context_notes(collection_id);
CREATE INDEX idx_ai_context_notes_note ON public.ai_context_notes(note_id);

-- ai_conversations
CREATE INDEX idx_ai_conversations_context ON public.ai_conversations(context_type, context_id);

-- about_me_files
CREATE INDEX idx_about_me_files_user ON public.about_me_files(user_id);
CREATE INDEX idx_about_me_files_category ON public.about_me_files(user_id, category);
CREATE INDEX idx_about_me_files_agents ON public.about_me_files USING GIN(agent_access);
CREATE INDEX idx_about_me_files_assessment ON public.about_me_files(user_id, is_assessment, assessment_type) WHERE is_assessment = true;

-- agent_instructions
CREATE INDEX idx_agent_instructions_user ON public.agent_instructions(user_id, agent_type);

-- token_usage
CREATE INDEX idx_token_usage_user_date ON public.token_usage(user_id, created_at DESC);
CREATE INDEX idx_token_usage_agent ON public.token_usage(user_id, agent_type);

-- token_usage_daily
CREATE INDEX idx_token_usage_daily_lookup ON public.token_usage_daily(user_id, usage_date DESC);

-- ai_response_cache
CREATE INDEX idx_cache_key ON public.ai_response_cache(user_id, cache_key);
CREATE INDEX idx_cache_expires ON public.ai_response_cache(expires_at);

-- computed_patterns
CREATE INDEX idx_patterns_lookup ON public.computed_patterns(user_id, pattern_type, computation_date DESC);

-- context_summaries
CREATE INDEX idx_context_lookup ON public.context_summaries(user_id, context_type, period_end DESC);

-- executive_function_scores
CREATE INDEX idx_ef_scores_user_date ON public.executive_function_scores(user_id, assessment_date DESC);

-- assessment_reminders
CREATE INDEX idx_reminders_user_due ON public.assessment_reminders(user_id, next_reminder_date) WHERE next_reminder_date IS NOT NULL;

-- self_compassion_scores
CREATE INDEX idx_sc_scores_user_date ON public.self_compassion_scores(user_id, assessment_date DESC);

-- strengths_responses
CREATE INDEX idx_strengths_user_date ON public.strengths_responses(user_id, assessment_date DESC);
CREATE INDEX idx_strengths_quadrant ON public.strengths_responses(user_id, assessment_date, quadrant);

-- values_alignment_results
CREATE INDEX idx_values_user_date ON public.values_alignment_results(user_id, assessment_date DESC);

-- assessment_insights
CREATE INDEX idx_insights_user_active ON public.assessment_insights(user_id, generated_at DESC) WHERE is_dismissed = FALSE;
CREATE INDEX idx_insights_trigger ON public.assessment_insights USING GIN(trigger_context);

-- folder_views
CREATE INDEX idx_folder_views_folder ON public.folder_views(folder_id);
CREATE INDEX idx_folder_views_user ON public.folder_views(user_id);
CREATE INDEX idx_folder_views_default ON public.folder_views(folder_id, is_default) WHERE is_default = true;

-- folder_templates
CREATE INDEX idx_folder_templates_folder ON public.folder_templates(folder_id);
CREATE INDEX idx_folder_templates_user ON public.folder_templates(user_id);
CREATE INDEX idx_folder_templates_active ON public.folder_templates(folder_id, is_active) WHERE is_active = true;


-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strength_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cue_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cue_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strength_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meditation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_context_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_context_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_me_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.computed_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_function_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_compassion_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strengths_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.values_alignment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_templates ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- profiles: separate SELECT and UPDATE policies (no INSERT needed; trigger does it)
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- strength_definitions: public read-only reference table
-- ---------------------------------------------------------------------------

CREATE POLICY "Anyone can read strength_definitions"
  ON public.strength_definitions FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- Tables with simple "Users can manage own" FOR ALL policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can manage own folders"
  ON public.folders FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notes"
  ON public.notes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tasks"
  ON public.tasks FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own time_blocks"
  ON public.time_blocks FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own journal_entries"
  ON public.journal_entries FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own health_metrics"
  ON public.health_metrics FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own meeting_notes"
  ON public.meeting_notes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own ai_insights"
  ON public.ai_insights FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cue_rules"
  ON public.cue_rules FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cue_instances"
  ON public.cue_instances FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own integration_tokens"
  ON public.integration_tokens FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own strength_assessments"
  ON public.strength_assessments FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own calendar_events"
  ON public.calendar_events FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own workouts"
  ON public.workouts FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own meditation logs"
  ON public.meditation_logs FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own ai_context_collections"
  ON public.ai_context_collections FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own ai_conversations"
  ON public.ai_conversations FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own about me files"
  ON public.about_me_files FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own agent instructions"
  ON public.agent_instructions FOR ALL
  USING (auth.uid() = user_id);

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

CREATE POLICY "Users can manage own folder_views"
  ON public.folder_views FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own folder_templates"
  ON public.folder_templates FOR ALL
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- audit_log: SELECT only
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own audit_log"
  ON public.audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- sync_log: separate SELECT and INSERT
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own sync_log"
  ON public.sync_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync_log"
  ON public.sync_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- daily_commitments: separate SELECT, INSERT, UPDATE
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own commitments"
  ON public.daily_commitments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own commitments"
  ON public.daily_commitments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own commitments"
  ON public.daily_commitments FOR UPDATE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- token_usage: separate SELECT and INSERT
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own token usage"
  ON public.token_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own token usage"
  ON public.token_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- ai_context_notes: uses EXISTS subquery to check collection ownership
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can manage own ai_context_notes"
  ON public.ai_context_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_context_collections c
      WHERE c.id = ai_context_notes.collection_id
      AND c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- ai_messages: uses IN subquery on conversation_id
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can manage own ai_messages"
  ON public.ai_messages FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- executive_function_scores: separate SELECT, INSERT, UPDATE, DELETE
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own EF scores"
  ON public.executive_function_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own EF scores"
  ON public.executive_function_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own EF scores"
  ON public.executive_function_scores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own EF scores"
  ON public.executive_function_scores FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- assessment_reminders: separate SELECT, INSERT, UPDATE, DELETE
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own reminders"
  ON public.assessment_reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
  ON public.assessment_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON public.assessment_reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON public.assessment_reminders FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- self_compassion_scores: separate SELECT, INSERT, UPDATE, DELETE
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own SC scores"
  ON public.self_compassion_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own SC scores"
  ON public.self_compassion_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own SC scores"
  ON public.self_compassion_scores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own SC scores"
  ON public.self_compassion_scores FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- strengths_responses: separate SELECT, INSERT, UPDATE, DELETE
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own strengths"
  ON public.strengths_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strengths"
  ON public.strengths_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strengths"
  ON public.strengths_responses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strengths"
  ON public.strengths_responses FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- values_alignment_results: separate SELECT, INSERT, UPDATE, DELETE
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own values"
  ON public.values_alignment_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own values"
  ON public.values_alignment_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own values"
  ON public.values_alignment_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own values"
  ON public.values_alignment_results FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- assessment_insights: separate SELECT, INSERT, UPDATE, DELETE
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own insights"
  ON public.assessment_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights"
  ON public.assessment_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
  ON public.assessment_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights"
  ON public.assessment_insights FOR DELETE
  USING (auth.uid() = user_id);


-- =============================================================================
-- 7. TRIGGERS
-- =============================================================================

-- Auto-create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-update updated_at on core tables
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.meeting_notes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.cue_rules
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.integration_tokens
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Folders use a differently-named trigger
CREATE TRIGGER folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- AI context collections
CREATE TRIGGER ai_context_collections_updated_at
  BEFORE UPDATE ON public.ai_context_collections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- About me files and agent instructions use update_updated_at_column()
CREATE TRIGGER update_about_me_files_updated_at
  BEFORE UPDATE ON public.about_me_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_instructions_updated_at
  BEFORE UPDATE ON public.agent_instructions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Assessment tables use update_assessment_updated_at()
CREATE TRIGGER update_ef_scores_updated_at
  BEFORE UPDATE ON public.executive_function_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_assessment_updated_at();

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.assessment_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_assessment_updated_at();

CREATE TRIGGER update_sc_scores_updated_at
  BEFORE UPDATE ON public.self_compassion_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_assessment_updated_at();

CREATE TRIGGER update_values_updated_at
  BEFORE UPDATE ON public.values_alignment_results
  FOR EACH ROW EXECUTE FUNCTION public.update_assessment_updated_at();

-- Folder views and templates
CREATE TRIGGER folder_views_updated_at
  BEFORE UPDATE ON public.folder_views
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER folder_templates_updated_at
  BEFORE UPDATE ON public.folder_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- =============================================================================
-- 8. STORAGE POLICIES
-- =============================================================================
-- NOTE: The 'about-me-files' storage bucket must be created manually in the
-- Supabase Dashboard before these policies take effect:
--   Storage -> New Bucket -> Name: "about-me-files" -> Private (not public)
--
-- These policies ensure users can only access files in their own folder
-- (the folder name matches their auth.uid()).

CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'about-me-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'about-me-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'about-me-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
