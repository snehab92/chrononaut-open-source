"use client";

import { Shield, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SelfCompassionData } from "@/lib/assessments/types";
import { interpretSelfCompassionScore } from "@/lib/assessments";

interface SelfCompassionCardProps {
  data: SelfCompassionData | null;
  isComplete: boolean;
  onExpand: () => void;
}

export function SelfCompassionCard({ data, isComplete, onExpand }: SelfCompassionCardProps) {
  const score = data?.overall_score;
  const hasScore = typeof score === 'number' && score > 0;

  // Calculate percentage for the circular progress (1-5 scale -> 0-100%)
  const percentage = hasScore ? ((score - 1) / 4) * 100 : 0;

  // Get interpretation
  const interpretation = hasScore ? interpretSelfCompassionScore(score) : null;

  // Color based on interpretation
  const getColors = () => {
    if (!interpretation) return { text: 'text-teal-600', bg: 'bg-teal-100', ring: 'stroke-teal-500' };
    switch (interpretation) {
      case 'High':
        return { text: 'text-green-600', bg: 'bg-green-100', ring: 'stroke-green-500' };
      case 'Moderate':
        return { text: 'text-yellow-600', bg: 'bg-yellow-100', ring: 'stroke-yellow-500' };
      case 'Low':
        return { text: 'text-red-500', bg: 'bg-red-100', ring: 'stroke-red-400' };
    }
  };

  const colors = getColors();

  return (
    <button
      onClick={onExpand}
      className="group p-4 rounded-xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 text-left w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
          <Shield className="h-4 w-4" />
        </div>
        <ChevronRight className="h-4 w-4 text-[#8B9A8F] group-hover:text-[#5C7A6B] transition-colors" />
      </div>

      {/* Title */}
      <h4 className="font-medium text-[#1E3D32] mb-2">
        Self-Compassion
      </h4>

      {/* Content */}
      {isComplete && hasScore ? (
        <div className="flex items-center gap-3">
          {/* Circular progress */}
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
              {/* Background circle */}
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                className="stroke-[#E8DCC4]"
                strokeWidth="3"
              />
              {/* Progress circle */}
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                className={colors.ring}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${percentage}, 100`}
              />
            </svg>
            {/* Score in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-sm font-semibold", colors.text)}>
                {score.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Interpretation */}
          <div>
            <span className={cn(
              "inline-block px-2 py-0.5 text-xs font-medium rounded-full",
              colors.bg,
              colors.text
            )}>
              {interpretation}
            </span>
            <p className="text-xs text-[#8B9A8F] mt-1">
              out of 5.0
            </p>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-[#8B9A8F] mb-2">
            Measure your self-kindness, common humanity, and mindfulness
          </p>
          <p className="text-xs text-[#D4A84B] font-medium">
            Edit in IDE →
          </p>
        </div>
      )}
    </button>
  );
}
