"use client";

import { useCalendarContext, CalendarEvent } from "./calendar-context";
import { useState } from "react";
import { MapPin, Video, ExternalLink, Users, Clock, X, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EventListProps {
  isConnected: boolean;
}

export function EventList({ isConnected }: EventListProps) {
  const { events } = useCalendarContext();
  const [view, setView] = useState<"today" | "week">("today");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-[#8B9A8F] text-sm border-2 border-dashed border-[#E8DCC4] rounded-xl">
        <p>Connect Google Calendar in Settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("today")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            view === "today"
              ? "bg-[#1E3D32] text-white"
              : "bg-[#F5F0E6] text-[#5C7A6B] hover:bg-[#E8DCC4]"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setView("week")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            view === "week"
              ? "bg-[#1E3D32] text-white"
              : "bg-[#F5F0E6] text-[#5C7A6B] hover:bg-[#E8DCC4]"
          }`}
        >
          This Week
        </button>
      </div>

      {/* Content based on view */}
      {view === "today" ? (
        <TodayView events={events} onEventClick={setSelectedEvent} />
      ) : (
        <WeekView events={events} onEventClick={setSelectedEvent} />
      )}

      {/* Event detail modal */}
      <EventDetailModal 
        event={selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
      />
    </div>
  );
}

// Event detail modal
function EventDetailModal({ 
  event, 
  onClose 
}: { 
  event: CalendarEvent | null; 
  onClose: () => void;
}) {
  if (!event) return null;

  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  
  const dateString = startTime.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  
  const timeString = event.allDay 
    ? "All day"
    : `${formatTime(startTime)} – ${formatTime(endTime)}`;

  const duration = event.allDay 
    ? null 
    : Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

  const durationString = duration 
    ? duration >= 60 
      ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? `${duration % 60}m` : ''}`
      : `${duration}m`
    : null;

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#FDFBF7] border-[#E8DCC4]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-[#1E3D32] pr-6">
            {event.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date and time */}
          <div className="flex items-start gap-3 text-sm">
            <Clock className="h-4 w-4 text-[#8B9A8F] mt-0.5" />
            <div>
              <div className="text-[#1E3D32] font-medium">{dateString}</div>
              <div className="text-[#5C7A6B]">
                {timeString}
                {durationString && <span className="text-[#8B9A8F]"> · {durationString}</span>}
              </div>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="h-4 w-4 text-[#8B9A8F] mt-0.5" />
              <div className="text-[#5C7A6B]">{event.location}</div>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-start gap-3 text-sm">
              <Users className="h-4 w-4 text-[#8B9A8F] mt-0.5" />
              <div className="flex-1">
                <div className="text-[#5C7A6B] mb-1">
                  {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                </div>
                <div className="flex flex-wrap gap-1">
                  {event.attendees.slice(0, 5).map((attendee, i) => (
                    <span 
                      key={i}
                      className="px-2 py-0.5 text-xs bg-[#F5F0E6] text-[#5C7A6B] rounded-full"
                      title={attendee.email}
                    >
                      {attendee.name || attendee.email.split('@')[0]}
                    </span>
                  ))}
                  {event.attendees.length > 5 && (
                    <span className="px-2 py-0.5 text-xs bg-[#F5F0E6] text-[#8B9A8F] rounded-full">
                      +{event.attendees.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="pt-2 border-t border-[#E8DCC4]">
              <p className="text-sm text-[#5C7A6B] whitespace-pre-wrap line-clamp-4">
                {event.description}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            {event.meetingLink && (
              <Button
                asChild
                className="w-full bg-[#1E3D32] hover:bg-[#2D5A47] text-white"
              >
                <a
                  href={event.meetingLink}
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
              className="w-full border-[#E8DCC4] text-[#5C7A6B] hover:bg-[#F5F0E6] hover:text-[#1E3D32]"
              disabled
              title="Coming soon - Notes screen"
            >
              <FileText className="h-4 w-4 mr-2" />
              Start Meeting Notes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Today view - vertical cards
function TodayView({ 
  events, 
  onEventClick 
}: { 
  events: CalendarEvent[]; 
  onEventClick: (event: CalendarEvent) => void;
}) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayEvents = events
    .filter((event) => {
      if (event.status === "cancelled") return false;
      const startTime = new Date(event.startTime);
      return startTime >= today && startTime < tomorrow;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (todayEvents.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-[#8B9A8F] text-sm border-2 border-dashed border-[#E8DCC4] rounded-xl">
        No events today
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      {todayEvents.map((event) => (
        <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />
      ))}
    </div>
  );
}

// Week view - 7 day calendar grid
function WeekView({ 
  events, 
  onEventClick 
}: { 
  events: CalendarEvent[]; 
  onEventClick: (event: CalendarEvent) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate 7 days starting from today
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    return date;
  });

  // Group events by date
  const eventsByDate = new Map<string, CalendarEvent[]>();
  
  events.forEach((event) => {
    if (event.status === "cancelled") return;
    const startTime = new Date(event.startTime);
    const dateKey = startTime.toDateString();
    
    // Only include events within our 7-day window
    const eventDate = new Date(startTime);
    eventDate.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    
    if (eventDate >= today && eventDate < endOfWeek) {
      if (!eventsByDate.has(dateKey)) {
        eventsByDate.set(dateKey, []);
      }
      eventsByDate.get(dateKey)!.push(event);
    }
  });

  // Sort events within each day
  eventsByDate.forEach((dayEvents) => {
    dayEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  });

  return (
    <div className="grid grid-cols-7 gap-1 min-h-[300px]">
      {days.map((date, index) => {
        const dateKey = date.toDateString();
        const dayEvents = eventsByDate.get(dateKey) || [];
        const isToday = date.toDateString() === new Date().toDateString();

        return (
          <div
            key={index}
            className={`flex flex-col rounded-lg border ${
              isToday 
                ? "border-[#C9A227] bg-[#FDF8ED]" 
                : "border-[#E8DCC4] bg-white"
            }`}
          >
            {/* Day header */}
            <div className={`px-2 py-1.5 text-center border-b ${
              isToday ? "border-[#C9A227]/30" : "border-[#E8DCC4]"
            }`}>
              <div className={`text-[10px] font-medium uppercase ${
                isToday ? "text-[#C9A227]" : "text-[#8B9A8F]"
              }`}>
                {date.toLocaleDateString(undefined, { weekday: "short" })}
              </div>
              <div className={`text-sm font-semibold ${
                isToday ? "text-[#1E3D32]" : "text-[#5C7A6B]"
              }`}>
                {date.getDate()}
              </div>
            </div>

            {/* Events for this day */}
            <div className="flex-1 p-1 space-y-1 overflow-y-auto max-h-[250px]">
              {dayEvents.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <span className="text-[10px] text-[#8B9A8F]/50">—</span>
                </div>
              ) : (
                dayEvents.map((event) => (
                  <MiniEventCard 
                    key={event.id} 
                    event={event} 
                    onClick={() => onEventClick(event)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Mini event card for week view
function MiniEventCard({ 
  event, 
  onClick 
}: { 
  event: CalendarEvent; 
  onClick: () => void;
}) {
  const startTime = new Date(event.startTime);
  const timeString = event.allDay 
    ? "All day"
    : startTime.toLocaleTimeString(undefined, { 
        hour: "numeric", 
        minute: "2-digit",
        hour12: true 
      });

  return (
    <div 
      className="p-1.5 rounded bg-[#F5F0E6] hover:bg-[#E8DCC4] transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div className="text-[10px] text-[#8B9A8F] font-medium">
        {timeString}
      </div>
      <div className="text-[11px] text-[#1E3D32] font-medium line-clamp-2 leading-tight">
        {event.title}
      </div>
      {event.meetingLink && (
        <div className="flex items-center gap-0.5 mt-0.5 text-[9px] text-[#5C7A6B]">
          <Video className="h-2.5 w-2.5" />
        </div>
      )}
    </div>
  );
}

// Full event card for today view
function EventCard({ 
  event, 
  onClick 
}: { 
  event: CalendarEvent; 
  onClick: () => void;
}) {
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  
  const timeString = event.allDay 
    ? "All day"
    : `${formatTime(startTime)} – ${formatTime(endTime)}`;

  return (
    <div 
      className="p-3 rounded-xl bg-white border border-[#E8DCC4] hover:border-[#C9A227] transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Time */}
      <div className="flex items-center gap-2 text-xs text-[#8B9A8F] mb-1">
        <span className="font-medium">{timeString}</span>
        {event.meetingLink && <Video className="h-3 w-3 text-[#5C7A6B]" />}
      </div>
      
      {/* Title */}
      <h3 className="font-medium text-[#1E3D32] text-sm line-clamp-2">
        {event.title}
      </h3>
      
      {/* Meta info */}
      {event.location && (
        <div className="flex items-center gap-1 mt-1 text-xs text-[#8B9A8F]">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{event.location}</span>
        </div>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { 
    hour: "numeric", 
    minute: "2-digit",
    hour12: true 
  });
}
