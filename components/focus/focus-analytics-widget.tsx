"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Clock, TrendingUp, Target, AlertCircle, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FocusSession {
  id: string;
  focus_mode: string;
  started_at: string;
  ended_at: string | null;
  planned_minutes: number;
  completed: boolean;
  task_id: string | null;
}

interface TaskWithTime {
  id: string;
  title: string;
  estimated_minutes: number | null;
  actual_minutes: number | null;
}

const MODE_LABELS: Record<string, string> = {
  admin: "Admin",
  research: "Research",
  writing: "Writing",
  meeting_prep: "Meeting Prep",
  toastmasters: "Toastmasters",
};

const MODE_COLORS: Record<string, string> = {
  admin: "bg-blue-500",
  research: "bg-purple-500",
  writing: "bg-amber-500",
  meeting_prep: "bg-green-500",
  toastmasters: "bg-pink-500",
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function FocusAnalyticsWidget() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [tasksWithTime, setTasksWithTime] = useState<TaskWithTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch last 14 days of focus sessions
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: sessionData } = await supabase
        .from("time_blocks")
        .select("*")
        .eq("user_id", user.id)
        .gte("started_at", fourteenDaysAgo.toISOString())
        .order("started_at", { ascending: false });

      if (sessionData) {
        setSessions(sessionData);
      }

      // Fetch completed tasks with time data
      const { data: taskData } = await supabase
        .from("tasks")
        .select("id, title, estimated_minutes, actual_minutes")
        .eq("user_id", user.id)
        .eq("completed", true)
        .not("actual_minutes", "is", null)
        .gte("completed_at", fourteenDaysAgo.toISOString())
        .order("completed_at", { ascending: false })
        .limit(20);

      if (taskData) {
        setTasksWithTime(taskData);
      }

      setIsLoading(false);
    }
    
    fetchData();
  }, [supabase]);

  // Calculate focus time by mode
  const focusByMode = sessions.reduce((acc, session) => {
    if (!session.ended_at) return acc;
    
    const duration = Math.round(
      (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000
    );
    
    const mode = session.focus_mode;
    acc[mode] = (acc[mode] || 0) + duration;
    return acc;
  }, {} as Record<string, number>);

  const totalFocusMinutes = Object.values(focusByMode).reduce((a, b) => a + b, 0);

  // Calculate prediction accuracy
  const predictionData = tasksWithTime
    .filter(t => t.estimated_minutes && t.actual_minutes)
    .map(t => ({
      title: t.title,
      estimated: t.estimated_minutes!,
      actual: t.actual_minutes!,
      delta: t.actual_minutes! - t.estimated_minutes!,
      accuracy: Math.round((1 - Math.abs(t.actual_minutes! - t.estimated_minutes!) / t.estimated_minutes!) * 100),
    }));

  const avgAccuracy = predictionData.length > 0
    ? Math.round(predictionData.reduce((sum, t) => sum + t.accuracy, 0) / predictionData.length)
    : null;

  const avgDelta = predictionData.length > 0
    ? Math.round(predictionData.reduce((sum, t) => sum + t.delta, 0) / predictionData.length)
    : null;

  // Sessions today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySessions = sessions.filter(s => new Date(s.started_at) >= today);
  const todayMinutes = todaySessions.reduce((sum, s) => {
    if (!s.ended_at) return sum;
    return sum + Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
  }, 0);

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-48 text-[#8B9A8F]">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-[#1E3D32]">
        <BarChart3 className="w-4 h-4" />
        Focus Analytics
      </div>

      {/* Today's Summary */}
      <div className="p-3 rounded-lg bg-[#F5F0E6]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#8B9A8F]">Today</span>
          <span className="text-sm font-medium text-[#1E3D32]">
            {formatDuration(todayMinutes)} focused
          </span>
        </div>
        <div className="text-xs text-[#5C7A6B] mt-1">
          {todaySessions.length} session{todaySessions.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Focus Time by Mode */}
      <div>
        <div className="text-xs text-[#8B9A8F] mb-2">Last 14 Days by Mode</div>
        {totalFocusMinutes === 0 ? (
          <div className="text-xs text-[#8B9A8F] italic">No focus sessions yet</div>
        ) : (
          <div className="space-y-2">
            {Object.entries(focusByMode)
              .sort(([, a], [, b]) => b - a)
              .map(([mode, minutes]) => {
                const percentage = Math.round((minutes / totalFocusMinutes) * 100);
                return (
                  <div key={mode} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5C7A6B]">{MODE_LABELS[mode] || mode}</span>
                      <span className="text-[#1E3D32] font-medium">{formatDuration(minutes)}</span>
                    </div>
                    <div className="h-2 bg-[#E8DCC4] rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", MODE_COLORS[mode] || "bg-gray-400")}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Prediction Accuracy */}
      <div>
        <div className="text-xs text-[#8B9A8F] mb-2">Time Estimation Accuracy</div>
        {avgAccuracy === null ? (
          <div className="text-xs text-[#8B9A8F] italic">
            Complete tasks with time tracking to see accuracy
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded bg-[#F5F0E6]">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#5C7A6B]" />
                <span className="text-xs text-[#5C7A6B]">Avg Accuracy</span>
              </div>
              <span className={cn(
                "text-sm font-medium",
                avgAccuracy >= 80 ? "text-green-600" : avgAccuracy >= 60 ? "text-amber-600" : "text-red-500"
              )}>
                {avgAccuracy}%
              </span>
            </div>
            
            <div className="flex items-center justify-between p-2 rounded bg-[#F5F0E6]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#5C7A6B]" />
                <span className="text-xs text-[#5C7A6B]">Avg Delta</span>
              </div>
              <span className={cn(
                "text-sm font-medium",
                avgDelta! > 0 ? "text-red-500" : "text-green-600"
              )}>
                {avgDelta! > 0 ? "+" : ""}{avgDelta}m
              </span>
            </div>

            {avgDelta && avgDelta > 10 && (
              <div className="flex items-start gap-2 p-2 rounded bg-amber-50 text-xs text-amber-700">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>Tasks take ~{avgDelta}m longer than estimated on average. Consider adding buffer time.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Tasks with Time Delta */}
      {predictionData.length > 0 && (
        <div>
          <div className="text-xs text-[#8B9A8F] mb-2">Recent Task Timing</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {predictionData.slice(0, 5).map((task, i) => (
              <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-[#F5F0E6]">
                <span className="text-[#5C7A6B] truncate max-w-[150px]">{task.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#8B9A8F]">{task.estimated}m → {task.actual}m</span>
                  <span className={cn(
                    "font-medium",
                    task.delta > 0 ? "text-red-500" : "text-green-600"
                  )}>
                    {task.delta > 0 ? "+" : ""}{task.delta}m
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
