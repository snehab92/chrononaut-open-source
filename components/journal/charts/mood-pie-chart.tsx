"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { MOOD_CONFIG, type MoodLabel } from "@/lib/journal/types";

interface MoodData {
  mood: string;
  count: number;
  percentage: number;
}

interface MoodPieChartProps {
  data: MoodData[];
  className?: string;
}

export function MoodPieChart({ data, className }: MoodPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-[#8B9A8F] text-sm ${className}`}>
        No mood data yet
      </div>
    );
  }

  // Map data with colors
  const chartData = data.map((item) => {
    const config = MOOD_CONFIG[item.mood as MoodLabel];
    return {
      name: item.mood,
      value: item.count,
      percentage: item.percentage,
      color: config?.chartColor || "#8B9A8F",
      emoji: config?.emoji || "",
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-[#E8DCC4]">
          <p className="text-sm font-medium text-[#1E3D32]">
            {data.emoji} {data.name}
          </p>
          <p className="text-xs text-[#5C7A6B]">
            {data.value} {data.value === 1 ? "entry" : "entries"} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.08) return null; // Don't show label for tiny slices

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
          labelLine={false}
          label={renderCustomLabel}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Compact legend component for use outside the chart
export function MoodLegend({ data }: { data: MoodData[] }) {
  if (!data || data.length === 0) return null;

  const topMoods = data.slice(0, 5); // Show top 5 moods

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {topMoods.map((item) => {
        const config = MOOD_CONFIG[item.mood as MoodLabel];
        return (
          <div
            key={item.mood}
            className="flex items-center gap-1 text-xs"
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: config?.chartColor || "#8B9A8F" }}
            />
            <span className="text-[#5C7A6B]">{config?.emoji} {item.mood.split(" ")[0]}</span>
          </div>
        );
      })}
    </div>
  );
}
