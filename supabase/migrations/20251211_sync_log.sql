-- ============================================
-- SYNC LOG TABLE
-- ============================================
-- Tracks sync operations for debugging and monitoring
-- Helps diagnose sync issues and measure performance

create table public.sync_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- Sync metadata
  provider text not null, -- 'ticktick', 'google_calendar', 'whoop'
  direction text not null check (direction in ('pull', 'push', 'both')),
  trigger_type text not null check (trigger_type in ('manual', 'scheduled', 'page_focus', 'action', 'user_action', 'initial_connect')),
  
  -- Results
  status text not null check (status in ('started', 'success', 'partial', 'failed')),
  pulled_count integer default 0,
  pushed_count integer default 0,
  conflict_count integer default 0,
  
  -- Timing
  started_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  duration_ms integer,
  
  -- Error tracking
  error_message text,
  error_details jsonb default '{}',
  
  created_at timestamp with time zone default now()
);

-- Indexes
create index idx_sync_log_user on public.sync_log(user_id);
create index idx_sync_log_provider on public.sync_log(provider);
create index idx_sync_log_created on public.sync_log(created_at desc);

-- RLS
alter table public.sync_log enable row level security;

create policy "Users can view own sync_log" 
  on public.sync_log for select 
  using (auth.uid() = user_id);

create policy "Users can insert own sync_log" 
  on public.sync_log for insert 
  with check (auth.uid() = user_id);
