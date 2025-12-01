import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/calendar/events
 * 
 * Fetches calendar events from local Supabase table
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch events for next 30 days from local table
  const now = new Date();
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const { data: events, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", user.id)
    .gte("start_time", now.toISOString())
    .lte("start_time", thirtyDaysFromNow.toISOString())
    .neq("status", "cancelled")
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Failed to fetch calendar events:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }

  // Transform to frontend format
  const transformedEvents = (events || []).map((event) => ({
    id: event.id,
    googleEventId: event.google_event_id,
    title: event.title,
    description: event.description,
    location: event.location,
    startTime: event.start_time,
    endTime: event.end_time,
    allDay: event.all_day,
    attendees: typeof event.attendees === 'string' 
      ? JSON.parse(event.attendees) 
      : event.attendees || [],
    organizerEmail: event.organizer_email,
    status: event.status,
    meetingLink: event.meeting_link,
  }));

  return NextResponse.json({ events: transformedEvents });
}
