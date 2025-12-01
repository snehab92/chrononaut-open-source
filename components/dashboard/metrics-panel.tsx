"use client";

import { useState } from "react";
import { 
  Moon, 
  Dumbbell, 
  Brain, 
  Sparkles,
  ChevronRight,
  Heart,
  Shield,
  Target,
  Zap,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HabitsSection } from "./metrics/habits-section";
import { MoodSection } from "./metrics/mood-section";
import { CompassSection } from "./metrics/compass-section";
import { GrowthSection } from "./metrics/growth-section";

type Scope = "wellbeing" | "growth";

interface MetricsPanelProps {
  isWhoopConnected: boolean;
  healthMetrics?: {
    date: string;
    sleepHours: number;
    sleepConsistency: number;
    recoveryScore: number;
    hrvRmssd: number;
    restingHeartRate: number;
  }[];
  workouts?: {
    date: string;
    activityType: string;
    totalMinutes: number;
    isMeditation: boolean;
    zone1Minutes: number;
    zone2Minutes: number;
    zone3Minutes: number;
    zone4Minutes: number;
    zone5Minutes: number;
  }[];
  journalEntries?: {
    date: string;
    moodLabel: string;
  }[];
}

export function MetricsPanel({ 
  isWhoopConnected,
  healthMetrics = [],
  workouts = [],
  journalEntries = [],
}: MetricsPanelProps) {
  const [scope, setScope] = useState<Scope>("wellbeing");

  return (
    <div className="space-y-6">
      {/* Segmented Control */}
      <div className="flex items-center justify-center">
        <div className="inline-flex p-1 rounded-xl bg-[#E8DCC4]/50 border border-[#E8DCC4]">
          <button
            onClick={() => setScope("wellbeing")}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              scope === "wellbeing"
                ? "bg-white text-[#1E3D32] shadow-sm"
                : "text-[#5C7A6B] hover:text-[#1E3D32]"
            )}
          >
            Well-being
          </button>
          <button
            onClick={() => setScope("growth")}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              scope === "growth"
                ? "bg-white text-[#1E3D32] shadow-sm"
                : "text-[#5C7A6B] hover:text-[#1E3D32]"
            )}
          >
            Growth
          </button>
        </div>
      </div>

      {/* Content based on scope */}
      {scope === "wellbeing" ? (
        <div className="space-y-6">
          <HabitsSection 
            isWhoopConnected={isWhoopConnected}
            healthMetrics={healthMetrics}
            workouts={workouts}
          />
          <MoodSection journalEntries={journalEntries} />
          <CompassSection />
        </div>
      ) : (
        <GrowthSection />
      )}
    </div>
  );
}
