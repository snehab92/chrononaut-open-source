/**
 * Google Calendar Sync Engine
 * 
 * Pulls events from Google Calendar and stores in Supabase.
 * Read-only: no modifications to Google Calendar.
 */

import { GoogleCalendarClient, CalendarEvent, extractMeetingLink } from './calendar';
import { createClient } from '@/lib/supabase/server';

export type SyncTrigger = 'manual' | 'scheduled' | 'page_focus' | 'initial_connect';

export interface SyncResult {
  success: boolean;
  pulled: number;
  updated: number;
  deleted: number;
  errors: string[];
}

/**
 * Pull events from Google Calendar and sync to Supabase
 */
export async function pullEventsFromGoogle(
  userId: string,
  client: GoogleCalendarClient,
  trigger: SyncTrigger = 'manual'
): Promise<SyncResult> {
  const supabase = await createClient();
  const result: SyncResult = {
    success: true,
    pulled: 0,
    updated: 0,
    deleted: 0,
    errors: [],
  };

  try {
    // Fetch events from ALL calendars (next 30 days by default)
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 7); // Include recent past events

    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Use getAllCalendarEvents to fetch from all calendars, not just primary
    const googleEvents = await client.getAllCalendarEvents({
      timeMin: thirtyDaysAgo,
      timeMax: thirtyDaysFromNow,
      maxResults: 250,
    });

    console.log(`\n=== SYNC PROCESSING ${googleEvents.length} EVENTS ===`);

    // Get existing local events
    const { data: localEvents, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id, google_event_id, google_updated_at')
      .eq('user_id', userId);

    if (fetchError) {
      result.errors.push(`Failed to fetch local events: ${fetchError.message}`);
      result.success = false;
      return result;
    }

    // Create lookup map
    const localEventMap = new Map<string, { id: string; google_updated_at: string | null }>();
    (localEvents || []).forEach((event) => {
      localEventMap.set(event.google_event_id, {
        id: event.id,
        google_updated_at: event.google_updated_at,
      });
    });

    // Track which Google events we've seen
    const seenGoogleIds = new Set<string>();

    // Process each Google event
    for (const googleEvent of googleEvents) {
      try {
        seenGoogleIds.add(googleEvent.id);
        const localEvent = localEventMap.get(googleEvent.id);
        const eventData = transformGoogleEvent(googleEvent, userId);

        if (!localEvent) {
          // New event - insert
          const { error: insertError } = await supabase
            .from('calendar_events')
            .insert(eventData);

          if (insertError) {
            result.errors.push(`Failed to insert event ${googleEvent.id}: ${insertError.message}`);
          } else {
            result.pulled++;
          }
        } else {
          // Existing event - check if updated
          const googleUpdated = googleEvent.updated ? new Date(googleEvent.updated) : null;
          const localUpdated = localEvent.google_updated_at ? new Date(localEvent.google_updated_at) : null;

          if (!localUpdated || (googleUpdated && googleUpdated > localUpdated)) {
            // Event was updated in Google - update local
            const { error: updateError } = await supabase
              .from('calendar_events')
              .update({
                ...eventData,
                updated_at: new Date().toISOString(),
              })
              .eq('id', localEvent.id);

            if (updateError) {
              result.errors.push(`Failed to update event ${googleEvent.id}: ${updateError.message}`);
            } else {
              result.updated++;
            }
          }
        }
      } catch (eventError) {
        result.errors.push(`Error processing event ${googleEvent.id}: ${String(eventError)}`);
      }
    }

    // Mark events deleted in Google (exist locally but not in Google response)
    // Note: We don't actually delete, just mark status as cancelled
    for (const [googleId, localEvent] of localEventMap) {
      if (!seenGoogleIds.has(googleId)) {
        const { error: deleteError } = await supabase
          .from('calendar_events')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', localEvent.id);

        if (!deleteError) {
          result.deleted++;
        }
      }
    }

    // Log sync to sync_log
    await logSync(userId, trigger, result);

  } catch (error) {
    result.success = false;
    result.errors.push(`Sync failed: ${String(error)}`);
  }

  return result;
}

/**
 * Transform Google Calendar event to local format
 */
function transformGoogleEvent(event: CalendarEvent, userId: string) {
  const isAllDay = !event.start.dateTime;
  
  // Parse start/end times
  const startTime = isAllDay 
    ? new Date(event.start.date + 'T00:00:00') 
    : new Date(event.start.dateTime!);
  
  const endTime = isAllDay 
    ? new Date(event.end.date + 'T23:59:59') 
    : new Date(event.end.dateTime!);

  return {
    user_id: userId,
    google_event_id: event.id,
    google_calendar_id: 'primary',
    title: event.summary || '(No title)',
    description: event.description || null,
    location: event.location || null,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    all_day: isAllDay,
    attendees: event.attendees ? JSON.stringify(event.attendees.map(a => ({
      email: a.email,
      name: a.displayName,
      status: a.responseStatus,
    }))) : '[]',
    organizer_email: event.organizer?.email || null,
    status: event.status || 'confirmed',
    meeting_link: extractMeetingLink(event),
    sync_status: 'synced',
    last_synced_at: new Date().toISOString(),
    google_updated_at: event.updated || null,
  };
}

/**
 * Log sync operation
 */
async function logSync(userId: string, trigger: SyncTrigger, result: SyncResult) {
  const supabase = await createClient();
  
  await supabase.from('sync_log').insert({
    user_id: userId,
    provider: 'google_calendar',
    direction: 'pull',
    trigger_type: trigger,
    status: result.success ? 'success' : 'failed',
    pulled_count: result.pulled + result.updated,
    pushed_count: 0,
    conflict_count: 0,
    error_message: result.errors.length > 0 ? result.errors[0] : null,
    error_details: result.errors.length > 0 ? { errors: result.errors } : {},
    completed_at: new Date().toISOString(),
  });
}
