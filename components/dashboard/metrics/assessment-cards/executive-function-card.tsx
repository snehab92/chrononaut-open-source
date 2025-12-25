"use client";

import { Zap, ChevronRight, TrendingUp, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExecutiveFunctionData } from "@/lib/assessments/types";

interface ExecutiveFunctionCardProps {
  data: ExecutiveFunctionData | null;
  isComplete: boolean;
  historicalScores?: { date: string; total: number }[];
  reminderDue?: boolean;
  onExpand: () => void;
}

export function ExecutiveFunctionCard({
  data,
  isComplete,
  historicalScores = [],
  reminderDue = false,
  onExpand,
}: ExecutiveFunctionCardProps) {
  const totalScore = data?.total_score;
  const hasScore = typeof totalScore === 'number' && totalScore > 0;
  // Use 252 as max (12 skills * 21) instead of old 210 (10 skills)
  const maxScore = 252;
  const percentage = hasScore ? Math.round((totalScore / maxScore) * 100) : 0;

  // Simple sparkline from historical data
  const hasHistory = historicalScores.length > 1;

  return (
    <button
      onClick={onExpand}
      className="group p-4 rounded-xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 text-left w-full relative"
    >
      {/* Reminder badge */}
      {reminderDue && (
        <div className="absolute -top-1.5 -right-1.5 flex items-center gap-1 px-2 py-0.5 bg-[#D4A84B] text-white text-[10px] font-medium rounded-full animate-pulse">
          <Bell className="h-2.5 w-2.5" />
          Retake Due
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
          <Zap className="h-4 w-4" />
        </div>
        <ChevronRight className="h-4 w-4 text-[#8B9A8F] group-hover:text-[#5C7A6B] transition-colors" />
      </div>

      {/* Title */}
      <h4 className="font-medium text-[#1E3D32] mb-2">
        Executive Function
      </h4>

      {/* Content */}
      {isComplete && hasScore ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {/* Score as percentage */}
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-blue-600">
                {percentage}%
              </span>
              <span className="text-xs text-[#8B9A8F]">
                ({totalScore}/252)
              </span>
            </div>

            {/* Mini sparkline */}
            {hasHistory && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-[#8B9A8F]" />
                <MiniSparkline data={historicalScores.map(h => h.total)} />
              </div>
            )}
          </div>

          {/* Top skills preview */}
          {data?.strongest_skills && data.strongest_skills.length > 0 && (
            <p className="text-xs text-[#8B9A8F] truncate">
              Top: {data.strongest_skills.slice(0, 2).join(', ')}
            </p>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm text-[#8B9A8F] mb-2">
            Track your 10 executive function skills
          </p>
          <p className="text-xs text-[#D4A84B] font-medium">
            Edit in IDE →
          </p>
        </div>
      )}
    </button>
  );
}

/**
 * Mini sparkline component for showing EF score trends
 */
function MiniSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;

  const maxScore = 252;
  const width = 40;
  const height = 16;

  // Normalize data points to fit in the SVG
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (value / maxScore) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="#3B82F6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - (data[data.length - 1] / maxScore) * height}
          r="2"
          fill="#3B82F6"
        />
      )}
    </svg>
  );
}
