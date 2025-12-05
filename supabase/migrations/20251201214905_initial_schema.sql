-- ============================================
-- CHRONONAUT INITIAL SCHEMA (Version 1.0 - MVP)
-- ============================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================
-- Every user gets a profile row automatically (trigger below)
-- Stores preferences, security keys, onboarding state

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  timezone text default 'America/New_York',
  
  -- ADHD-specific settings
  core_values text[] default '{}',
  wind_down_time time default '18:00',
  max_focus_minutes integer default 90,
  
  -- Security (for E2E encryption)
  encryption_key_hash text,
  pin_hash text,
  
  -- Onboarding
  onboarding_completed boolean default false,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- 2. ENUMS (custom types used across tables)
-- ============================================
-- Enums enforce valid values at database level

create type note_type as enum ('meeting', 'document', 'assessment', 'quick capture');
create type assessment_type as enum ('self_compassion', 'values_alignment', 'strengths_profile', 'executive_skills');
create type mood_label as enum (
  'Threatened', 'Stressed', 'Unfocused', 'Rejected',
  'Creative', 'Adventurous', 'Angry', 'Manic',
  'Calm', 'Acceptance', 'Socially Connected', 'Romantic'
);
create type meeting_type as enum (
  'work_internal', 'work_external',  'work_one_on_one', 
  'personal_networking', 'personal_therapy', 'personal_coaching'
);
create type focus_mode as enum (
  'admin', 'research', 'writing', 'meeting_prep', 'toastmasters'
);
create type cue_type as enum (
  'meeting_proximity', 'rabbit_hole', 'task_mismatch', 
  'break_reminder', 'wind_down'
);
-- ============================================
-- 2B. STRENGTH DEFINITIONS (Reference Table)
-- ============================================
-- Static table: 60 strengths from Strengths Profile assessment
-- Populated once with 60 strengths, never changes

create table public.strength_definitions (
  id serial primary key,
  name text not null unique,
  family text not null check (family in ('Being', 'Communicating', 'Motivating', 'Relating', 'Thinking')),
  description text
);

-- ============================================
-- 2C. STRENGTH ASSESSMENTS (User Results)
-- ============================================
-- Tracks your strength quadrant placements over time
-- Enables trending: "How has Curiosity moved across assessments?"

create table public.strength_assessments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  assessment_date date not null,
  strength_name text references public.strength_definitions(name) not null,
  quadrant text not null check (quadrant in ('Realized', 'Unrealized', 'Learned', 'Weakness')),
  rank_in_quadrant integer,
  created_at timestamp with time zone default now()
);

-- ============================================
-- 3. NOTES (including assessments)
-- ============================================
-- Central hub for all notes: meeting notes, documents, 'assessment', 'quick capture'
-- Assessment type stores: Self-Compassion, Values Alignment, Strengths Profile, Executive Skills scores

create table public.notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  title text not null,
  content text,
  note_type note_type default 'document',
  tags text[] default '{}',
  
  -- For calendar-linked notes
  calendar_event_id text,
  
  -- For assessment notes (Self-Compassion, Values Alignment, Strengths Profile, Executive Skills)
  assessment_type assessment_type,
  assessment_score numeric(5,2),

    -- Location (for map view)
  location_name text,
  location_lat numeric(10,7),
  location_lng numeric(10,7),
  
  -- Photo (for quick capture)
  photo_url text,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- 4. TASKS (synced with TickTick)
-- ============================================
-- Bidirectional sync: changes here push to TickTick and vice versa

create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- TickTick sync
  ticktick_id text unique,
  ticktick_list_id text,
  sync_status text default 'synced',
  last_synced_at timestamp with time zone,
  
  -- Task data
  title text not null,
  content text,
  priority integer check (priority between 0 and 4) default 0,
  due_date timestamp with time zone,
  completed boolean default false,
  completed_at timestamp with time zone,
  
  -- Time tracking
  estimated_minutes integer,
  actual_minutes integer,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- 5. TIME BLOCKS (Focus sessions)
-- ============================================
-- Tracks focus sessions with mode, duration, interruptions

create table public.time_blocks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete set null,
  
  focus_mode focus_mode not null,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone,
  planned_minutes integer,
  
  -- Session quality
  interruption_count integer default 0,
  completed boolean default false,
  
  created_at timestamp with time zone default now()
);

-- ============================================
-- 6. JOURNAL ENTRIES (E2E Encrypted)
-- ============================================
-- Day One-style journal with AI-inferred mood/energy
-- Content fields are encrypted client-side before storage

create table public.journal_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  entry_date date not null,
  
  -- Encrypted content (client-side AES-256-GCM)
  encrypted_happened text,
  encrypted_feelings text,
  encrypted_grateful text,
  encrypted_ai_insights text,
  
  -- Unencrypted (for analytics/queries)
  location_name text,
  location_lat numeric(10,7),
  location_lng numeric(10,7),
  photo_url text,
  tags text[] default '{}',
  
  -- AI-inferred (can be overridden)
  mood_label mood_label,
  mood_override boolean default false,
  energy_rating integer check (energy_rating between 1 and 10),
  energy_override boolean default false,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- One entry per day per user
  unique(user_id, entry_date)
);

