"use client";

import { useState } from "react";
import { Compass, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompassSectionProps {
  insight?: {
    id: string;
    summary: string;
    createdAt: string;
  };
  hasCommittedToday?: boolean;
  onCommit?: () => void;
}

export function CompassSection({ 
  insight, 
  hasCommittedToday = false,
  onCommit 
}: CompassSectionProps) {
  const [isCommitting, setIsCommitting] = useState(false);
  const [committed, setCommitted] = useState(hasCommittedToday);

  const handleCommit = async () => {
    if (committed || isCommitting) return;
    
    setIsCommitting(true);
    try {
      // Call the onCommit callback if provided
      if (onCommit) {
        await onCommit();
      }
      setCommitted(true);
    } catch (error) {
      console.error('Failed to commit:', error);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[#5C7A6B] uppercase tracking-wide">
        Compass
      </h3>

      <div className="p-5 rounded-xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[#D4A84B]/10 text-[#D4A84B]">
            <Compass className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#1E3D32] mb-1">
              Today's Insight
            </p>
            {insight ? (
              <p className="text-sm text-[#5C7A6B] leading-relaxed">
                {insight.summary}
              </p>
            ) : (
              <p className="text-sm text-[#8B9A8F] italic">
                Your daily AI insight will appear here each morning. It analyzes your patterns 
                across sleep, tasks, and journal entries to provide personalized guidance.
              </p>
            )}
          </div>
        </div>

        {/* Commit button */}
        <button
          onClick={handleCommit}
          disabled={committed || isCommitting || !insight}
          className={cn(
            "w-full py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300",
            "flex items-center justify-center gap-2",
            committed
              ? "bg-[#2D5A47] text-white cursor-default"
              : insight
                ? "bg-[#E8DCC4] text-[#1E3D32] hover:bg-[#D4A84B] hover:text-white"
                : "bg-[#E8DCC4]/50 text-[#8B9A8F] cursor-not-allowed"
          )}
        >
          {committed ? (
            <>
              <Check className="h-4 w-4" />
              Committed to living aligned today
            </>
          ) : isCommitting ? (
            <>
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Committing...
            </>
          ) : (
            <>
              <Compass className="h-4 w-4" />
              I commit to living aligned today
            </>
          )}
        </button>

        {/* Placeholder note */}
        {!insight && (
          <p className="mt-3 text-xs text-[#8B9A8F] text-center">
            AI Pattern Analyst integration coming soon
          </p>
        )}
      </div>
    </div>
  );
}
