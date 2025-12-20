"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Calendar, Video, MapPin, ChevronDown, ChevronUp, 
  ExternalLink, FileText, ArrowRight
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CalendarEvent {
  id: string;
  googleEventId: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  attendees?: { email: string; name?: string }[];
  organizerEmail?: string;
  status: string;
  meetingLink?: string;
}

interface FocusCalendarWidgetProps {
  onMeetingNoteCreated?: (noteId: string) => void;
}

export function FocusCalendarWidget({ onMeetingNoteCreated }: FocusCalendarWidgetProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if Google Calendar is connected
      const { data: integrations } = await supabase
        .from("integration_tokens")
        .select("provider")
        .eq("user_id", user.id)
        .eq("provider", "google_calendar");
      
      setIsConnected((integrations?.length || 0) > 0);

      if ((integrations?.length || 0) > 0) {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from("calendar_events")
          .select("*")
          .eq("user_id", user.id)
          .gte("start_time", now.toISOString())
          .lte("start_time", tomorrow.toISOString())
          .neq("status", "cancelled")
          .order("start_time", { ascending: true });

        if (!error && data) {
          setEvents(data.map((e: any) => ({
            id: e.id,
            googleEventId: e.google_event_id,
            title: e.title,
            description: e.description,
            location: e.location,
            startTime: e.start_time,
            endTime: e.end_time,
            allDay: e.all_day,
            attendees: typeof e.attendees === "string" ? JSON.parse(e.attendees) : e.attendees || [],
            organizerEmail: e.organizer_email,
            status: e.status,
            meetingLink: e.meeting_link,
          })));
        }
      }
      setIsLoading(false);
    }
    
    fetchEvents();
  }, [supabase]);

  // Create meeting note for an event
  const startMeetingNote = async (event: CalendarEvent) => {
    setIsCreatingNote(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsCreatingNote(false);
      return;
    }

    // Check if a note already exists for this event
    const { data: existingNote } = await supabase
      .from("notes")
      .select("id")
      .eq("calendar_event_id", event.googleEventId)
      .single();

    if (existingNote) {
      // Open existing note in Focus editor
      onMeetingNoteCreated?.(existingNote.id);
      setSelectedEvent(null);
      setIsCreatingNote(false);
      return;
    }

    // Create new meeting note
    const attendeesList = event.attendees?.map(a => a.name || a.email).join(", ") || "";
    const template = `## Meeting: ${event.title}

**Date:** ${new Date(event.startTime).toLocaleDateString()}
**Time:** ${formatTime(new Date(event.startTime))} - ${formatTime(new Date(event.endTime))}
${event.location ? `**Location:** ${event.location}` : ""}
${attendeesList ? `**Attendees:** ${attendeesList}` : ""}

---

### Pre-Meeting Notes


### Discussion Points


### Action Items

- [ ] 

### Follow-up

`;

    const { data: newNote, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title: `Meeting: ${event.title}`,
        content: template,
        note_type: "meeting",
        calendar_event_id: event.googleEventId,
      })
      .select()
      .single();

    if (!error && newNote) {
      // Open new note in Focus editor instead of navigating
      onMeetingNoteCreated?.(newNote.id);
    }
    
    setSelectedEvent(null);
    setIsCreatingNote(false);
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString(undefined, { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
  };

  if (!isConnected) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium text-[#1E3D32]">
            <Calendar className="w-4 h-4" />
            Calendar
          </div>
        </div>
        <div className="flex items-center justify-center h-16 text-[#8B9A8F] text-xs border-2 border-dashed border-[#E8DCC4] rounded-lg">
          <Link href="/settings" className="flex items-center gap-1 hover:text-[#2D5A47] transition-colors">
            Connect Google Calendar
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-2"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-[#1E3D32]">
          <Calendar className="w-4 h-4" />
          Calendar
          <span className="text-xs text-[#8B9A8F]">({events.length} today)</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#8B9A8F]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#8B9A8F]" />
        )}
      </button>

      {/* Events */}
      {isExpanded && (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-16 text-[#8B9A8F] text-xs">
              Loading...
            </div>
          ) : events.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-[#8B9A8F] text-xs border-2 border-dashed border-[#E8DCC4] rounded-lg">
              No events today
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="p-2 rounded-lg bg-[#F5F0E6] hover:bg-[#E8DCC4] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs text-[#8B9A8F]">
                  <span>
                    {event.allDay 
                      ? "All day" 
                      : formatTime(new Date(event.startTime))
                    }
                  </span>
                  {event.meetingLink && <Video className="h-3 w-3 text-[#5C7A6B]" />}
                </div>
                <p className="text-sm font-medium text-[#1E3D32] line-clamp-1">
                  {event.title}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md bg-[#FDFBF7] border-[#E8DCC4]">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-[#1E3D32]">
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              {/* Time */}
              <div className="flex items-center gap-2 text-sm text-[#5C7A6B]">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(selectedEvent.startTime).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                  {" • "}
                  {selectedEvent.allDay 
                    ? "All day"
                    : `${formatTime(new Date(selectedEvent.startTime))} – ${formatTime(new Date(selectedEvent.endTime))}`
                  }
                </span>
              </div>

              {/* Location */}
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-sm text-[#5C7A6B]">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                {selectedEvent.meetingLink && (
                  <Button
                    asChild
                    className="w-full bg-[#1E3D32] hover:bg-[#2D5A47] text-white"
                  >
                    <a
                      href={selectedEvent.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Join Meeting
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => startMeetingNote(selectedEvent)}
                  disabled={isCreatingNote}
                  className="w-full border-[#E8DCC4] text-[#5C7A6B] hover:bg-[#F5F0E6]"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {isCreatingNote ? "Creating..." : "Start Meeting Notes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