-- ============================================
-- 7. HEALTH METRICS (Whoop data)
-- ============================================
-- Daily sync from Whoop API (6 AM cron job)

create table public.health_metrics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  metric_date date not null,
  
  -- Whoop recovery data
  recovery_score numeric(5,2),
  hrv_rmssd numeric(6,2),
  resting_hr numeric(5,2),
  
  -- Sleep data
  sleep_performance numeric(5,2),
  sleep_duration_minutes integer,
  
  -- Strain data
  strain_score numeric(5,2),
  
  created_at timestamp with time zone default now(),
  
  -- One row per day per user
  unique(user_id, metric_date)
);

-- ============================================
-- 8. MEETING NOTES (Partially Encrypted)
-- ============================================
-- Meeting screen data: some fields encrypted, some queryable
-- Encryption badge shown in UI for encrypted meetings

create table public.meeting_notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  note_id uuid references public.notes(id) on delete set null,
  
  -- Unencrypted (queryable for dashboard/search)
  title text not null,
  attendees text[] default '{}',
  scheduled_start timestamp with time zone,
  scheduled_end timestamp with time zone,
  meeting_type meeting_type default 'work_internal',
  risk_level integer check (risk_level between 1 and 5) default 3,
  action_items text[] default '{}',
  
  -- Encrypted (client-side)
  encrypted_prep_notes text,
  encrypted_meeting_notes text,
  encrypted_transcript text,
  encrypted_ai_summary text,
  encrypted_coach_feedback text,
  
  -- Meeting settings
  coach_enabled boolean default true,
  recording_enabled boolean default false,
  
  -- Timing
  actual_start timestamp with time zone,
  actual_end timestamp with time zone,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- 9. AI INSIGHTS (Pattern Analysis Results)
-- ============================================
-- Stores output from Pattern Analyst agent
-- Powers the homepage dashboard containing daily metrics, a Claude-generated summary generated each morning to guide user that day - titled "Rise and Shine", and a weekly Claude-generated summary & analysis titled "Week In Review"

create table public.ai_insights (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  insight_date date not null,
  insight_type text not null,
  
  -- Calculated metrics
  energy_score numeric(5,2) check (energy_score >= 0 and energy_score <= 100),
  -- Raw 0-5 converted to 0-100% in schema
  self_compassion_score numeric(5,2) check (self_compassion_score >= 0 and self_compassion_score <= 100),
  values_alignment_score numeric(5,2) check (values_alignment_score >= 0 and values_alignment_score <= 100),
  -- Strengths Profile: 5 family scores (each 0-100%)
  strengths_being numeric(5,2) check (strengths_being >= 0 and strengths_being <= 100),
  strengths_communicating numeric(5,2) check (strengths_communicating >= 0 and strengths_communicating <= 100),
  strengths_motivating numeric(5,2) check (strengths_motivating >= 0 and strengths_motivating <= 100),
  strengths_relating numeric(5,2) check (strengths_relating >= 0 and strengths_relating <= 100),
  strengths_thinking numeric(5,2) check (strengths_thinking >= 0 and strengths_thinking <= 100),
  -- Executive Skills: Raw 0-84 converted to 0-100% in schema
  executive_skills_score numeric(5,2) check (executive_skills_score >= 0 and executive_skills_score <= 100),
  
  -- AI-generated content
  summary text,
  recommendations text[] default '{}',
  patterns_detected text[] default '{}',
  
-- Source data references
  journal_ids uuid[] default '{}',
  health_metric_ids uuid[] default '{}',
  meeting_note_ids uuid[] default '{}',
  strength_assessment_ids uuid[] default '{}',
  note_ids uuid[] default '{}',
  
  created_at timestamp with time zone default now()
);

-- ============================================
-- 10. CUE RULES (Intervention Configuration)
-- ============================================
-- Defines when/how cues fire (meeting alerts, break reminders, etc.)

create table public.cue_rules (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  cue_type cue_type not null,
  enabled boolean default true,
  
  -- Trigger conditions (JSON for flexibility)
  conditions jsonb default '{}',
  
  -- What happens when triggered
  message_template text,
  action_type text,
  
  -- Timing
  cooldown_minutes integer default 30,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- 11. CUE INSTANCES (Fired Cue Log)
-- ============================================
-- Tracks every time a cue was shown and how user responded
-- Feeds back into Pattern Analyst for learning

create table public.cue_instances (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  cue_rule_id uuid references public.cue_rules(id) on delete cascade not null,
  
  fired_at timestamp with time zone default now(),
  
  -- Context when fired
  context jsonb default '{}',
  
  -- User response
  acknowledged boolean default false,
  acknowledged_at timestamp with time zone,
  action_taken text,
  
  -- Effectiveness tracking
  was_helpful boolean
);

-- ============================================
-- 12. INTEGRATION TOKENS (OAuth Storage)
-- ============================================
-- Encrypted storage for TickTick, Whoop, Google tokens

create table public.integration_tokens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  provider text not null,
  
  -- Encrypted tokens (server-side encryption)
  encrypted_access_token text not null,
  encrypted_refresh_token text,
  
  -- Token metadata
  token_type text,
  expires_at timestamp with time zone,
  scopes text[] default '{}',
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- One token per provider per user
  unique(user_id, provider)
);

