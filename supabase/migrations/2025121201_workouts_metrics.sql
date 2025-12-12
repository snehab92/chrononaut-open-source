-- ============================================
-- WORKOUTS TABLE (idempotent)
-- ============================================
-- Stores individual workout sessions including meditation

create table if not exists public.workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- Whoop identifiers
  whoop_id text not null,
  
  -- Activity info
  activity_type text not null,
  sport_id integer,
  
  -- Timing
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone not null,
  total_minutes real not null,
  date date not null,
  
  -- Metrics
  strain_score real,
  avg_heart_rate integer,
  max_heart_rate integer,
  calories real,
  
  -- Heart rate zones (minutes in each zone)
  zone_1_minutes real default 0,
  zone_2_minutes real default 0,
  zone_3_minutes real default 0,
  zone_4_minutes real default 0,
  zone_5_minutes real default 0,
  
  -- Convenience flags
  is_meditation boolean default false,
  
  -- Sync metadata
  last_synced_at timestamp with time zone default now(),
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- One record per whoop workout per user
  unique(user_id, whoop_id)
);

-- Indexes
create index if not exists idx_workouts_user_date on public.workouts(user_id, date desc);
create index if not exists idx_workouts_meditation on public.workouts(user_id, is_meditation) where is_meditation = true;
create index if not exists idx_workouts_activity on public.workouts(user_id, activity_type);

-- RLS
alter table public.workouts enable row level security;

drop policy if exists "Users can manage own workouts" on public.workouts;
create policy "Users can manage own workouts" 
  on public.workouts for all 
  using (auth.uid() = user_id);

-- Trigger for updated_at
drop trigger if exists set_updated_at on public.workouts;
create trigger set_updated_at
  before update on public.workouts
  for each row execute procedure public.handle_updated_at();

-- ============================================
-- ALTER health_metrics for Whoop sync
-- ============================================
-- Add columns needed for our sync engine
-- (Original schema used different column names)

alter table public.health_metrics 
  add column if not exists date date,
  add column if not exists sleep_hours real,
  add column if not exists sleep_consistency integer,
  add column if not exists resting_heart_rate integer,
  add column if not exists whoop_cycle_id text,
  add column if not exists last_synced_at timestamp with time zone default now();

-- Copy data from old columns to new (safe to run multiple times)
update public.health_metrics 
set date = metric_date 
where date is null and metric_date is not null;

update public.health_metrics 
set sleep_hours = sleep_duration_minutes / 60.0 
where sleep_hours is null and sleep_duration_minutes is not null;

update public.health_metrics 
set resting_heart_rate = resting_hr::integer 
where resting_heart_rate is null and resting_hr is not null;

update public.health_metrics 
set sleep_consistency = sleep_performance::integer 
where sleep_consistency is null and sleep_performance is not null;

-- Index on new date column
create index if not exists idx_health_metrics_user_date on public.health_metrics(user_id, date desc);

-- Add unique constraint for upserts on health_metrics (idempotent)
do $ 
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'health_metrics_user_date_unique'
  ) then
    alter table public.health_metrics 
    add constraint health_metrics_user_date_unique 
    unique (user_id, date);
  end if;
end $;
