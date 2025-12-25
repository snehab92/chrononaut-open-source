"use client";

import { Star, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { StrengthsProfileData } from "@/lib/assessments/types";

interface ExtendedStrengthsData extends StrengthsProfileData {
  _quadrant_counts?: {
    realized: number;
    unrealized: number;
    learned: number;
    weakness: number;
  };
}

interface StrengthsCardProps {
  data: ExtendedStrengthsData | null;
  isComplete: boolean;
  onExpand: () => void;
}

export function StrengthsCard({ data, isComplete, onExpand }: StrengthsCardProps) {
  const quadrants = data?.quadrants;

  // Use actual counts from DB if available, otherwise count from arrays
  const counts = data?._quadrant_counts || {
    realized: quadrants?.realized?.filter(s => s?.trim().length > 0).length || 0,
    unrealized: quadrants?.unrealized?.filter(s => s?.trim().length > 0).length || 0,
    learned: quadrants?.learned?.filter(s => s?.trim().length > 0).length || 0,
    weakness: quadrants?.weakness?.filter(s => s?.trim().length > 0).length || 0,
  };

  const hasData = counts.realized > 0 || counts.unrealized > 0 || counts.learned > 0 || counts.weakness > 0;

  return (
    <button
      onClick={onExpand}
      className="group p-4 rounded-xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 text-left w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
          <Star className="h-4 w-4" />
        </div>
        <ChevronRight className="h-4 w-4 text-[#8B9A8F] group-hover:text-[#5C7A6B] transition-colors" />
      </div>

      {/* Title */}
      <h4 className="font-medium text-[#1E3D32] mb-2">
        Strengths Profile
      </h4>

      {/* Content */}
      {isComplete && hasData ? (
        <div className="space-y-2">
          {/* Mini 2x2 quadrant grid */}
          <div className="grid grid-cols-2 gap-1">
            {/* Realized - Green */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-50 border border-green-200">
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(counts.realized, 4) }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-green-500" />
                ))}
              </div>
              <span className="text-[10px] text-green-700">Realized</span>
            </div>

            {/* Unrealized - Blue */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 border border-blue-200">
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(counts.unrealized, 4) }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                ))}
              </div>
              <span className="text-[10px] text-blue-700">Unrealized</span>
            </div>

            {/* Learned - Yellow */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-50 border border-yellow-200">
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(counts.learned, 4) }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                ))}
              </div>
              <span className="text-[10px] text-yellow-700">Learned</span>
            </div>

            {/* Weakness - Red */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 border border-red-200">
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(counts.weakness, 4) }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-red-400" />
                ))}
              </div>
              <span className="text-[10px] text-red-700">Weakness</span>
            </div>
          </div>

          <p className="text-xs text-[#8B9A8F]">
            {counts.realized} realized · {counts.learned} learned
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-[#8B9A8F] mb-2">
            Map your strengths across 4 quadrants
          </p>
          <p className="text-xs text-[#D4A84B] font-medium">
            Edit in IDE →
          </p>
        </div>
      )}
    </button>
  );
}
