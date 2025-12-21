"use client";

import { useEffect, useState } from "react";
import { X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FocusCue } from "@/lib/focus/cue-types";
import { cn } from "@/lib/utils";

interface FocusCuePopupProps {
  cue: FocusCue | null;
  onDismiss: () => void;
  onSnooze: (minutes?: number) => void;
  onAction: (action: string) => void;
}

// Gentle pastel gradients for visual delight
const CUE_STYLES: Record<string, { gradient: string; glow: string; accent: string }> = {
  session_milestone: {
    gradient: "from-amber-100 via-yellow-50 to-orange-50",
    glow: "shadow-amber-200/50",
    accent: "from-amber-400 to-orange-400",
  },
  break_reminder: {
    gradient: "from-sky-100 via-blue-50 to-cyan-50",
    glow: "shadow-sky-200/50",
    accent: "from-sky-400 to-blue-400",
  },
  tab_return: {
    gradient: "from-violet-100 via-purple-50 to-fuchsia-50",
    glow: "shadow-violet-200/50",
    accent: "from-violet-400 to-purple-400",
  },
  task_progress: {
    gradient: "from-emerald-100 via-green-50 to-teal-50",
    glow: "shadow-emerald-200/50",
    accent: "from-emerald-400 to-green-400",
  },
  energy_check: {
    gradient: "from-rose-100 via-pink-50 to-red-50",
    glow: "shadow-rose-200/50",
    accent: "from-rose-400 to-pink-400",
  },
  encouragement: {
    gradient: "from-indigo-100 via-purple-50 to-pink-50",
    glow: "shadow-indigo-200/50",
    accent: "from-indigo-400 to-purple-400",
  },
  getting_started: {
    gradient: "from-orange-100 via-amber-50 to-yellow-50",
    glow: "shadow-orange-200/50",
    accent: "from-orange-400 to-amber-400",
  },
  completion_nudge: {
    gradient: "from-lime-100 via-green-50 to-emerald-50",
    glow: "shadow-lime-200/50",
    accent: "from-lime-400 to-green-400",
  },
};

export function FocusCuePopup({
  cue,
  onDismiss,
  onSnooze,
  onAction,
}: FocusCuePopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (cue) {
      // Small delay before showing for smoother feel
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setIsExiting(false);
    }
  }, [cue]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      setIsVisible(false);
      onDismiss();
    }, 200);
  };

  const handleSnooze = (minutes?: number) => {
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      setIsVisible(false);
      onSnooze(minutes);
    }, 200);
  };

  const handleAction = (action: string) => {
    if (action === "dismiss") {
      handleDismiss();
    } else if (action === "snooze") {
      handleSnooze();
    } else {
      setIsExiting(true);
      setTimeout(() => {
        setIsExiting(false);
        setIsVisible(false);
        onAction(action);
      }, 200);
    }
  };

  if (!cue || !isVisible) return null;

  const styles = CUE_STYLES[cue.type] || CUE_STYLES.encouragement;

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 max-w-sm",
        "rounded-2xl overflow-hidden",
        "shadow-xl",
        styles.glow,
        // Animation classes
        "transition-all duration-300 ease-out",
        isExiting
          ? "opacity-0 translate-y-2 scale-98"
          : "opacity-100 translate-y-0 scale-100",
        // Entry animation
        "animate-in fade-in slide-in-from-bottom-4"
      )}
    >
      {/* Main content */}
      <div
        className={cn(
          "relative bg-gradient-to-br p-5",
          styles.gradient
        )}
      >
        {/* Subtle animated background shimmer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/30 blur-2xl animate-pulse"
            style={{ animationDuration: "3s" }}
          />
          <div
            className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-white/20 blur-xl animate-pulse"
            style={{ animationDuration: "4s", animationDelay: "1s" }}
          />
        </div>

        {/* Content */}
        <div className="relative">
          {/* Header with emoji and close */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span
                className="text-3xl animate-bounce"
                style={{ animationDuration: "2s", animationIterationCount: "2" }}
                role="img"
                aria-label={cue.type}
              >
                {cue.emoji}
              </span>
              <div>
                <h3 className="font-semibold text-[#1E3D32] text-base">
                  {cue.title}
                </h3>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full hover:bg-black/5 transition-colors text-[#5C7A6B]/60 hover:text-[#1E3D32]"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Message */}
          <p className="text-sm text-[#3D4F47] leading-relaxed mb-4">
            {cue.message}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Primary action */}
            {cue.primaryAction && (
              <Button
                size="sm"
                onClick={() => handleAction(cue.primaryAction!.action)}
                className={cn(
                  "bg-[#2D5A47] hover:bg-[#1E3D32] text-white",
                  "shadow-sm hover:shadow-md transition-all",
                  "text-sm font-medium"
                )}
              >
                {cue.primaryAction.label}
              </Button>
            )}

            {/* Secondary action */}
            {cue.secondaryAction && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction(cue.secondaryAction!.action)}
                className={cn(
                  "border-[#5C7A6B]/30 text-[#3D4F47] bg-white/50",
                  "hover:bg-white/80 hover:border-[#5C7A6B]/50",
                  "text-sm font-medium"
                )}
              >
                {cue.secondaryAction.label}
              </Button>
            )}

            {/* Snooze option if available and not already shown as secondary */}
            {cue.snoozeMinutes && cue.secondaryAction?.action !== "snooze" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSnooze(cue.snoozeMinutes)}
                className="text-[#5C7A6B]/70 hover:text-[#3D4F47] hover:bg-white/30 text-xs"
              >
                <Clock className="w-3 h-3 mr-1" />
                {cue.snoozeMinutes}m
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div
        className={cn(
          "h-1 bg-gradient-to-r",
          styles.accent
        )}
      />
    </div>
  );
}
