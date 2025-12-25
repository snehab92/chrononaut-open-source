"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { JournalComposer } from "@/components/journal/journal-composer";
import {
  getToday,
  getLocalDateString,
  parseDateString,
  formatDateShort,
} from "@/lib/date-utils";

interface EntryFeedViewProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function EntryFeedView({ selectedDate, onDateChange }: EntryFeedViewProps) {
  const supabase = createClient();

  // Entries with data (for calendar indicators)
  const [entryDates, setEntryDates] = useState<Set<string>>(new Set());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Load entry dates for calendar
  useEffect(() => {
    loadEntryDates();
  }, []);

  const loadEntryDates = async () => {
    try {
      const { data } = await supabase
        .from("journal_entries")
        .select("entry_date")
        .order("entry_date", { ascending: false })
        .limit(365);

      if (data) {
        setEntryDates(new Set(data.map((e) => e.entry_date)));
      }
    } catch (error) {
      console.error("Failed to load entry dates:", error);
    }
  };

  // Navigate by day
  const goToPreviousDay = () => {
    const current = parseDateString(selectedDate);
    current.setDate(current.getDate() - 1);
    onDateChange(getLocalDateString(current));
  };

  const goToNextDay = () => {
    const current = parseDateString(selectedDate);
    current.setDate(current.getDate() + 1);
    onDateChange(getLocalDateString(current));
  };

  const goToToday = () => {
    onDateChange(getToday());
  };

  // Calendar date selection
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(getLocalDateString(date));
      setIsCalendarOpen(false);
    }
  };

  // Check if selected date is today
  const isTodayDate = selectedDate === getToday();

  // Check if selected date is in the future
  const isFutureDate = selectedDate > getToday();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Date Navigation Header */}
      <div className="flex items-center justify-center px-6 py-3 border-b border-[#E8DCC4] bg-[#FAF8F5]">
        <div className="flex items-center gap-2">
          {/* Date Navigation */}
          <div className="flex items-center bg-white rounded-lg border border-[#E8DCC4]">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousDay}
              className="h-9 px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 font-medium"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {isTodayDate ? "Today" : formatDateShort(selectedDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={parseDateString(selectedDate)}
                  onSelect={handleCalendarSelect}
                  modifiers={{
                    hasEntry: (date) =>
                      entryDates.has(getLocalDateString(date)),
                  }}
                  modifiersStyles={{
                    hasEntry: {
                      fontWeight: "bold",
                      textDecoration: "underline",
                      textDecorationColor: "#5C7A6B",
                    },
                  }}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextDay}
              disabled={isTodayDate}
              className="h-9 px-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Today button */}
          {!isTodayDate && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-9"
            >
              Today
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isFutureDate ? (
          <div className="max-w-2xl mx-auto text-center py-12">
            <CalendarIcon className="w-12 h-12 text-[#8B9A8F] mx-auto mb-4" />
            <h2 className="text-xl font-medium text-[#1E3D32] mb-2">
              Future Date Selected
            </h2>
            <p className="text-[#8B9A8F] mb-4">
              You can only journal about today or past days.
            </p>
            <Button onClick={goToToday}>Go to Today</Button>
          </div>
        ) : (
          <JournalComposer
            date={selectedDate}
            onSaved={loadEntryDates}
          />
        )}
      </div>
    </div>
  );
}
