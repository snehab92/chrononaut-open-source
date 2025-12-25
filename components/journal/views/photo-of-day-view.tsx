"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Camera,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MoodCompactChart } from "@/components/journal/charts/mood-compact-chart";
import { EntryPreviewModal } from "@/components/journal/modals/entry-preview-modal";
import { MOOD_CONFIG, type MoodLabel, type JournalEntry, type JournalStats, type CalendarEntry } from "@/lib/journal/types";

// Calendar helpers
function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Add padding days from previous month
  const startPadding = firstDay.getDay();
  for (let i = startPadding - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Add days of current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Add padding days from next month to fill grid
  const remaining = 42 - days.length; // 6 rows x 7 cols
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function PhotoOfDayView() {
  const supabase = createClient();
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [calendarEntries, setCalendarEntries] = useState<Map<string, CalendarEntry>>(new Map());
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load stats
  useEffect(() => {
    loadStats();
  }, [currentYear]);

  // Load calendar entries when month changes
  useEffect(() => {
    loadCalendarEntries();
  }, [currentMonth, currentYear]);

  const loadStats = async () => {
    try {
      const res = await fetch(`/api/journal/stats?year=${currentYear}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadCalendarEntries = async () => {
    setIsLoading(true);
    try {
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0);

      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, entry_date, photo_url, location_name, mood_label")
        .gte("entry_date", formatDateKey(startDate))
        .lte("entry_date", formatDateKey(endDate));

      if (error) throw error;

      const entriesMap = new Map<string, CalendarEntry>();
      data?.forEach((entry) => {
        entriesMap.set(entry.entry_date, entry as CalendarEntry);
      });
      setCalendarEntries(entriesMap);
    } catch (error) {
      console.error("Failed to load calendar entries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDayClick = async (date: Date) => {
    const dateKey = formatDateKey(date);
    const entry = calendarEntries.get(dateKey);

    if (entry) {
      // Fetch full entry for modal
      try {
        const res = await fetch(`/api/journal?date=${dateKey}`);
        if (res.ok) {
          const { entry: fullEntry } = await res.json();
          if (fullEntry) {
            setSelectedEntry(fullEntry);
            setIsModalOpen(true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch entry:", error);
      }
    }
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const days = getMonthDays(currentYear, currentMonth);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Stats Container */}
      <div className="p-6 border-b border-[#E8DCC4]">
        <h2 className="text-sm font-medium text-[#5C7A6B] uppercase tracking-wide mb-4">
          {currentYear} Highlights
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Locations Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4]">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-[#5C7A6B]" />
              <span className="text-xs font-medium text-[#8B9A8F] uppercase tracking-wide">
                Places
              </span>
            </div>
            <p className="text-2xl font-serif font-semibold text-[#1E3D32]">
              {stats?.uniqueLocations || 0}
            </p>
            <p className="text-sm text-[#5C7A6B]">locations visited</p>
          </div>

          {/* Mood Breakdown Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4]">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#5C7A6B]" />
              <span className="text-xs font-medium text-[#8B9A8F] uppercase tracking-wide">
                Moods
              </span>
            </div>
            <MoodCompactChart data={stats?.moodBreakdown || []} />
          </div>

          {/* Photo Memories Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4]">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4 text-[#5C7A6B]" />
              <span className="text-xs font-medium text-[#8B9A8F] uppercase tracking-wide">
                Memories
              </span>
            </div>
            <p className="text-2xl font-serif font-semibold text-[#1E3D32]">
              {stats?.totalPhotos || 0}
            </p>
            <p className="text-sm text-[#5C7A6B]">
              photos across {stats?.daysWithPhotos || 0} days
            </p>
            {stats?.mostPhotographedLocation && (
              <p className="text-xs text-[#8B9A8F] mt-2 truncate">
                Favorite spot: {stats.mostPhotographedLocation}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-serif font-semibold text-[#1E3D32]">
            {monthName}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            disabled={currentYear === today.getFullYear() && currentMonth === today.getMonth()}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-[#8B9A8F] py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            const dateKey = formatDateKey(date);
            const entry = calendarEntries.get(dateKey);
            const isCurrentMonth = date.getMonth() === currentMonth;
            const isToday = dateKey === formatDateKey(today);
            const isFuture = date > today;
            const moodConfig = entry?.mood_label
              ? MOOD_CONFIG[entry.mood_label as MoodLabel]
              : null;

            return (
              <button
                key={index}
                onClick={() => !isFuture && handleDayClick(date)}
                disabled={isFuture || !isCurrentMonth}
                className={cn(
                  "relative aspect-square rounded-lg overflow-hidden transition-all",
                  "border border-transparent hover:border-[#D4A84B]",
                  isCurrentMonth ? "bg-white" : "bg-[#F5F0E6]/50",
                  isFuture && "opacity-40 cursor-not-allowed",
                  isToday && "ring-2 ring-[#D4A84B]",
                  entry && "cursor-pointer"
                )}
              >
                {/* Photo thumbnail */}
                {entry?.photo_url && isCurrentMonth ? (
                  <img
                    src={entry.photo_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className={cn(
                      "absolute inset-0 flex flex-col items-center justify-center",
                      !isCurrentMonth && "text-[#C4B8A8]"
                    )}
                  >
                    {entry && !entry.photo_url && moodConfig && (
                      <span className="text-lg">{moodConfig.emoji}</span>
                    )}
                  </div>
                )}

                {/* Date number */}
                <div
                  className={cn(
                    "absolute top-1 left-1 text-xs font-medium",
                    entry?.photo_url
                      ? "text-white drop-shadow-md"
                      : isCurrentMonth
                      ? "text-[#1E3D32]"
                      : "text-[#C4B8A8]"
                  )}
                >
                  {date.getDate()}
                </div>

                {/* Location indicator */}
                {entry?.location_name && isCurrentMonth && (
                  <div
                    className={cn(
                      "absolute bottom-1 left-1 right-1 text-[8px] truncate",
                      entry.photo_url
                        ? "text-white drop-shadow-md"
                        : "text-[#5C7A6B]"
                    )}
                  >
                    {entry.location_name}
                  </div>
                )}

                {/* Mood indicator (for entries without photos) */}
                {entry && !entry.photo_url && moodConfig && isCurrentMonth && (
                  <div
                    className="absolute bottom-1 right-1 w-2 h-2 rounded-full"
                    style={{ backgroundColor: moodConfig.chartColor }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="text-center py-4 text-[#8B9A8F]">Loading...</div>
        )}
      </div>

      {/* Entry Preview Modal */}
      <EntryPreviewModal
        entry={selectedEntry}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEntry(null);
        }}
      />
    </div>
  );
}
