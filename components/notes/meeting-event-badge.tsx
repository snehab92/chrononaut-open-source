"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Clock, Users, Video, ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

interface MeetingEventBadgeProps {
  calendarEventId: string;
  className?: string;
}

export function MeetingEventBadge({ calendarEventId, className }: MeetingEventBadgeProps) {
  const [event, setEvent] = useState<CalendarEventDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

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
        "h-9 px-3 bg-[#F5F0E6] border border-[#E8DCC4] rounded-md flex items-center gap-2 animate-pulse",
        className
      )}>
        <div className="w-4 h-4 bg-[#E8DCC4] rounded" />
        <div className="w-20 h-3 bg-[#E8DCC4] rounded" />
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
  const attendeeNames = event.attendees
    ?.slice(0, 3)
    .map(a => a.name || a.email.split('@')[0])
    .join(", ") || "";

  return (
    <TooltipProvider>
      <div className={cn(
        "h-9 px-3 bg-[#F5F0E6] border border-[#E8DCC4] rounded-md flex items-center gap-3 text-sm",
        className
      )}>
        {/* Calendar icon - indicates linked calendar event */}
        <Calendar className="w-3.5 h-3.5 text-[#2D5A47] flex-shrink-0" />

        {/* Meeting title */}
        <span className="text-[#1E3D32] font-medium truncate max-w-[120px]" title={event.title}>
          {event.title}
        </span>

        {/* Separator */}
        <span className="text-[#E8DCC4]">|</span>

        {/* Date/Time */}
        <div className="flex items-center gap-1.5 text-[#5C7A6B]">
          <Clock className="w-3 h-3" />
          <span className="whitespace-nowrap text-xs">{dateString}</span>
          <span className="text-[#8B9A8F] text-xs">{timeString}</span>
        </div>

        {/* Attendees */}
        {attendeeCount > 0 && (
          <>
            <span className="text-[#E8DCC4]">|</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-[#5C7A6B] cursor-default">
                  <Users className="w-3 h-3" />
                  <span className="text-xs">{attendeeCount}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{attendeeNames}{attendeeCount > 3 ? ` +${attendeeCount - 3} more` : ''}</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {/* Join meeting button */}
        {event.meetingLink && (
          <>
            <span className="text-[#E8DCC4]">|</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={event.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[#2D5A47] hover:text-[#1E3D32]"
                >
                  <Video className="w-3.5 h-3.5" />
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Join Meeting</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
