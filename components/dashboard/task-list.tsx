"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Circle, Loader2, Calendar, ArrowRight, ChevronDown, 
  Clock, Sparkles, Info, ArrowUpDown, Sun, Moon, Sunset, Folder
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
  compact?: boolean;
  onStartTask?: (task: Task) => void;
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

// List badge colors - consistent hashing for visual distinction
const LIST_COLORS = [
  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
  { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200" },
  { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
];

const SECTION_COLORS = [
  { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
  { bg: "bg-stone-100", text: "text-stone-600", border: "border-stone-200" },
  { bg: "bg-zinc-100", text: "text-zinc-600", border: "border-zinc-200" },
  { bg: "bg-neutral-100", text: "text-neutral-600", border: "border-neutral-200" },
  { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" },
];

function getListColor(listName: string) {
  let hash = 0;
  for (let i = 0; i < listName.length; i++) {
    hash = listName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LIST_COLORS[Math.abs(hash) % LIST_COLORS.length];
}

function getSectionColor(sectionName: string) {
  let hash = 0;
  for (let i = 0; i < sectionName.length; i++) {
    hash = sectionName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SECTION_COLORS[Math.abs(hash) % SECTION_COLORS.length];
}

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
  ai_guess: "bg-[#F5F0E6] text-[#8B9A8F]",
  user_raw: "bg-blue-50 text-blue-700",
  user_adjusted: "bg-green-50 text-green-700",
};

// Confidence colors
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
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (viewMode === "today") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return dueDate < tomorrow;
    } else {
      return dueDate < endOfWeek;
    }
  });

  // Sort tasks
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

  const getDataStateMessage = () => {
    const firstAnalysis = Object.values(analyses)[0];
    if (!firstAnalysis) return null;
    
    switch (firstAnalysis.dataState) {
      case "no_data":
        return "Building your baseline...";
      case "emerging":
        return "Learning your patterns...";
      case "established":
        return null;
    }
  };

  const TaskItem = ({ task, showOrder = false }: { task: Task; showOrder?: boolean }) => {
    const analysis = analyses[task.id];
    const listColor = task.ticktickListName ? getListColor(task.ticktickListName) : null;
    const sectionColor = task.ticktickSectionName ? getSectionColor(task.ticktickSectionName) : null;

    return (
      <div className={cn(
        "p-3 rounded-xl transition-all group border bg-white hover:bg-[#F5F0E6] border-transparent hover:border-[#E8DCC4]",
        compact && "p-2"
      )}>
        <div className="flex items-start gap-3">
          {/* Completion button */}
          <button
            onClick={() => handleComplete(task)}
            disabled={completingTask === task.id}
            className="mt-1 flex-shrink-0"
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

          <div className="flex-1 min-w-0 space-y-2">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <p className={cn(
                "text-sm text-[#1E3D32] leading-relaxed font-medium",
                compact && "text-xs"
              )}>
                {showOrder && analysis && (
                  <span className="inline-flex items-center justify-center w-5 h-5 mr-2 text-xs font-medium bg-[#2D5A47] text-white rounded-full">
                    {analysis.prioritization.suggestedOrder}
                  </span>
                )}
                {task.title}
              </p>

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

            {/* Row 2: List + Section badges */}
            {(task.ticktickListName || task.ticktickSectionName) && (
              <div className="flex items-center gap-2 flex-wrap">
                {task.ticktickListName && listColor && (
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border",
                    listColor.bg, listColor.text, listColor.border
                  )}>
                    <Folder className="h-2.5 w-2.5" />
                    {task.ticktickListName}
                  </span>
                )}
                {task.ticktickSectionName && sectionColor && (
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border",
                    sectionColor.bg, sectionColor.text, sectionColor.border
                  )}>
                    {task.ticktickSectionName}
                  </span>
                )}
              </div>
            )}

            {/* Row 3: Date + AI insights */}
            <div className="flex items-center gap-3 flex-wrap">
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs cursor-help",
                      sourceColors[analysis.timeEstimate.source],
                      confidenceAccents[analysis.timeEstimate.confidence]
                    )}>
                      <Clock className="h-3 w-3" />
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

        <div className="flex items-center gap-2">
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

      {showAiInsights && dataStateMessage && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F0E6] rounded-lg text-xs text-[#5C7A6B]">
          <Sparkles className="h-3 w-3" />
          {dataStateMessage}
        </div>
      )}

      {filteredTasks.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-[#8B9A8F] text-sm border-2 border-dashed border-[#E8DCC4] rounded-xl">
          🎉 {viewMode === "today" ? "All caught up for today!" : "Nothing due this week!"}
        </div>
      ) : viewMode === "today" ? (
        <div className="space-y-2">
          {sortedTasks.map((task) => (
            <TaskItem key={task.id} task={task} showOrder={sortMode === "suggested"} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDays.map((day) => {
            const dayTasks = tasksByDay[day];
            const isToday = day !== "No Date" && new Date(day).toDateString() === today.toDateString();
            const isPast = day !== "No Date" && new Date(day) < today;

            return (
              <div key={day} className="space-y-2">
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
                <div className="ml-4 border-l-2 border-[#E8DCC4] pl-3 space-y-2">
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
