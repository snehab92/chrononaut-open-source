"use client";

import { useState, useEffect } from "react";
import { Compass, Check, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MorningInsight {
  summary: string;
  recommendations?: string[];
  energyOptimalTasks?: string[];
  focusTheme?: string;
  recoveryScore?: number;
}

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
  insight: initialInsight,
  hasCommittedToday = false,
  onCommit
}: CompassSectionProps) {
  const [insight, setInsight] = useState<MorningInsight | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [committed, setCommitted] = useState(hasCommittedToday);
  const [error, setError] = useState<string | null>(null);

  // Fetch insight on mount
  useEffect(() => {
    fetchInsight();
  }, []);

  const fetchInsight = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/agents/pattern-analyzer/morning-insight");
      const data = await response.json();

      if (data.insight) {
        setInsight(data.insight);
      }
    } catch (err) {
      console.error("Error fetching insight:", err);
      setError("Failed to load insight");
    } finally {
      setIsLoading(false);
    }
  };

  const generateInsight = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/agents/pattern-analyzer/morning-insight?force=true", {
        method: "POST",
      });
      const data = await response.json();

      if (data.insight) {
        setInsight(data.insight);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error("Error generating insight:", err);
      setError("Failed to generate insight");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommit = async () => {
    if (committed || isCommitting) return;

    setIsCommitting(true);
    try {
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

  const hasInsight = insight && insight.summary;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#5C7A6B] uppercase tracking-wide">
          Compass
        </h3>
        {hasInsight && (
          <button
            onClick={generateInsight}
            disabled={isGenerating}
            className="text-xs text-[#8B9A8F] hover:text-[#5C7A6B] transition-colors flex items-center gap-1"
            title="Refresh insight"
          >
            <RefreshCw className={cn("h-3 w-3", isGenerating && "animate-spin")} />
            {isGenerating ? "Refreshing..." : "Refresh"}
          </button>
        )}
      </div>

      <div className="p-5 rounded-xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[#D4A84B]/10 text-[#D4A84B]">
            <Compass className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#1E3D32] mb-1">
              Today's Insight
            </p>

            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-[#8B9A8F]">
                <div className="h-4 w-4 border-2 border-[#D4A84B] border-t-transparent rounded-full animate-spin" />
                Loading your insight...
              </div>
            ) : hasInsight ? (
              <div className="space-y-3">
                <p className="text-sm text-[#5C7A6B] leading-relaxed">
                  {insight.summary}
                </p>

                {/* Focus Theme Badge */}
                {insight.focusTheme && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4A84B]/10 text-[#D4A84B]">
                    <Sparkles className="h-3 w-3" />
                    <span className="text-xs font-medium">{insight.focusTheme}</span>
                  </div>
                )}

                {/* Recommendations */}
                {insight.recommendations && insight.recommendations.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-[#5C7A6B] uppercase tracking-wide">
                      Suggestions
                    </p>
                    <ul className="space-y-1">
                      {insight.recommendations.slice(0, 3).map((rec, i) => (
                        <li key={i} className="text-xs text-[#8B9A8F] flex items-start gap-2">
                          <span className="text-[#D4A84B] mt-0.5">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recovery Score */}
                {insight.recoveryScore !== undefined && (
                  <div className="flex items-center gap-2 text-xs text-[#8B9A8F]">
                    <span className={cn(
                      "font-medium",
                      insight.recoveryScore >= 67 ? "text-green-600" :
                      insight.recoveryScore >= 34 ? "text-amber-600" :
                      "text-red-500"
                    )}>
                      {insight.recoveryScore}%
                    </span>
                    recovery
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[#8B9A8F] italic">
                  Your daily AI insight analyzes your patterns across sleep, tasks, and journal entries to provide personalized guidance.
                </p>
                <button
                  onClick={generateInsight}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#D4A84B]/10 text-[#D4A84B] text-sm font-medium hover:bg-[#D4A84B]/20 transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Today's Insight
                    </>
                  )}
                </button>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-500 mt-2">{error}</p>
            )}
          </div>
        </div>

        {/* Commit button - only show when insight is available */}
        {hasInsight && (
          <button
            onClick={handleCommit}
            disabled={committed || isCommitting}
            className={cn(
              "w-full py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300",
              "flex items-center justify-center gap-2",
              committed
                ? "bg-[#2D5A47] text-white cursor-default"
                : "bg-[#E8DCC4] text-[#1E3D32] hover:bg-[#D4A84B] hover:text-white"
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
        )}
      </div>
    </div>
  );
}
