-- ============================================
-- CALENDAR EVENTS TABLE (idempotent)
-- ============================================
-- Stores Google Calendar events locally

create table if not exists public.calendar_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- Google Calendar IDs
  google_event_id text not null,
  google_calendar_id text not null default 'primary',
  
  -- Event data
  title text not null,
  description text,
  location text,
  
  -- Timing
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  all_day boolean default false,
  
  -- Attendees (stored as JSON array of emails)
  attendees jsonb default '[]',
  organizer_email text,
  
  -- Status
  status text default 'confirmed',
  
  -- Meeting link
  meeting_link text,
  
  -- Sync metadata
  sync_status text default 'synced',
  last_synced_at timestamp with time zone default now(),
  google_updated_at timestamp with time zone,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- One event per google_event_id per user
  unique(user_id, google_event_id)
);

-- Indexes
create index if not exists idx_calendar_events_user on public.calendar_events(user_id);
create index if not exists idx_calendar_events_start on public.calendar_events(start_time);
create index if not exists idx_calendar_events_google_id on public.calendar_events(google_event_id);

-- RLS
alter table public.calendar_events enable row level security;

drop policy if exists "Users can manage own calendar_events" on public.calendar_events;
create policy "Users can manage own calendar_events" 
  on public.calendar_events for all 
  using (auth.uid() = user_id);

-- Trigger for updated_at
drop trigger if exists set_updated_at on public.calendar_events;
create trigger set_updated_at
  before update on public.calendar_events
  for each row execute procedure public.handle_updated_at();
