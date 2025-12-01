"use client";

import { MOOD_CONFIG, type MoodLabel } from "@/lib/journal/types";

interface MoodData {
  mood: string;
  count: number;
  percentage: number;
}

interface MoodCompactChartProps {
  data: MoodData[];
}

// Compact horizontal bar visualization for moods
export function MoodCompactChart({ data }: MoodCompactChartProps) {
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-[#8B9A8F] italic">No mood data yet</p>
    );
  }

  // Take top 4 moods for compact display
  const topMoods = data.slice(0, 4);
  const maxPercentage = Math.max(...topMoods.map(m => m.percentage));

  return (
    <div className="space-y-2">
      {topMoods.map((item) => {
        const config = MOOD_CONFIG[item.mood as MoodLabel];
        const barWidth = (item.percentage / maxPercentage) * 100;

        return (
          <div key={item.mood} className="flex items-center gap-2">
            <span className="text-sm w-5 flex-shrink-0">{config?.emoji || ""}</span>
            <div className="flex-1 h-3 bg-[#F5F0E6] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: config?.chartColor || "#8B9A8F",
                }}
              />
            </div>
            <span className="text-xs text-[#8B9A8F] w-8 text-right flex-shrink-0">
              {item.percentage}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
