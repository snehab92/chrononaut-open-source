"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Calendar, Video, MapPin, ChevronDown, ChevronUp,
  ExternalLink, FileText, ArrowRight, ChevronLeft, ChevronRight as ChevronRightIcon, Users
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";

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
  linkedNoteId?: string; // Track if note already exists
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const supabase = createClient();

  // Format date for display
  const formatDateHeader = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) return "Today";
    if (compareDate.getTime() === tomorrow.getTime()) return "Tomorrow";
    if (compareDate.getTime() === yesterday.getTime()) return "Yesterday";
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  // Handle date picker selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setShowDatePicker(false);
    }
  };

  // Fetch events for selected date
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Check if Google Calendar is connected
    const { data: integrations } = await supabase
      .from("integration_tokens")
      .select("provider")
      .eq("user_id", user.id)
      .eq("provider", "google_calendar");

    setIsConnected((integrations?.length || 0) > 0);

    if ((integrations?.length || 0) > 0) {
      // Get start and end of selected date
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", dayStart.toISOString())
        .lte("start_time", dayEnd.toISOString())
        .neq("status", "cancelled")
        .order("start_time", { ascending: true });

      if (!error && data) {
        // Get all google event IDs
        const googleEventIds = data.map((e: any) => e.google_event_id);

        // Check which events already have linked notes
        let noteByEventId = new Map<string, string>();
        if (googleEventIds.length > 0) {
          const { data: linkedNotes } = await supabase
            .from("notes")
            .select("id, calendar_event_id")
            .in("calendar_event_id", googleEventIds);

          linkedNotes?.forEach((note: any) => {
            noteByEventId.set(note.calendar_event_id, note.id);
          });
        }

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
          linkedNoteId: noteByEventId.get(e.google_event_id) || undefined,
        })));
      }
    }
    setIsLoading(false);
  }, [supabase, selectedDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Handle meeting note button click
  const handleMeetingNote = async (event: CalendarEvent) => {
    // If note already exists, open it
    if (event.linkedNoteId) {
      onMeetingNoteCreated?.(event.linkedNoteId);
      setSelectedEvent(null);
      return;
    }

    // Otherwise create new note
    setIsCreatingNote(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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
      // Update local state to show note is now linked
      setEvents(prev => prev.map(e => 
        e.googleEventId === event.googleEventId 
          ? { ...e, linkedNoteId: newNote.id }
          : e
      ));
      // Open new note in Focus editor
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
    <div className="p-4 border-b border-[#E8DCC4]">
      {/* Header with expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-2"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-[#1E3D32]">
          <Calendar className="w-4 h-4" />
          Calendar
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#8B9A8F]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#8B9A8F]" />
        )}
      </button>

      {/* Day Navigation - visible when expanded */}
      {isExpanded && (
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousDay}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#1E3D32]">
              {formatDateHeader(selectedDate)}
            </span>
            <span className="text-xs text-[#8B9A8F]">
              ({events.length} event{events.length !== 1 ? "s" : ""})
            </span>

            {/* Date Picker */}
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  title="Pick a date"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#5C7A6B]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <CalendarPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  defaultMonth={selectedDate}
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={2030}
                  initialFocus
                />
                <div className="border-t p-2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs flex-1"
                    onClick={() => handleDateSelect(new Date())}
                  >
                    Today
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextDay}
            className="h-7 w-7 p-0"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Events */}
      {isExpanded && (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-16 text-[#8B9A8F] text-xs">
              Loading...
            </div>
          ) : events.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-[#8B9A8F] text-xs border-2 border-dashed border-[#E8DCC4] rounded-lg">
              No events on {formatDateHeader(selectedDate).toLowerCase()}
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
                  {event.attendees && event.attendees.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[#5C7A6B]">
                      <Users className="h-3 w-3" />
                      {event.attendees.length}
                    </span>
                  )}
                  {event.linkedNoteId && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px]">
                      <FileText className="h-2.5 w-2.5" />
                      Note
                    </span>
                  )}
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

              {/* Attendees */}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Users className="w-4 h-4 text-[#8B9A8F] mt-0.5" />
                  <div className="flex-1">
                    <div className="text-[#5C7A6B] mb-1">
                      {selectedEvent.attendees.length} attendee{selectedEvent.attendees.length !== 1 ? 's' : ''}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedEvent.attendees.slice(0, 5).map((attendee, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs bg-[#F5F0E6] text-[#5C7A6B] rounded-full"
                          title={attendee.email}
                        >
                          {attendee.name || attendee.email.split('@')[0]}
                        </span>
                      ))}
                      {selectedEvent.attendees.length > 5 && (
                        <span className="px-2 py-0.5 text-xs bg-[#F5F0E6] text-[#8B9A8F] rounded-full">
                          +{selectedEvent.attendees.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
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
                  onClick={() => handleMeetingNote(selectedEvent)}
                  disabled={isCreatingNote}
                  className="w-full border-[#E8DCC4] text-[#5C7A6B] hover:bg-[#F5F0E6]"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {isCreatingNote 
                    ? "Creating..." 
                    : selectedEvent.linkedNoteId 
                      ? "Open Meeting Note" 
                      : "Start Meeting Note"
                  }
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
