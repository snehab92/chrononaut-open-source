"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface CalendarEvent {
  id: string;
  googleEventId: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  attendees: Array<{ email: string; name?: string; status?: string }>;
  organizerEmail: string | null;
  status: string;
  meetingLink: string | null;
}

interface CalendarContextValue {
  events: CalendarEvent[];
  refreshEvents: () => Promise<void>;
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function useCalendarContext() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendarContext must be used within CalendarProvider");
  }
  return context;
}

interface CalendarProviderProps {
  children: ReactNode;
  initialEvents: CalendarEvent[];
  isConnected: boolean;
}

export function CalendarProvider({ children, initialEvents, isConnected }: CalendarProviderProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);

  const refreshEvents = useCallback(async () => {
    if (!isConnected) return;
    
    try {
      const response = await fetch("/api/calendar/events");
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to refresh calendar events:", error);
    }
  }, [isConnected]);

  return (
    <CalendarContext.Provider value={{ events, refreshEvents }}>
      {children}
    </CalendarContext.Provider>
  );
}
