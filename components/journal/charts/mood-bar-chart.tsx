"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MOOD_CONFIG, type MoodLabel, type MoodTrackerEntry } from "@/lib/journal/types";

interface MoodBarChartProps {
  entries: MoodTrackerEntry[];
  onDayClick: (date: string) => void;
  months: number; // 3, 6, or 12
}

interface WeekData {
  weekStart: Date;
  days: {
    date: string;
    dayOfWeek: number; // 0-6 (Sun-Sat)
    entry: MoodTrackerEntry | null;
  }[];
}

// Group entries by week (columns) with days as rows
function groupByWeek(entries: MoodTrackerEntry[], months: number): WeekData[] {
  const weeks: WeekData[] = [];
  const entryMap = new Map<string, MoodTrackerEntry>();

  entries.forEach((e) => entryMap.set(e.entry_date, e));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate start date based on months
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - months);

  // Start from the Sunday of the start date's week
  const current = new Date(startDate);
  current.setDate(current.getDate() - current.getDay());
  current.setHours(0, 0, 0, 0);

  // End at the Saturday after today
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  while (current <= endDate) {
    const weekStart = new Date(current);
    const days = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(current);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().split("T")[0];
      days.push({
        date: dateKey,
        dayOfWeek: i,
        entry: entryMap.get(dateKey) || null,
      });
    }

    weeks.push({ weekStart, days });
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

// Format month label for week column
function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short" });
}

export function MoodBarChart({ entries, onDayClick, months }: MoodBarChartProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const today = new Date().toISOString().split("T")[0];
  const weeks = groupByWeek(entries, months);

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLButtonElement>,
    dateKey: string
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
    setHoveredDay(dateKey);
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
  };

  // Find entry for hovered day
  const hoveredEntry = hoveredDay
    ? entries.find((e) => e.entry_date === hoveredDay)
    : null;
  const hoveredMoodConfig = hoveredEntry?.mood_label
    ? MOOD_CONFIG[hoveredEntry.mood_label as MoodLabel]
    : null;

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Determine which weeks should show month labels
  const monthLabels: { weekIndex: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, index) => {
    const month = week.weekStart.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ weekIndex: index, label: getMonthLabel(week.weekStart) });
      lastMonth = month;
    }
  });

  // Calculate cell size based on number of weeks to fill available space
  // Larger cells for shorter time ranges
  const cellSize = months <= 3 ? 28 : months <= 6 ? 20 : 14;
  const gap = months <= 3 ? 4 : months <= 6 ? 3 : 2;

  return (
    <div className="relative w-full">
      {/* Month labels row */}
      <div className="flex mb-2 pl-12">
        <div className="flex" style={{ gap: `${gap}px` }}>
          {weeks.map((week, weekIndex) => {
            const label = monthLabels.find((m) => m.weekIndex === weekIndex);
            return (
              <div
                key={weekIndex}
                className="text-xs text-[#8B9A8F] font-medium"
                style={{ width: `${cellSize}px` }}
              >
                {label?.label || ""}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart grid - days as rows, weeks as columns */}
      <div className="flex">
        {/* Day labels column */}
        <div className="flex flex-col mr-3" style={{ gap: `${gap}px` }}>
          {dayLabels.map((day, i) => (
            <div
              key={i}
              className="text-xs text-[#8B9A8F] font-medium flex items-center justify-end pr-1"
              style={{ height: `${cellSize}px` }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Weeks grid */}
        <div className="flex overflow-x-auto pb-2" style={{ gap: `${gap}px` }}>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col" style={{ gap: `${gap}px` }}>
              {week.days.map((day) => {
                const isFuture = day.date > today;
                const moodConfig = day.entry?.mood_label
                  ? MOOD_CONFIG[day.entry.mood_label as MoodLabel]
                  : null;

                return (
                  <button
                    key={day.date}
                    onClick={() => day.entry && onDayClick(day.date)}
                    onMouseEnter={(e) => handleMouseEnter(e, day.date)}
                    onMouseLeave={handleMouseLeave}
                    disabled={isFuture || !day.entry}
                    className={cn(
                      "rounded-md transition-all flex items-center justify-center",
                      "border border-transparent",
                      isFuture && "opacity-30 cursor-not-allowed",
                      day.entry
                        ? "cursor-pointer hover:ring-2 hover:ring-[#D4A84B] hover:scale-110"
                        : "bg-[#ebedf0] cursor-default",
                      day.date === today && "ring-2 ring-[#D4A84B]"
                    )}
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      backgroundColor: moodConfig?.chartColor || undefined,
                    }}
                    title={day.date}
                  >
                    {/* Show emoji for larger cells */}
                    {moodConfig && cellSize >= 24 && (
                      <span className="text-sm drop-shadow-sm">{moodConfig.emoji}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-[#E8DCC4] whitespace-nowrap">
            <p className="text-xs font-medium text-[#1E3D32]">
              {new Date(hoveredDay + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {hoveredEntry ? (
              <p className="text-xs text-[#5C7A6B]">
                {hoveredMoodConfig?.emoji} {hoveredEntry.mood_label}
              </p>
            ) : (
              <p className="text-xs text-[#8B9A8F] italic">No entry</p>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-[#E8DCC4]">
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#ebedf0]" />
            <span className="text-sm text-[#8B9A8F]">No entry</span>
          </div>
          {Object.entries(MOOD_CONFIG).map(([mood, config]) => (
            <div key={mood} className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ backgroundColor: config.chartColor }}
              >
                <span className="text-xs">{config.emoji}</span>
              </div>
              <span className="text-sm text-[#5C7A6B]">
                {mood}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
