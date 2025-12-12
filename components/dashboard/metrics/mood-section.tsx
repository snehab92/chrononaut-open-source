"use client";

import { cn } from "@/lib/utils";

// Mood enum from PRD
const MOOD_LABELS = [
  'Threatened', 'Stressed', 'Unfocused', 'Rejected',
  'Creative', 'Adventurous', 'Angry', 'Manic',
  'Calm', 'Content', 'Socially Connected', 'Romantic'
] as const;

type MoodLabel = typeof MOOD_LABELS[number];

// Mood to emoji + color mapping
const MOOD_CONFIG: Record<MoodLabel, { emoji: string; color: string; bgColor: string }> = {
  'Threatened': { emoji: '😰', color: 'text-red-600', bgColor: 'bg-red-100' },
  'Stressed': { emoji: '😣', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  'Unfocused': { emoji: '😶‍🌫️', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  'Rejected': { emoji: '😢', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  'Creative': { emoji: '✨', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  'Adventurous': { emoji: '🤩', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  'Angry': { emoji: '😠', color: 'text-red-700', bgColor: 'bg-red-100' },
  'Manic': { emoji: '🤪', color: 'text-pink-600', bgColor: 'bg-pink-100' },
  'Calm': { emoji: '😌', color: 'text-teal-600', bgColor: 'bg-teal-100' },
  'Content': { emoji: '😊', color: 'text-green-600', bgColor: 'bg-green-100' },
  'Socially Connected': { emoji: '🥰', color: 'text-rose-600', bgColor: 'bg-rose-100' },
  'Romantic': { emoji: '💕', color: 'text-pink-500', bgColor: 'bg-pink-100' },
};

interface MoodSectionProps {
  journalEntries: {
    date: string;
    moodLabel: string;
  }[];
}

// Get current week dates (Sunday-Saturday)
function getCurrentWeekDates(): { date: string; dayName: string; isToday: boolean }[] {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);
  
  const today = now.toISOString().split('T')[0];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return dayNames.map((dayName, i) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    return {
      date: dateStr,
      dayName,
      isToday: dateStr === today,
    };
  });
}

export function MoodSection({ journalEntries }: MoodSectionProps) {
  const weekDates = getCurrentWeekDates();
  const today = new Date().toISOString().split('T')[0];

  // Create a map of date -> mood
  const moodByDate = new Map<string, string>();
  for (const entry of journalEntries) {
    if (entry.moodLabel) {
      moodByDate.set(entry.date, entry.moodLabel);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[#5C7A6B] uppercase tracking-wide">
        Mood
      </h3>

      <div className="p-4 rounded-xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm">
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map(({ date, dayName, isToday }) => {
            const mood = moodByDate.get(date) as MoodLabel | undefined;
            const isFuture = date > today;
            const config = mood ? MOOD_CONFIG[mood] : null;

            return (
              <div 
                key={date}
                className={cn(
                  "flex flex-col items-center gap-1",
                  isToday && "relative"
                )}
              >
                {/* Day label */}
                <span className={cn(
                  "text-xs font-medium",
                  isToday ? "text-[#D4A84B]" : "text-[#8B9A8F]"
                )}>
                  {dayName}
                </span>
                
                {/* Mood face */}
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all",
                    isFuture && "opacity-30",
                    isToday && "ring-2 ring-[#D4A84B] ring-offset-2",
                    config ? config.bgColor : "bg-gray-100"
                  )}
                  title={mood || (isFuture ? 'Future' : 'No journal entry')}
                >
                  {isFuture ? (
                    <span className="text-gray-300">·</span>
                  ) : config ? (
                    <span>{config.emoji}</span>
                  ) : (
                    <span className="text-gray-300">🩶</span>
                  )}
                </div>

                {/* Mood label (only if has mood and not too many chars) */}
                {mood && !isFuture && (
                  <span className={cn(
                    "text-[10px] truncate max-w-[50px]",
                    config?.color || "text-gray-500"
                  )}>
                    {mood.split(' ')[0]}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend / Empty state */}
        <div className="mt-4 pt-3 border-t border-[#E8DCC4]">
          {journalEntries.length === 0 ? (
            <p className="text-xs text-[#8B9A8F] text-center">
              Complete your daily journal to track mood patterns
            </p>
          ) : (
            <p className="text-xs text-[#8B9A8F] text-center">
              🩶 = No journal entry · Mood is AI-inferred from journal
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
