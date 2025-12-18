"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Circle, Loader2, Calendar, ArrowRight, ChevronDown, 
  Clock, Sparkles, Info, ArrowUpDown, Sun, Moon, Sunset
} from "lucide-react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTaskContext, Task } from "./task-context";
import { cn } from "@/lib/utils";

interface TaskListProps {
  isConnected: boolean;
  compact?: boolean; // For use in Focus screen drawer
  onStartTask?: (task: Task) => void; // For Focus screen
}

interface TaskAnalysis {
  taskId: string;
  timeEstimate: {
    userEstimate: number | null;
    adjustedEstimate: number;
    aiEstimate: number;
    displayMinutes: number;
    adjustmentFactor: number | null;
    confidence: "none" | "low" | "medium" | "high";
    source: "user_adjusted" | "user_raw" | "ai_guess";
    explanation: string;
    factors: string[];
  };
  prioritization: {
    suggestedOrder: number;
    suggestedTimeOfDay: "morning" | "afternoon" | "evening" | "anytime";
    explanation: string;
    factors: string[];
  };
  dataState: "no_data" | "emerging" | "established";
}

type ViewMode = "today" | "week";
type SortMode = "priority" | "time-asc" | "time-desc" | "suggested";

// Format duration helper
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Time of day icon
function TimeOfDayIcon({ time }: { time: string }) {
  switch (time) {
    case "morning": return <Sun className="h-3 w-3" />;
    case "afternoon": return <Sunset className="h-3 w-3" />;
    case "evening": return <Moon className="h-3 w-3" />;
    default: return null;
  }
}

// Badge colors based on source type
const sourceColors: Record<string, string> = {
  ai_guess: "bg-[#F5F0E6] text-[#8B9A8F]",      // Gray - no user estimate
  user_raw: "bg-blue-50 text-blue-700",          // Blue - user estimate, no history yet
  user_adjusted: "bg-green-50 text-green-700",   // Green - user estimate + personal adjustment
};

// Confidence colors (used as border/accent)
const confidenceAccents: Record<string, string> = {
  none: "",
  low: "ring-1 ring-yellow-300",
  medium: "ring-1 ring-blue-300",
  high: "ring-1 ring-green-400",
};

