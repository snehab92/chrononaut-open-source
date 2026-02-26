"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MoodBarChart } from "@/components/journal/charts/mood-bar-chart";
import { EntryPreviewModal } from "@/components/journal/modals/entry-preview-modal";
import { type JournalEntry, type MoodTrackerEntry } from "@/lib/journal/types";

type DateRange = "3m" | "6m" | "1y";

const DATE_RANGES: { id: DateRange; label: string; months: number }[] = [
  { id: "3m", label: "3 months", months: 3 },
  { id: "6m", label: "6 months", months: 6 },
  { id: "1y", label: "1 year", months: 12 },
];

export function MoodTrackerView() {
  const supabase = createClient();

  const [dateRange, setDateRange] = useState<DateRange>("3m");
  const [entries, setEntries] = useState<MoodTrackerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load entries when date range changes
  useEffect(() => {
    loadEntries();
  }, [dateRange]);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const rangeConfig = DATE_RANGES.find((r) => r.id === dateRange);
      const months = rangeConfig?.months || 3;

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("journal_entries")
        .select("entry_date, mood_label, happened, feelings")
        .gte("entry_date", startDateStr)
        .lte("entry_date", endDateStr)
        .order("entry_date", { ascending: true });

      if (error) throw error;

      setEntries(data as MoodTrackerEntry[]);
    } catch (error) {
      console.error("Failed to load mood entries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDayClick = async (date: string) => {
    try {
      const res = await fetch(`/api/journal?date=${date}`);
      if (res.ok) {
        const { entry } = await res.json();
        if (entry) {
          setSelectedEntry(entry);
          setIsModalOpen(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch entry:", error);
    }
  };

  // Calculate mood summary
  const moodCounts = new Map<string, number>();
  entries.forEach((e) => {
    if (e.mood_label) {
      moodCounts.set(e.mood_label, (moodCounts.get(e.mood_label) || 0) + 1);
    }
  });

  const topMoods = Array.from(moodCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const entriesWithMood = entries.filter((e) => e.mood_label).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-[#E8DCC4] bg-[#FAF8F5]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-[#5C7A6B]" />
            <h2 className="text-lg font-serif font-semibold text-[#1E3D32]">
              Mood Tracker
            </h2>
            {entriesWithMood > 0 && (
              <span className="text-sm text-[#8B9A8F]">
                {entriesWithMood} days tracked
              </span>
            )}
          </div>

          {/* Date Range Selector */}
          <div className="flex gap-1 p-1 bg-white rounded-lg border border-[#E8DCC4]">
            {DATE_RANGES.map((range) => (
              <Button
                key={range.id}
                variant="ghost"
                size="sm"
                onClick={() => setDateRange(range.id)}
                className={cn(
                  "h-8 px-3 text-xs",
                  dateRange === range.id
                    ? "bg-[#F5F0E6] text-[#1E3D32] font-medium"
                    : "text-[#8B9A8F]"
                )}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Inline Stats */}
        {topMoods.length > 0 && (
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="text-[#8B9A8F]">Top moods:</span>
            {topMoods.map(([mood, count], index) => (
              <span key={mood} className="text-[#5C7A6B]">
                <strong>{mood}</strong> ({count})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Chart Container - takes remaining space */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-[#8B9A8F]">
            Loading mood data...
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Heart className="w-16 h-16 text-[#C4B8A8] mb-4" />
            <h3 className="text-xl font-medium text-[#1E3D32] mb-2">
              No mood data yet
            </h3>
            <p className="text-sm text-[#8B9A8F] text-center max-w-md">
              Complete daily journal entries to track your mood patterns over time.
              Your moods will appear here as a visual timeline.
            </p>
          </div>
        ) : (
          <MoodBarChart
            entries={entries}
            onDayClick={handleDayClick}
            months={DATE_RANGES.find((r) => r.id === dateRange)?.months || 3}
          />
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
