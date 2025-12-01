import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/calendar/events/[eventId]
 *
 * Fetches a single calendar event by ID
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const supabase = await createClient();
  const { eventId } = await params;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: event, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Transform to frontend format
  const transformedEvent = {
    id: event.id,
    googleEventId: event.google_event_id,
    title: event.title,
    description: event.description,
    location: event.location,
    startTime: event.start_time,
    endTime: event.end_time,
    allDay: event.all_day,
    attendees:
      typeof event.attendees === "string"
        ? JSON.parse(event.attendees)
        : event.attendees || [],
    organizerEmail: event.organizer_email,
    status: event.status,
    meetingLink: event.meeting_link,
  };

  return NextResponse.json({ event: transformedEvent });
}