export function TaskList({ isConnected, compact = false, onStartTask }: TaskListProps) {
  const { tasks, refreshTasks } = useTaskContext();
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [sortMode, setSortMode] = useState<SortMode>("suggested");
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const [updatingDate, setUpdatingDate] = useState<string | null>(null);
  
  // AI Analysis state
  const [analyses, setAnalyses] = useState<Record<string, TaskAnalysis>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(true);

  // Fetch AI analysis when tasks change
  const fetchAnalysis = useCallback(async () => {
    if (tasks.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/ai/analyze-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      });
      
      if (response.ok) {
        const { analyses: analysesArray } = await response.json();
        const analysesMap: Record<string, TaskAnalysis> = {};
        analysesArray.forEach((a: TaskAnalysis) => {
          analysesMap[a.taskId] = a;
        });
        setAnalyses(analysesMap);
      }
    } catch (error) {
      console.error("Failed to fetch task analysis:", error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [tasks]);

  useEffect(() => {
    if (isConnected && tasks.length > 0) {
      fetchAnalysis();
    }
  }, [isConnected, tasks.length, fetchAnalysis]);

  // Filter tasks based on view mode
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const filteredTasks = tasks.filter((task) => {
    if (!task.dueDate) return false; // Exclude undated tasks from both views
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (viewMode === "today") {
      // Today: due today or overdue (before tomorrow)
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return dueDate < tomorrow;
    } else {
      // Week: due within next 7 days (including overdue)
      return dueDate < endOfWeek;
    }
  });

  // Sort tasks based on sort mode
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortMode) {
      case "priority":
        return b.priority - a.priority;
      case "time-asc":
        const aTime = analyses[a.id]?.timeEstimate.displayMinutes || 999;
        const bTime = analyses[b.id]?.timeEstimate.displayMinutes || 999;
        return aTime - bTime;
      case "time-desc":
        const aTimeD = analyses[a.id]?.timeEstimate.displayMinutes || 0;
        const bTimeD = analyses[b.id]?.timeEstimate.displayMinutes || 0;
        return bTimeD - aTimeD;
      case "suggested":
        const aOrder = analyses[a.id]?.prioritization.suggestedOrder || 999;
        const bOrder = analyses[b.id]?.prioritization.suggestedOrder || 999;
        return aOrder - bOrder;
      default:
        return 0;
    }
  });

  // Group tasks by day for week view
  const tasksByDay = sortedTasks.reduce((acc, task) => {
    const dateKey = task.dueDate 
      ? new Date(task.dueDate).toDateString() 
      : "No Date";
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const sortedDays = Object.keys(tasksByDay).sort((a, b) => {
    if (a === "No Date") return 1;
    if (b === "No Date") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  const handleComplete = async (task: Task) => {
    setCompletingTask(task.id);
    try {
      const response = await fetch("/api/integrations/ticktick/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          projectId: task.projectId,
        }),
      });
      if (response.ok) {
        await refreshTasks();
      }
    } catch (error) {
      console.error("Failed to complete task:", error);
    } finally {
      setCompletingTask(null);
    }
  };

  const handleDateChange = async (task: Task, newDate: Date | undefined) => {
    if (!newDate) return;
    setUpdatingDate(task.id);
    try {
      const response = await fetch("/api/integrations/ticktick/update-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          projectId: task.projectId,
          dueDate: newDate.toISOString(),
        }),
      });
      if (response.ok) {
        await refreshTasks();
      }
    } catch (error) {
      console.error("Failed to update due date:", error);
    } finally {
      setUpdatingDate(null);
    }
  };

  const priorityColors: Record<number, string> = {
    5: "text-red-500",
    3: "text-yellow-500",
    1: "text-blue-500",
    0: "text-[#8B9A8F]",
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);

    if (taskDate.getTime() === todayDate.getTime()) return "Today";
    if (taskDate.getTime() === tomorrow.getTime()) return "Tomorrow";
    if (taskDate < todayDate) return "Overdue";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDayHeader = (dateString: string) => {
    if (dateString === "No Date") return "No Due Date";
    const date = new Date(dateString);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === todayDate.getTime()) return "Today";
    if (date.getTime() === tomorrow.getTime()) return "Tomorrow";
    if (date < todayDate) return "Overdue";
    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  const isOverdue = (dateString: string | null) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Get data state message
  const getDataStateMessage = () => {
    const firstAnalysis = Object.values(analyses)[0];
    if (!firstAnalysis) return null;
    
    switch (firstAnalysis.dataState) {
      case "no_data":
        return "Building your baseline...";
      case "emerging":
        return "Learning your patterns...";
      case "established":
        return null; // Don't show message when established
    }
  };

  const TaskItem = ({ task, showOrder = false }: { task: Task; showOrder?: boolean }) => {
    const analysis = analyses[task.id];
    
    return (
      <div className={cn(
        "flex items-start gap-3 p-3 rounded-xl hover:bg-[#F5F0E6] transition-colors group",
        compact && "p-2"
      )}>
        {/* Completion button */}
        <button
          onClick={() => handleComplete(task)}
          disabled={completingTask === task.id}
          className="mt-0.5 flex-shrink-0"
        >
          {completingTask === task.id ? (
            <Loader2 className="h-5 w-5 text-[#8B9A8F] animate-spin" />
          ) : (
            <Circle
              className={cn(
                "h-5 w-5 transition-colors cursor-pointer",
                priorityColors[task.priority] || priorityColors[0],
                "group-hover:text-[#2D5A47]"
              )}
            />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              "text-sm text-[#1E3D32] leading-tight",
              compact && "text-xs"
            )}>
              {showOrder && analysis && (
                <span className="inline-flex items-center justify-center w-5 h-5 mr-2 text-xs font-medium bg-[#2D5A47] text-white rounded-full">
                  {analysis.prioritization.suggestedOrder}
                </span>
              )}
              {task.title}
            </p>
            
            {/* Start button for Focus screen */}
            {onStartTask && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onStartTask(task)}
                className="opacity-0 group-hover:opacity-100 h-6 px-2 text-xs"
              >
                Start
              </Button>
            )}
          </div>

          {/* Meta row: date + AI insights */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {/* Date picker */}
            {viewMode === "today" && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-1 text-xs transition-colors",
                      isOverdue(task.dueDate)
                        ? "text-red-500 hover:text-red-600"
                        : "text-[#8B9A8F] hover:text-[#5C7A6B]"
                    )}
                    disabled={updatingDate === task.id}
                  >
                    {updatingDate === task.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Calendar className="h-3 w-3" />
                    )}
                    <span>{formatDate(task.dueDate)}</span>
                    <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={task.dueDate ? new Date(task.dueDate) : undefined}
                    onSelect={(date) => handleDateChange(task, date)}
                    initialFocus
                  />
                  <div className="border-t p-2 flex gap-1">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleDateChange(task, new Date())}>
                      Today
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => {
                      const tmrw = new Date();
                      tmrw.setDate(tmrw.getDate() + 1);
                      handleDateChange(task, tmrw);
                    }}>
                      Tomorrow
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => {
                      const nextWeek = new Date();
                      nextWeek.setDate(nextWeek.getDate() + 7);
                      handleDateChange(task, nextWeek);
                    }}>
                      Next week
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* AI Insights */}
            {showAiInsights && analysis && (
              <TooltipProvider>
                {/* Time Estimate */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs cursor-help",
                      sourceColors[analysis.timeEstimate.source],
                      confidenceAccents[analysis.timeEstimate.confidence]
                    )}>
                      <Clock className="h-3 w-3" />
                      {/* Show adjustment arrow if user estimate was adjusted */}
                      {analysis.timeEstimate.source === "user_adjusted" && analysis.timeEstimate.userEstimate ? (
                        <>
                          <span className="opacity-60 line-through">{formatDuration(analysis.timeEstimate.userEstimate)}</span>
                          <ArrowRight className="h-2.5 w-2.5" />
                          <span>{formatDuration(analysis.timeEstimate.displayMinutes)}</span>
                        </>
                      ) : (
                        <span>{formatDuration(analysis.timeEstimate.displayMinutes)}</span>
                      )}
                      <Info className="h-2.5 w-2.5 opacity-50" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-medium mb-1">{analysis.timeEstimate.explanation}</p>
                    <ul className="text-xs space-y-0.5 text-muted-foreground">
                      {analysis.timeEstimate.factors.map((f, i) => (
                        <li key={i}>• {f}</li>
                      ))}
                    </ul>
                    {analysis.timeEstimate.source === "ai_guess" && (
                      <p className="text-xs mt-2 pt-2 border-t text-muted-foreground italic">
                        💡 Add [u.e 30m] to task details for personalized estimates
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>

                {/* Suggested Time of Day */}
                {analysis.prioritization.suggestedTimeOfDay !== "anytime" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#F5F0E6] text-[#5C7A6B] cursor-help">
                        <TimeOfDayIcon time={analysis.prioritization.suggestedTimeOfDay} />
                        <span className="capitalize">{analysis.prioritization.suggestedTimeOfDay}</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="font-medium mb-1">{analysis.prioritization.explanation}</p>
                      <ul className="text-xs space-y-0.5 text-muted-foreground">
                        {analysis.prioritization.factors.map((f, i) => (
                          <li key={i}>• {f}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center h-32 text-[#8B9A8F] text-sm border-2 border-dashed border-[#E8DCC4] rounded-xl">
          <Link href="/settings" className="flex items-center gap-2 hover:text-[#2D5A47] transition-colors">
            Connect TickTick to see tasks
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const dataStateMessage = getDataStateMessage();

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        {/* View Toggle */}
        <div className="flex gap-1 p-1 bg-[#F5F0E6] rounded-lg">
          <button
            onClick={() => setViewMode("today")}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              viewMode === "today"
                ? "bg-white text-[#1E3D32] shadow-sm"
                : "text-[#5C7A6B] hover:text-[#1E3D32]"
            )}
          >
            Today
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              viewMode === "week"
                ? "bg-white text-[#1E3D32] shadow-sm"
                : "text-[#5C7A6B] hover:text-[#1E3D32]"
            )}
          >
            This Week
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* AI toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAiInsights(!showAiInsights)}
            className={cn(
              "h-8 px-2 gap-1",
              showAiInsights ? "text-[#2D5A47]" : "text-[#8B9A8F]"
            )}
          >
            <Sparkles className="h-4 w-4" />
            {isAnalyzing && <Loader2 className="h-3 w-3 animate-spin" />}
          </Button>

          {/* Sort dropdown */}
          {showAiInsights && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="text-xs capitalize">{sortMode.replace("-", " ")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortMode("suggested")}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Suggested Order
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortMode("priority")}>
                  Priority
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortMode("time-asc")}>
                  <Clock className="h-4 w-4 mr-2" />
                  Quickest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortMode("time-desc")}>
                  <Clock className="h-4 w-4 mr-2" />
                  Longest First
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Data state message */}
      {showAiInsights && dataStateMessage && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F0E6] rounded-lg text-xs text-[#5C7A6B]">
          <Sparkles className="h-3 w-3" />
          {dataStateMessage}
        </div>
      )}

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-[#8B9A8F] text-sm border-2 border-dashed border-[#E8DCC4] rounded-xl">
          🎉 {viewMode === "today" ? "All caught up for today!" : "Nothing due this week!"}
        </div>
      ) : viewMode === "today" ? (
        // Today view - simple list with suggested order
        <div className="space-y-1">
          {sortedTasks.map((task) => (
            <TaskItem key={task.id} task={task} showOrder={sortMode === "suggested"} />
          ))}
        </div>
      ) : (
        // Week view - grouped by day
        <div className="space-y-4">
          {sortedDays.map((day) => {
            const dayTasks = tasksByDay[day];
            const isToday = day !== "No Date" && new Date(day).toDateString() === today.toDateString();
            const isPast = day !== "No Date" && new Date(day) < today;

            return (
              <div key={day} className="space-y-1">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1",
                  isPast ? "text-red-500" : isToday ? "text-[#2D5A47] font-medium" : "text-[#5C7A6B]"
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isPast ? "bg-red-500" : isToday ? "bg-[#2D5A47]" : "bg-[#E8DCC4]"
                  )} />
                  <span className="text-xs uppercase tracking-wide">
                    {formatDayHeader(day)}
                  </span>
                  <span className="text-xs text-[#8B9A8F]">({dayTasks.length})</span>
                </div>
                <div className="ml-4 border-l-2 border-[#E8DCC4] pl-2 space-y-1">
                  {dayTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
