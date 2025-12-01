-- Diagnostic queries for Google Calendar integration
-- Run these in Supabase SQL Editor or via MCP once configured

-- 1. Check if integration_tokens table has Google Calendar entry
SELECT 
  id,
  user_id,
  provider,
  token_type,
  expires_at,
  scopes,
  created_at,
  updated_at,
  -- Check if tokens are present
  CASE
    WHEN access_token IS NOT NULL THEN 'Has access token'
    ELSE 'Missing access token'
  END as access_token_status,
  CASE
    WHEN refresh_token IS NOT NULL THEN 'Has refresh token'
    ELSE 'Missing refresh token'
  END as refresh_token_status,
  -- Check if expired
  CASE 
    WHEN expires_at IS NULL THEN 'No expiry set'
    WHEN expires_at < NOW() THEN 'EXPIRED'
    ELSE 'Valid'
  END as token_status
FROM integration_tokens
WHERE provider = 'google_calendar'
ORDER BY updated_at DESC;

-- 2. Check calendar_events table
SELECT 
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) as users_with_events,
  COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_events,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_events,
  MIN(start_time) as earliest_event,
  MAX(start_time) as latest_event,
  MAX(last_synced_at) as last_sync_time
FROM calendar_events;

-- 3. Check sync_log for Google Calendar
SELECT 
  id,
  user_id,
  provider,
  direction,
  trigger_type,
  status,
  pulled_count,
  pushed_count,
  conflict_count,
  error_message,
  error_details,
  completed_at
FROM sync_log
WHERE provider = 'google_calendar'
ORDER BY completed_at DESC
LIMIT 10;

-- 4. Check for specific user's integration status
-- Replace 'USER_ID_HERE' with actual user ID
SELECT 
  it.provider,
  it.token_type,
  it.expires_at,
  it.scopes,
  CASE 
    WHEN it.expires_at < NOW() THEN 'EXPIRED'
    WHEN it.expires_at IS NULL THEN 'No expiry'
    ELSE 'Valid'
  END as token_status,
  COUNT(ce.id) as event_count,
  MAX(ce.last_synced_at) as last_event_sync
FROM integration_tokens it
LEFT JOIN calendar_events ce ON ce.user_id = it.user_id
WHERE it.provider = 'google_calendar'
  -- AND it.user_id = 'USER_ID_HERE'  -- Uncomment and add user ID
GROUP BY it.id, it.provider, it.token_type, it.expires_at, it.scopes;

-- 5. Check for recent sync errors
SELECT 
  sl.*,
  it.user_id
FROM sync_log sl
JOIN integration_tokens it ON it.user_id = sl.user_id AND it.provider = sl.provider
WHERE sl.provider = 'google_calendar'
  AND sl.status = 'failed'
ORDER BY sl.completed_at DESC
LIMIT 5;