-- ============================================
-- 13. AUDIT LOG (Security Tracking)
-- ============================================
-- Tracks sensitive actions for security review

create table public.audit_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  
  action text not null,
  resource_type text,
  resource_id uuid,
  
  -- Request metadata
  ip_address inet,
  user_agent text,
  
  -- What changed
  details jsonb default '{}',
  
  created_at timestamp with time zone default now()
);

-- ============================================
-- INDEXES (for query performance)
-- ============================================
-- Add indexes on columns we'll filter/sort by frequently

create index idx_notes_user_id on public.notes(user_id);
create index idx_notes_type on public.notes(note_type);
create index idx_notes_created on public.notes(created_at desc);

create index idx_tasks_user_id on public.tasks(user_id);
create index idx_tasks_due on public.tasks(due_date);
create index idx_tasks_completed on public.tasks(completed);
create index idx_tasks_ticktick on public.tasks(ticktick_id);

create index idx_time_blocks_user_id on public.time_blocks(user_id);
create index idx_time_blocks_started on public.time_blocks(started_at desc);

create index idx_journal_user_id on public.journal_entries(user_id);
create index idx_journal_date on public.journal_entries(entry_date desc);
create index idx_journal_mood on public.journal_entries(mood_label);

create index idx_health_user_id on public.health_metrics(user_id);
create index idx_health_date on public.health_metrics(metric_date desc);

create index idx_meeting_user_id on public.meeting_notes(user_id);
create index idx_meeting_scheduled on public.meeting_notes(scheduled_start);

create index idx_insights_user_id on public.ai_insights(user_id);
create index idx_insights_date on public.ai_insights(insight_date desc);

create index idx_cue_instances_user on public.cue_instances(user_id);
create index idx_cue_instances_fired on public.cue_instances(fired_at desc);

create index idx_audit_user on public.audit_log(user_id);
create index idx_audit_created on public.audit_log(created_at desc);

create index idx_strength_assessments_user on public.strength_assessments(user_id);
create index idx_strength_assessments_date on public.strength_assessments(assessment_date desc);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Users can only access their own data
-- This is CRITICAL for multi-user security

alter table public.profiles enable row level security;
alter table public.notes enable row level security;
alter table public.tasks enable row level security;
alter table public.time_blocks enable row level security;
alter table public.journal_entries enable row level security;
alter table public.health_metrics enable row level security;
alter table public.meeting_notes enable row level security;
alter table public.ai_insights enable row level security;
alter table public.cue_rules enable row level security;
alter table public.cue_instances enable row level security;
alter table public.integration_tokens enable row level security;
alter table public.audit_log enable row level security;
alter table public.strength_definitions enable row level security;

create policy "Anyone can read strength_definitions"
  on public.strength_definitions for select
  using (true);

alter table public.strength_assessments enable row level security;

create policy "Users can manage own strength_assessments" 
  on public.strength_assessments for all 
  using (auth.uid() = user_id);

-- Profiles: users can read/update their own profile
create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- Generic policy for all other tables: full access to own data
create policy "Users can manage own notes" 
  on public.notes for all 
  using (auth.uid() = user_id);

create policy "Users can manage own tasks" 
  on public.tasks for all 
  using (auth.uid() = user_id);

create policy "Users can manage own time_blocks" 
  on public.time_blocks for all 
  using (auth.uid() = user_id);

create policy "Users can manage own journal_entries" 
  on public.journal_entries for all 
  using (auth.uid() = user_id);

create policy "Users can manage own health_metrics" 
  on public.health_metrics for all 
  using (auth.uid() = user_id);

create policy "Users can manage own meeting_notes" 
  on public.meeting_notes for all 
  using (auth.uid() = user_id);

create policy "Users can manage own ai_insights" 
  on public.ai_insights for all 
  using (auth.uid() = user_id);

create policy "Users can manage own cue_rules" 
  on public.cue_rules for all 
  using (auth.uid() = user_id);

create policy "Users can manage own cue_instances" 
  on public.cue_instances for all 
  using (auth.uid() = user_id);

create policy "Users can manage own integration_tokens" 
  on public.integration_tokens for all 
  using (auth.uid() = user_id);

create policy "Users can view own audit_log" 
  on public.audit_log for select 
  using (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at
  before update on public.notes
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at
  before update on public.tasks
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at
  before update on public.journal_entries
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at
  before update on public.meeting_notes
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at
  before update on public.cue_rules
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at
  before update on public.integration_tokens
  for each row execute procedure public.handle_updated_at();

-- ============================================
-- Tables: 14
-- Indexes: 20
-- RLS Policies: 15
-- Triggers: 9