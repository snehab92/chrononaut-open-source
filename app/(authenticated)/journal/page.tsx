"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { JournalComposer } from "@/components/journal/journal-composer";

// Get today's date in YYYY-MM-DD format
function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

// Format date for URL
function formatDateForUrl(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Parse date from URL
function parseDateFromUrl(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

export default function JournalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Current date from URL or today
  const dateParam = searchParams.get("date");
  const [selectedDate, setSelectedDate] = useState<string>(
    dateParam === "today" ? getToday() : dateParam || getToday()
  );

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

  // Navigate to a date
  const goToDate = (date: string) => {
    setSelectedDate(date);
    router.push(`/journal?date=${date}`);
  };

  // Navigate by day
  const goToPreviousDay = () => {
    const current = parseDateFromUrl(selectedDate);
    current.setDate(current.getDate() - 1);
    goToDate(formatDateForUrl(current));
  };

  const goToNextDay = () => {
    const current = parseDateFromUrl(selectedDate);
    current.setDate(current.getDate() + 1);
    goToDate(formatDateForUrl(current));
  };

  const goToToday = () => {
    goToDate(getToday());
  };

  // Calendar date selection
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      goToDate(formatDateForUrl(date));
      setIsCalendarOpen(false);
    }
  };

  // Check if selected date is today
  const isToday = selectedDate === getToday();

  // Check if selected date is in the future
  const isFuture = selectedDate > getToday();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FAF8F5]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#E8DCC4] px-6 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#5C7A6B]" />
            <h1 className="text-xl font-serif font-semibold text-[#1E3D32]">
              Journal
            </h1>
          </div>

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
                    {isToday
                      ? "Today"
                      : parseDateFromUrl(selectedDate).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={parseDateFromUrl(selectedDate)}
                    onSelect={handleCalendarSelect}
                    modifiers={{
                      hasEntry: (date) =>
                        entryDates.has(formatDateForUrl(date)),
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
                disabled={isToday}
                className="h-9 px-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Today button */}
            {!isToday && (
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
      </div>

      {/* Main Content */}
      <div className="p-6">
        {isFuture ? (
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
