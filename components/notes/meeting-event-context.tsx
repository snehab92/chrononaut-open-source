"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Calendar, Clock, Users, Video, ExternalLink,
  ChevronDown, ChevronUp, MapPin, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CalendarEventDetails {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location?: string;
  meetingLink?: string;
  attendees?: Array<{ email: string; name?: string }>;
}

interface MeetingEventContextProps {
  calendarEventId: string;
  className?: string;
}

export function MeetingEventContext({ calendarEventId, className }: MeetingEventContextProps) {
  const [event, setEvent] = useState<CalendarEventDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchEvent() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("google_event_id", calendarEventId)
        .single();

      if (!error && data) {
        setEvent({
          id: data.id,
          title: data.title,
          startTime: data.start_time,
          endTime: data.end_time,
          allDay: data.all_day,
          location: data.location,
          meetingLink: data.meeting_link,
          attendees: typeof data.attendees === "string"
            ? JSON.parse(data.attendees)
            : data.attendees || [],
        });
      }
      setIsLoading(false);
    }

    if (calendarEventId) {
      fetchEvent();
    }
  }, [calendarEventId, supabase]);

  if (isLoading) {
    return (
      <div className={cn(
        "bg-gradient-to-r from-[#F5F0E6] to-[#FAF8F5] rounded-xl p-3 border border-[#E8DCC4] animate-pulse",
        className
      )}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#E8DCC4] rounded" />
          <div className="h-4 bg-[#E8DCC4] rounded w-32" />
        </div>
      </div>
    );
  }

  if (!event) return null;

  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);

  const dateString = startDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const timeString = event.allDay
    ? "All day"
    : `${formatTime(startDate)} – ${formatTime(endDate)}`;

  const attendeeCount = event.attendees?.length || 0;
  const displayAttendees = event.attendees?.slice(0, 4) || [];
  const remainingCount = attendeeCount > 4 ? attendeeCount - 4 : 0;

  return (
    <div className={cn(
      "bg-gradient-to-r from-[#F5F0E6] via-[#FAF8F5] to-[#FDF8ED] rounded-xl border border-[#E8DCC4] overflow-hidden transition-all duration-200",
      className
    )}>
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#F5F0E6]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#2D5A47]/10">
            <Calendar className="w-4 h-4 text-[#2D5A47]" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#1E3D32]">
                Linked Meeting
              </span>
              {event.meetingLink && (
                <Video className="w-3.5 h-3.5 text-[#5C7A6B]" />
              )}
            </div>
            <p className="text-xs text-[#5C7A6B] truncate max-w-[200px]">
              {event.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Compact info when collapsed */}
          {!isExpanded && (
            <div className="flex items-center gap-2 text-xs text-[#8B9A8F]">
              <span>{dateString}</span>
              {attendeeCount > 0 && (
                <>
                  <span>•</span>
                  <span>{attendeeCount} attendee{attendeeCount !== 1 ? 's' : ''}</span>
                </>
              )}
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#8B9A8F]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8B9A8F]" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Event Title */}
          <h3 className="font-medium text-[#1E3D32] text-sm pl-11">
            {event.title}
          </h3>

          {/* Date & Time */}
          <div className="flex items-center gap-3 pl-11">
            <div className="flex items-center gap-2 text-sm text-[#5C7A6B]">
              <Clock className="w-3.5 h-3.5" />
              <span>{dateString}</span>
              <span className="text-[#8B9A8F]">•</span>
              <span>{timeString}</span>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2 pl-11 text-sm text-[#5C7A6B]">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {/* Attendees */}
          {attendeeCount > 0 && (
            <div className="pl-11">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-[#5C7A6B]" />
                <span className="text-xs text-[#8B9A8F]">
                  {attendeeCount} attendee{attendeeCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {displayAttendees.map((attendee, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-white border border-[#E8DCC4] text-[#5C7A6B] shadow-sm"
                    title={attendee.email}
                  >
                    {attendee.name || attendee.email.split('@')[0]}
                  </span>
                ))}
                {remainingCount > 0 && (
                  <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-[#E8DCC4] text-[#8B9A8F]">
                    +{remainingCount} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pl-11 pt-1 flex items-center gap-2">
            {/* View on Calendar */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/dashboard?event=${calendarEventId}`)}
              className="h-8 text-xs border-[#E8DCC4] text-[#5C7A6B] hover:bg-[#F5F0E6] hover:text-[#1E3D32]"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              View on Calendar
              <ArrowUpRight className="w-3 h-3 ml-1 opacity-70" />
            </Button>

            {/* Join Meeting Button */}
            {event.meetingLink && (
              <Button
                asChild
                size="sm"
                className="bg-[#2D5A47] hover:bg-[#1E3D32] text-white h-8 text-xs"
              >
                <a
                  href={event.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Video className="w-3.5 h-3.5 mr-1.5" />
                  Join Meeting
                  <ExternalLink className="w-3 h-3 ml-1.5 opacity-70" />
                </a>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
