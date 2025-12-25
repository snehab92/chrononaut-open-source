"use client";

import { useState, useEffect } from "react";
import { Moon, Dumbbell, Brain, ChevronRight, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HabitsSectionProps {
  isWhoopConnected: boolean;
  healthMetrics: {
    date: string;
    sleepHours: number;
    sleepConsistency: number;
    recoveryScore: number;
    hrvRmssd: number;
    restingHeartRate: number;
  }[];
  workouts: {
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
}

// Goals
const SLEEP_HOURS_GOAL = 8;
const SLEEP_CONSISTENCY_GOAL = 84;
const EXERCISE_LOW_GOAL_MINUTES = 150; // 2.5 hours zones 1-3
const EXERCISE_HIGH_GOAL_MINUTES = 15; // 15 min zones 4-5
const MEDITATION_DAILY_GOAL = 1;

// Get color based on percentage of goal (red 0-25%, yellow 25-75%, green 75-100%)
function getGoalColor(percentage: number): { dot: string; bar: string } {
  if (percentage >= 75) {
    return { dot: "bg-green-500", bar: "bg-green-500" };
  } else if (percentage >= 25) {
    return { dot: "bg-yellow-500", bar: "bg-yellow-500" };
  } else {
    return { dot: "bg-red-500", bar: "bg-red-500" };
  }
}

// Get current week (Sunday-Saturday)
function getCurrentWeekDates(): string[] {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);
  
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

// Calculate sleep streak
function calculateSleepStreak(
  healthMetrics: HabitsSectionProps['healthMetrics']
): { streak: number; todayMet: boolean; avgHours: number; avgConsistency: number } {
  const weekDates = getCurrentWeekDates();
  const today = new Date().toISOString().split('T')[0];
  
  let streak = 0;
  let todayMet = false;
  let totalHours = 0;
  let totalConsistency = 0;
  let count = 0;

  // Check each day from most recent backward
  const sortedDates = [...weekDates].reverse();
  
  for (const date of sortedDates) {
    if (date > today) continue; // Skip future dates
    
    const metric = healthMetrics.find(m => m.date === date);
    if (metric && metric.sleepHours >= SLEEP_HOURS_GOAL && metric.sleepConsistency >= SLEEP_CONSISTENCY_GOAL) {
      streak++;
      if (date === today) todayMet = true;
    } else {
      break; // Streak broken
    }
  }

  // Calculate averages for the week
  for (const date of weekDates) {
    if (date > today) continue;
    const metric = healthMetrics.find(m => m.date === date);
    if (metric) {
      totalHours += metric.sleepHours;
      totalConsistency += metric.sleepConsistency;
      count++;
    }
  }

  return {
    streak,
    todayMet,
    avgHours: count > 0 ? totalHours / count : 0,
    avgConsistency: count > 0 ? totalConsistency / count : 0,
  };
}

// Calculate exercise progress
function calculateExerciseProgress(
  workouts: HabitsSectionProps['workouts']
): { lowZoneMinutes: number; highZoneMinutes: number; workoutDays: number; workoutTypes: string[] } {
  const weekDates = getCurrentWeekDates();
  const today = new Date().toISOString().split('T')[0];
  
  let lowZoneMinutes = 0;
  let highZoneMinutes = 0;
  const workoutDaysSet = new Set<string>();
  const workoutTypesSet = new Set<string>();

  for (const workout of workouts) {
    if (!weekDates.includes(workout.date) || workout.date > today) continue;
    if (workout.isMeditation) continue; // Exclude meditation from exercise
    
    lowZoneMinutes += (workout.zone1Minutes || 0) + (workout.zone2Minutes || 0) + (workout.zone3Minutes || 0);
    highZoneMinutes += (workout.zone4Minutes || 0) + (workout.zone5Minutes || 0);
    workoutDaysSet.add(workout.date);
    workoutTypesSet.add(workout.activityType);
  }

  return {
    lowZoneMinutes,
    highZoneMinutes,
    workoutDays: workoutDaysSet.size,
    workoutTypes: Array.from(workoutTypesSet),
  };
}

// Calculate recovery streak (using recovery_score as proxy for meditation/recovery activity)
function calculateRecoveryStreak(
  healthMetrics: HabitsSectionProps['healthMetrics']
): { streak: number; todayMet: boolean; daysThisWeek: number } {
  const weekDates = getCurrentWeekDates();
  const today = new Date().toISOString().split('T')[0];
  
  // Count days with recovery data (recovery_score > 0 means recovery was logged)
  const recoveryDays = new Set<string>();
  for (const metric of healthMetrics) {
    if (weekDates.includes(metric.date) && metric.date <= today && metric.recoveryScore && metric.recoveryScore > 0) {
      recoveryDays.add(metric.date);
    }
  }

  let streak = 0;
  let todayMet = false;

  // Check streak from most recent backward
  const sortedDates = [...weekDates].reverse();
  for (const date of sortedDates) {
    if (date > today) continue;
    
    if (recoveryDays.has(date)) {
      streak++;
      if (date === today) todayMet = true;
    } else {
      break;
    }
  }

  return { streak, todayMet, daysThisWeek: recoveryDays.size };
}

// Calculate meditation from manual logs
function calculateMeditationStreak(
  meditationLogs: string[] // array of dates
): { streak: number; todayDone: boolean; daysThisWeek: number } {
  const weekDates = getCurrentWeekDates();
  const today = new Date().toISOString().split('T')[0];
  
  const meditationDays = new Set(meditationLogs.filter(d => weekDates.includes(d) && d <= today));

  let streak = 0;
  let todayDone = meditationLogs.includes(today);

  // Check streak from most recent backward
  const sortedDates = [...weekDates].reverse();
  for (const date of sortedDates) {
    if (date > today) continue;
    
    if (meditationDays.has(date)) {
      streak++;
    } else {
      break;
    }
  }

  return { streak, todayDone, daysThisWeek: meditationDays.size };
}

export function HabitsSection({ isWhoopConnected, healthMetrics, workouts }: HabitsSectionProps) {
  const [sleepModalOpen, setSleepModalOpen] = useState(false);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [meditationModalOpen, setMeditationModalOpen] = useState(false);
  const [meditationLogs, setMeditationLogs] = useState<string[]>([]);
  const [isLoggingMeditation, setIsLoggingMeditation] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayMeditated = meditationLogs.includes(today);
  const supabase = createClient();

  // Fetch meditation logs on mount
  useEffect(() => {
    async function fetchMeditationLogs() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekDates = getCurrentWeekDates();
      const { data, error } = await supabase
        .from('meditation_logs')
        .select('date')
        .eq('user_id', user.id)
        .gte('date', weekDates[0])
        .lte('date', weekDates[6]);

      if (!error && data) {
        setMeditationLogs(data.map(d => d.date));
      }
    }
    fetchMeditationLogs();
  }, []);

  const handleMeditationToggle = async () => {
    setIsLoggingMeditation(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoggingMeditation(false);
      return;
    }

    if (todayMeditated) {
      // Remove today's log
      const { error } = await supabase
        .from('meditation_logs')
        .delete()
        .eq('user_id', user.id)
        .eq('date', today);

      if (!error) {
        setMeditationLogs(prev => prev.filter(d => d !== today));
      }
    } else {
      // Add today's log
      const { error } = await supabase
        .from('meditation_logs')
        .insert({ user_id: user.id, date: today });

      if (!error) {
        setMeditationLogs(prev => [...prev, today]);
      }
    }
    setIsLoggingMeditation(false);
  };

  const sleepData = calculateSleepStreak(healthMetrics);
  const exerciseData = calculateExerciseProgress(workouts);
  const meditationData = calculateMeditationStreak(meditationLogs);

  // Get latest health metric for expanded view
  const latestMetric = healthMetrics.sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#5C7A6B] uppercase tracking-wide">
          Habits
        </h3>
        <span className="text-xs text-[#8B9A8F]">This Week</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Sleep Card */}
        <button
          onClick={() => setSleepModalOpen(true)}
          className="group p-4 rounded-xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 text-left flex flex-col"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                <Moon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-[#1E3D32]">Sleep</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#8B9A8F] group-hover:text-[#5C7A6B] transition-colors" />
          </div>
          
          {isWhoopConnected && healthMetrics.length > 0 ? (
            <div className="flex-1 flex flex-col">
              {/* Content area */}
              <div className="space-y-3">
                {/* Streak */}
                <div className="flex items-center gap-2">
                  {sleepData.streak > 0 && <Flame className="h-4 w-4 text-orange-500" />}
                  <span className="text-lg font-serif font-semibold text-[#1E3D32]">
                    {sleepData.streak} day streak
                  </span>
                </div>

                {/* Sleep Hours Progress */}
                {(() => {
                  const hoursPercent = (sleepData.avgHours / SLEEP_HOURS_GOAL) * 100;
                  const hoursColor = getGoalColor(hoursPercent);
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2.5 h-2.5 rounded-full", hoursColor.dot)} />
                          <span className="text-xs font-medium text-[#5C7A6B]">Hours</span>
                        </div>
                        <span className="text-sm font-semibold text-[#1E3D32]">
                          {sleepData.avgHours.toFixed(1)} / {SLEEP_HOURS_GOAL}h
                        </span>
                      </div>
                      <div className="h-2 bg-[#E8DCC4] rounded-full overflow-hidden">
                        <div
                          className={cn("h-full transition-all duration-500", hoursColor.bar)}
                          style={{ width: `${Math.min(100, hoursPercent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Consistency Progress */}
                {(() => {
                  const consistencyPercent = (sleepData.avgConsistency / SLEEP_CONSISTENCY_GOAL) * 100;
                  const consistencyColor = getGoalColor(consistencyPercent);
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2.5 h-2.5 rounded-full", consistencyColor.dot)} />
                          <span className="text-xs font-medium text-[#5C7A6B]">Consistency</span>
                        </div>
                        <span className="text-sm font-semibold text-[#1E3D32]">
                          {sleepData.avgConsistency.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-[#E8DCC4] rounded-full overflow-hidden">
                        <div
                          className={cn("h-full transition-all duration-500", consistencyColor.bar)}
                          style={{ width: `${Math.min(100, consistencyPercent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Divider + Goal - pushed to bottom */}
              <div className="pt-3 mt-auto border-t border-[#E8DCC4]">
                <p className="text-xs text-[#5C7A6B]">
                  <span className="font-medium">Goal:</span> {SLEEP_HOURS_GOAL}+ hours, ≥{SLEEP_CONSISTENCY_GOAL}% consistency
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="text-2xl font-serif font-semibold text-[#1E3D32] mb-1">--</div>
              <p className="text-xs text-[#8B9A8F] mb-2">Connect Whoop to track</p>
            </div>
          )}
        </button>

        {/* Exercise Card */}
        <button
          onClick={() => setExerciseModalOpen(true)}
          className="group p-4 rounded-xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 text-left flex flex-col"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Dumbbell className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-[#1E3D32]">Exercise</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#8B9A8F] group-hover:text-[#5C7A6B] transition-colors" />
          </div>

          {isWhoopConnected && workouts.length > 0 ? (
            <div className="flex-1 flex flex-col">
              {/* Content area */}
              <div className="space-y-3">
                {/* Workout days summary - matches Sleep's streak row */}
                <div className="flex items-center gap-2">
                  {exerciseData.workoutDays >= 3 && <Flame className="h-4 w-4 text-orange-500" />}
                  <span className="text-lg font-serif font-semibold text-[#1E3D32]">
                    {exerciseData.workoutDays} workout days
                  </span>
                </div>

                {/* Zones 1-3 (Green) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="text-xs font-medium text-[#5C7A6B]">Zones 1-3</span>
                    </div>
                    <span className="text-sm font-semibold text-[#1E3D32]">
                      {Math.round(exerciseData.lowZoneMinutes)} / {EXERCISE_LOW_GOAL_MINUTES} min
                    </span>
                  </div>
                  <div className="h-2 bg-[#E8DCC4] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (exerciseData.lowZoneMinutes / EXERCISE_LOW_GOAL_MINUTES) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Zones 4-5 (Orange) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      <span className="text-xs font-medium text-[#5C7A6B]">Zones 4-5</span>
                    </div>
                    <span className="text-sm font-semibold text-[#1E3D32]">
                      {Math.round(exerciseData.highZoneMinutes)} / {EXERCISE_HIGH_GOAL_MINUTES} min
                    </span>
                  </div>
                  <div className="h-2 bg-[#E8DCC4] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (exerciseData.highZoneMinutes / EXERCISE_HIGH_GOAL_MINUTES) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Divider + Goal - pushed to bottom */}
              <div className="pt-3 mt-auto border-t border-[#E8DCC4]">
                <p className="text-xs text-[#5C7A6B]">
                  <span className="font-medium">Goal:</span> {EXERCISE_LOW_GOAL_MINUTES} min zones 1-3, {EXERCISE_HIGH_GOAL_MINUTES} min zones 4-5
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="text-2xl font-serif font-semibold text-[#1E3D32] mb-1">--</div>
              <p className="text-xs text-[#8B9A8F] mb-2">Connect Whoop to track</p>
            </div>
          )}
        </button>

        {/* Meditation Card */}
        <div
          className="group p-4 rounded-xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm hover:shadow-md transition-all duration-300 text-left flex flex-col"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Brain className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-[#1E3D32]">Meditation</span>
            </div>
            <button
              onClick={() => setMeditationModalOpen(true)}
              className="p-1 hover:bg-[#E8DCC4] rounded transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-[#8B9A8F] group-hover:text-[#5C7A6B]" />
            </button>
          </div>

          <div className="flex-1 flex flex-col">
            {/* Content area */}
            <div className="space-y-3">
              {/* Summary stat - matches Sleep/Exercise pattern */}
              <div className="flex items-center gap-2">
                {meditationData.streak >= 3 && <Flame className="h-4 w-4 text-orange-500" />}
                <span className="text-lg font-serif font-semibold text-[#1E3D32]">
                  {meditationData.daysThisWeek} days this week
                </span>
              </div>
              <p className="text-xs text-[#8B9A8F]">
                {meditationData.streak > 0 ? `${meditationData.streak} day streak` : 'Start your streak!'}
              </p>

              {/* Today's meditation button */}
              <button
                onClick={handleMeditationToggle}
                disabled={isLoggingMeditation}
                className={cn(
                  "w-full py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                  todayMeditated
                    ? "bg-purple-100 text-purple-700 border border-purple-200"
                    : "bg-[#2D5A47] text-white hover:bg-[#1E3D32]",
                  isLoggingMeditation && "opacity-50 cursor-not-allowed"
                )}
              >
                {isLoggingMeditation ? "..." : todayMeditated ? "✓ Meditated today" : "Log meditation"}
              </button>
            </div>

            {/* Divider + Goal - pushed to bottom */}
            <div className="pt-3 mt-auto border-t border-[#E8DCC4]">
              <p className="text-xs text-[#5C7A6B]">
                <span className="font-medium">Goal:</span> Meditate 1x daily
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sleep Modal */}
      <Dialog open={sleepModalOpen} onOpenChange={setSleepModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <Moon className="h-5 w-5 text-indigo-600" />
              Sleep Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isWhoopConnected && healthMetrics.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-[#F5F0E6]">
                    <p className="text-xs text-[#5C7A6B] mb-1">Current Streak</p>
                    <p className="text-xl font-serif font-semibold text-[#1E3D32]">
                      {sleepData.streak} days
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F5F0E6]">
                    <p className="text-xs text-[#5C7A6B] mb-1">Week Average</p>
                    <p className="text-xl font-serif font-semibold text-[#1E3D32]">
                      {sleepData.avgHours.toFixed(1)}h
                    </p>
                  </div>
                </div>
                
                {latestMetric && (
                  <div className="space-y-3 pt-3 border-t border-[#E8DCC4]">
                    <h4 className="text-sm font-medium text-[#5C7A6B]">Latest Night</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 rounded-lg bg-[#F5F0E6]">
                        <p className="text-lg font-semibold text-[#1E3D32]">{latestMetric.hrvRmssd?.toFixed(0) || '--'}</p>
                        <p className="text-xs text-[#8B9A8F]">HRV</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-[#F5F0E6]">
                        <p className="text-lg font-semibold text-[#1E3D32]">{latestMetric.restingHeartRate || '--'}</p>
                        <p className="text-xs text-[#8B9A8F]">RHR</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-[#F5F0E6]">
                        <p className="text-lg font-semibold text-[#1E3D32]">{latestMetric.sleepConsistency?.toFixed(0) || '--'}%</p>
                        <p className="text-xs text-[#8B9A8F]">Efficiency</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-[#E8DCC4]">
                  <p className="text-xs text-[#8B9A8F]">
                    Goal: {SLEEP_HOURS_GOAL}+ hours with ≥{SLEEP_CONSISTENCY_GOAL}% sleep consistency each night to maintain streak.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <Moon className="h-12 w-12 text-[#E8DCC4] mx-auto mb-3" />
                <p className="text-[#5C7A6B]">Connect Whoop to see sleep data</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Exercise Modal */}
      <Dialog open={exerciseModalOpen} onOpenChange={setExerciseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <Dumbbell className="h-5 w-5 text-green-600" />
              Exercise Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isWhoopConnected && workouts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-[#F5F0E6]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <p className="text-xs text-[#5C7A6B]">Zones 1-3</p>
                    </div>
                    <p className="text-xl font-serif font-semibold text-[#1E3D32]">
                      {Math.round(exerciseData.lowZoneMinutes)} / {EXERCISE_LOW_GOAL_MINUTES} min
                    </p>
                    <div className="mt-2 h-2 bg-[#E8DCC4] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${Math.min(100, (exerciseData.lowZoneMinutes / EXERCISE_LOW_GOAL_MINUTES) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F5F0E6]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      <p className="text-xs text-[#5C7A6B]">Zones 4-5</p>
                    </div>
                    <p className="text-xl font-serif font-semibold text-[#1E3D32]">
                      {Math.round(exerciseData.highZoneMinutes)} / {EXERCISE_HIGH_GOAL_MINUTES} min
                    </p>
                    <div className="mt-2 h-2 bg-[#E8DCC4] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all"
                        style={{ width: `${Math.min(100, (exerciseData.highZoneMinutes / EXERCISE_HIGH_GOAL_MINUTES) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#E8DCC4]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#5C7A6B]">Workout Days:</span>
                    <span className="font-medium text-[#1E3D32]">{exerciseData.workoutDays}</span>
                  </div>
                  {exerciseData.workoutTypes.length > 0 && (
                    <div>
                      <p className="text-sm text-[#5C7A6B] mb-2">Activities</p>
                      <div className="flex flex-wrap gap-2">
                        {exerciseData.workoutTypes.map((type) => (
                          <span 
                            key={type}
                            className="px-2 py-1 text-xs bg-[#E8DCC4] text-[#5C7A6B] rounded-full"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <Dumbbell className="h-12 w-12 text-[#E8DCC4] mx-auto mb-3" />
                <p className="text-[#5C7A6B]">Connect Whoop to see exercise data</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Meditation Modal */}
      <Dialog open={meditationModalOpen} onOpenChange={setMeditationModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <Brain className="h-5 w-5 text-purple-600" />
              Meditation Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-[#F5F0E6]">
                <p className="text-xs text-[#5C7A6B] mb-1">Days This Week</p>
                <p className="text-xl font-serif font-semibold text-[#1E3D32]">
                  {meditationData.daysThisWeek} / 7
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#F5F0E6]">
                <p className="text-xs text-[#5C7A6B] mb-1">Current Streak</p>
                <p className="text-xl font-serif font-semibold text-[#1E3D32]">
                  {meditationData.streak} days
                </p>
              </div>
            </div>

            {/* Week view */}
            <div className="space-y-2 pt-3 border-t border-[#E8DCC4]">
              <h4 className="text-sm font-medium text-[#5C7A6B]">This Week</h4>
              <div className="flex justify-between">
                {getCurrentWeekDates().map((date) => {
                  const dayName = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                  const isToday = date === today;
                  const didMeditate = meditationLogs.includes(date);
                  const isFuture = date > today;
                  
                  return (
                    <div key={date} className="flex flex-col items-center gap-1">
                      <span className={cn(
                        "text-xs",
                        isToday ? "font-semibold text-[#1E3D32]" : "text-[#8B9A8F]"
                      )}>
                        {dayName}
                      </span>
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm",
                        isFuture && "bg-gray-100 text-gray-300",
                        !isFuture && didMeditate && "bg-purple-100 text-purple-600",
                        !isFuture && !didMeditate && "bg-gray-100 text-gray-400",
                        isToday && "ring-2 ring-[#D4A84B] ring-offset-1"
                      )}>
                        {isFuture ? "·" : didMeditate ? "✓" : "·"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-[#E8DCC4]">
              <p className="text-xs text-[#8B9A8F]">
                Tap "Log meditation" on the card to track today's session.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
