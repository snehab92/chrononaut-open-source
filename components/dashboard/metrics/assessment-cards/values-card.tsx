"use client";

import { Leaf, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ValuesAlignmentInsights } from "@/lib/assessments/types";

interface ValuesCardProps {
  data: ValuesAlignmentInsights | null;
  isComplete: boolean;
  livingAlignedScore?: number;
  onExpand: () => void;
}

// Mini donut chart for living aligned score
function AlignedDonut({ score }: { score: number }) {
  const percentage = Math.min(100, Math.max(0, score));
  const circumference = 2 * Math.PI * 12;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  // Color based on score
  const getColor = () => {
    if (percentage >= 80) return { stroke: '#4CAF50', text: 'text-green-600' };
    if (percentage >= 60) return { stroke: '#5C7A6B', text: 'text-[#5C7A6B]' };
    if (percentage >= 40) return { stroke: '#D4A84B', text: 'text-amber-600' };
    return { stroke: '#EF5350', text: 'text-red-500' };
  };

  const colors = getColor();

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
          {/* Background circle */}
          <circle
            cx="16"
            cy="16"
            r="12"
            fill="none"
            className="stroke-[#E8DCC4]"
            strokeWidth="3"
          />
          {/* Progress circle */}
          <circle
            cx="16"
            cy="16"
            r="12"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
          />
        </svg>
      </div>
      <span className={cn("text-sm font-semibold", colors.text)}>
        {score}% aligned
      </span>
    </div>
  );
}

export function ValuesCard({ data, isComplete, livingAlignedScore, onExpand }: ValuesCardProps) {
  // Extract the 3 core values
  const values = data?.values
    ?.filter(v => v.name?.trim().length > 0)
    .slice(0, 3)
    .map(v => v.name) || [];

  return (
    <button
      onClick={onExpand}
      className="group p-4 rounded-xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 text-left w-full"
    >
      {/* Header - matches other cards structure exactly */}
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-[#E8F5E9] text-[#5C7A6B]">
          <Leaf className="h-4 w-4" />
        </div>
        <ChevronRight className="h-4 w-4 text-[#8B9A8F] group-hover:text-[#5C7A6B] transition-colors" />
      </div>

      {/* Title */}
      <h4 className="font-medium text-[#1E3D32] mb-2">
        Values Alignment
      </h4>

      {/* Content */}
      {isComplete && values.length > 0 ? (
        <div className="space-y-3">
          {/* Living Aligned Score with donut */}
          {livingAlignedScore !== undefined && (
            <AlignedDonut score={livingAlignedScore} />
          )}

          {/* Values as pills */}
          <div className="flex flex-wrap gap-1.5">
            {values.map((value, i) => (
              <span
                key={i}
                className="px-2.5 py-1 text-sm font-medium bg-[#E8F5E9] text-[#2D5A47] rounded-lg border border-[#C8E6C9]"
              >
                {value}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-[#8B9A8F] mb-2">
            Identify your 3 core values and what living aligned looks like
          </p>
          <p className="text-xs text-[#5C7A6B] font-medium">
            Take Assessment →
          </p>
        </div>
      )}
    </button>
  );
}
