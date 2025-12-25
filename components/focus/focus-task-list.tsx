"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Circle, Loader2, Clock, Sparkles, Info, ArrowUpDown, 
  Sun, Moon, Sunset, Play, Search, ArrowRight, Calendar,
  ChevronDown, Folder
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export interface FocusTask {
  id: string;
  title: string;
  content: string | null;
  priority: number;
  due_date: string | null;
  estimated_minutes: number | null;
  ticktick_id: string | null;
  ticktick_list_id: string | null;
  ticktick_list_name: string | null;
  ticktick_section_name: string | null;
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

interface FocusTaskListProps {
  onSelectTask: (task: FocusTask) => void;
  onStartTimer: (task: FocusTask) => void;
  selectedTaskId?: string;
  isFocusing: boolean;
}

type ViewMode = "today" | "week" | "all";
type SortMode = "priority" | "time-asc" | "time-desc" | "suggested";

// List badge colors - expanded palette for better visual distinction
const LIST_COLORS = [
  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
  { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200" },
  { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
  { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700", border: "border-fuchsia-200" },
  { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-200" },
  { bg: "bg-lime-100", text: "text-lime-700", border: "border-lime-200" },
  { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
];

const SECTION_COLORS = [
  { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
  { bg: "bg-stone-100", text: "text-stone-600", border: "border-stone-200" },
  { bg: "bg-zinc-100", text: "text-zinc-600", border: "border-zinc-200" },
  { bg: "bg-neutral-100", text: "text-neutral-600", border: "border-neutral-200" },
  { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" },
];

// DJB2 hash function for better distribution
function getListColor(listName: string) {
  let hash = 5381;
  for (let i = 0; i < listName.length; i++) {
    hash = ((hash << 5) + hash) ^ listName.charCodeAt(i);
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

// Map local priority (0-3) to display priority (for colors)
const priorityColors: Record<number, string> = {
  3: "text-red-500",    // High
  2: "text-orange-500", // Medium
  1: "text-blue-500",   // Low
  0: "text-[#8B9A8F]",  // None
};

// Map local priority to TickTick format for API calls
function mapLocalToTickTickPriority(localPriority: number): number {
  switch (localPriority) {
    case 3: return 5; // high
    case 2: return 3; // medium
    case 1: return 1; // low
    default: return 0; // none
  }
}

export function FocusTaskList({ onSelectTask, onStartTimer, selectedTaskId, isFocusing }: FocusTaskListProps) {
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [sortMode, setSortMode] = useState<SortMode>("suggested");
  const [searchQuery, setSearchQuery] = useState("");
  
  // AI Analysis state
  const [analyses, setAnalyses] = useState<Record<string, TaskAnalysis>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(true);
  
  // Date update state
  const [updatingDate, setUpdatingDate] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch tasks - same logic as Dashboard
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Check if TickTick is connected
    const { data: integrations } = await supabase
      .from("integration_tokens")
      .select("provider")
      .eq("user_id", user.id)
      .eq("provider", "ticktick");
    
    setIsConnected((integrations?.length || 0) > 0);

    // Fetch tasks with same query as Dashboard
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed", false)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (!error && data) {
      setTasks(data.map(t => ({
        id: t.id,
        title: t.title,
        content: t.content,
        priority: t.priority,
        due_date: t.due_date,
        estimated_minutes: t.estimated_minutes,
        ticktick_id: t.ticktick_id,
        ticktick_list_id: t.ticktick_list_id,
        ticktick_list_name: t.ticktick_list_name || null,
        ticktick_section_name: t.ticktick_section_name || null,
      })));
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Fetch AI analysis
  const fetchAnalysis = useCallback(async () => {
    if (tasks.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      // Transform tasks for AI analysis API
      const tasksForAnalysis = tasks.map(t => ({
        id: t.id,
        title: t.title,
        content: t.content,
        priority: mapLocalToTickTickPriority(t.priority),
        dueDate: t.due_date,
      }));

      const response = await fetch("/api/ai/analyze-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: tasksForAnalysis }),
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

  // Date helpers
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  // Filter tasks based on view mode and search
  const filteredTasks = tasks.filter((task) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(query)) return false;
    }

    // View mode filter
    if (viewMode === "all") return true;

    // Tasks without due date only show in "all" view
    if (!task.due_date) return false;

    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);

    if (viewMode === "today") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return dueDate < tomorrow;
    } else if (viewMode === "week") {
      return dueDate < endOfWeek;
    }

    return true;
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
    const dateKey = task.due_date 
      ? new Date(task.due_date).toDateString() 
      : "No Date";
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, FocusTask[]>);

  const sortedDays = Object.keys(tasksByDay).sort((a, b) => {
    if (a === "No Date") return 1;
    if (b === "No Date") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Date formatting helpers
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

  // Handle date change
  const handleDateChange = async (task: FocusTask, newDate: Date | undefined) => {
    if (!newDate || !task.ticktick_id) return;
    setUpdatingDate(task.id);
    try {
      const response = await fetch("/api/integrations/ticktick/update-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.ticktick_id,
          projectId: task.ticktick_list_id,
          dueDate: newDate.toISOString(),
        }),
      });
      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error("Failed to update due date:", error);
    } finally {
      setUpdatingDate(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center h-24 text-[#8B9A8F] text-sm border-2 border-dashed border-[#E8DCC4] rounded-xl">
          <Link href="/settings" className="flex items-center gap-2 hover:text-[#2D5A47] transition-colors">
            Connect TickTick
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const TaskItem = ({ task, showOrder = false }: { task: FocusTask; showOrder?: boolean }) => {
    const analysis = analyses[task.id];
    const isSelected = task.id === selectedTaskId;
    const listColor = task.ticktick_list_name ? getListColor(task.ticktick_list_name) : null;
    const sectionColor = task.ticktick_section_name ? getSectionColor(task.ticktick_section_name) : null;

    return (
      <div
        className={cn(
          "p-3 rounded-xl transition-all group border",
          isSelected
            ? "bg-[#E8DCC4] border-[#D4C9AC] shadow-sm"
            : "bg-white hover:bg-[#F5F0E6] border-transparent hover:border-[#E8DCC4]",
          "cursor-pointer"
        )}
        onClick={() => onSelectTask(task)}
      >
        <div className="flex items-start gap-3">
          <Circle className={cn(
            "w-4 h-4 mt-1 flex-shrink-0",
            priorityColors[task.priority] || priorityColors[0]
          )} />
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-[#1E3D32] leading-relaxed">
                {showOrder && analysis?.prioritization?.suggestedOrder && (
                  <span className="inline-flex items-center justify-center w-5 h-5 mr-2 text-xs font-medium bg-[#2D5A47] text-white rounded-full">
                    {analysis.prioritization.suggestedOrder}
                  </span>
                )}
                {task.title}
              </p>
            </div>

            {/* Row 2: List + Section badges */}
            {(task.ticktick_list_name || task.ticktick_section_name) && (
              <div className="flex items-center gap-2 flex-wrap">
                {task.ticktick_list_name && listColor && (
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border",
                    listColor.bg, listColor.text, listColor.border
                  )}>
                    <Folder className="h-2.5 w-2.5" />
                    {task.ticktick_list_name}
                  </span>
                )}
                {task.ticktick_section_name && sectionColor && (
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border",
                    sectionColor.bg, sectionColor.text, sectionColor.border
                  )}>
                    {task.ticktick_section_name}
                  </span>
                )}
              </div>
            )}

            {/* Row 3: Due Date + Time Estimate (separated for clarity) */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Due Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-1 text-xs transition-colors",
                      isOverdue(task.due_date)
                        ? "text-red-500 hover:text-red-600"
                        : "text-[#8B9A8F] hover:text-[#5C7A6B]"
                    )}
                    disabled={updatingDate === task.id}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {updatingDate === task.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Calendar className="h-3 w-3" />
                    )}
                    <span>{formatDate(task.due_date)}</span>
                    <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={task.due_date ? new Date(task.due_date) : undefined}
                    onSelect={(date) => handleDateChange(task, date)}
                    initialFocus
                  />
                  <div className="border-t p-2 flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDateChange(task, new Date());
                      }}
                    >
                      Today
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs" 
                      onClick={(e) => {
                        e.stopPropagation();
                        const tmrw = new Date();
                        tmrw.setDate(tmrw.getDate() + 1);
                        handleDateChange(task, tmrw);
                      }}
                    >
                      Tomorrow
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* AI Time Estimate with full tooltip */}
              {showAiInsights && analysis && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs cursor-help",
                        sourceColors[analysis.timeEstimate.source]
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
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="font-medium mb-1">{analysis.timeEstimate.explanation}</p>
                      <ul className="text-xs space-y-0.5 text-muted-foreground">
                        {analysis.timeEstimate.factors.map((f, i) => (
                          <li key={i}>• {f}</li>
                        ))}
                      </ul>
                      {/* Include prioritization info in tooltip */}
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs font-medium">Prioritization:</p>
                        <p className="text-xs text-muted-foreground">
                          Suggested order: #{analysis.prioritization.suggestedOrder}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Best time: {analysis.prioritization.suggestedTimeOfDay}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {analysis.prioritization.explanation}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Suggested Time of Day */}
              {showAiInsights && analysis?.prioritization?.suggestedTimeOfDay && analysis.prioritization.suggestedTimeOfDay !== "anytime" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#F5F0E6] text-[#5C7A6B] cursor-help">
                        <TimeOfDayIcon time={analysis.prioritization.suggestedTimeOfDay} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <span className="capitalize">{analysis.prioritization.suggestedTimeOfDay}</span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
        
        {/* Start Timer Button - only shows when focusing AND selected */}
        {isFocusing && isSelected && (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onStartTimer(task);
            }}
            className="w-full mt-2 h-8 text-xs bg-[#2D5A47] hover:bg-[#1E3D32] text-white"
          >
            <Play className="w-3 h-3 mr-1" />
            Start Timer
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="border-b border-[#E8DCC4]">
      {/* Header */}
      <div className="p-3 space-y-2">
        {/* View Toggle */}
        <div className="flex gap-1 p-1 bg-[#F5F0E6] rounded-lg">
          <button
            onClick={() => setViewMode("today")}
            className={cn(
              "flex-1 px-2 py-1 text-xs font-medium rounded transition-colors",
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
              "flex-1 px-2 py-1 text-xs font-medium rounded transition-colors",
              viewMode === "week"
                ? "bg-white text-[#1E3D32] shadow-sm"
                : "text-[#5C7A6B] hover:text-[#1E3D32]"
            )}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode("all")}
            className={cn(
              "flex-1 px-2 py-1 text-xs font-medium rounded transition-colors",
              viewMode === "all"
                ? "bg-white text-[#1E3D32] shadow-sm"
                : "text-[#5C7A6B] hover:text-[#1E3D32]"
            )}
          >
            All
          </button>
        </div>

        {/* Search (only for "all" view) */}
        {viewMode === "all" && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#8B9A8F]" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-7 text-xs bg-white border-[#E8DCC4]"
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAiInsights(!showAiInsights)}
            className={cn(
              "h-7 px-2 gap-1 text-xs",
              showAiInsights ? "text-[#2D5A47]" : "text-[#8B9A8F]"
            )}
          >
            <Sparkles className="h-3 w-3" />
            AI
            {isAnalyzing && <Loader2 className="h-3 w-3 animate-spin" />}
          </Button>

          {showAiInsights && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs">
                  <ArrowUpDown className="h-3 w-3" />
                  <span className="capitalize">{sortMode.replace("-", " ")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortMode("suggested")}>
                  <Sparkles className="h-3 w-3 mr-2" />
                  Suggested
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortMode("priority")}>
                  Priority
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortMode("time-asc")}>
                  <Clock className="h-3 w-3 mr-2" />
                  Quickest
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortMode("time-desc")}>
                  <Clock className="h-3 w-3 mr-2" />
                  Longest
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="max-h-[300px] overflow-y-auto px-2 pb-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-20 text-[#8B9A8F] text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-[#8B9A8F] text-sm">
            {searchQuery ? "No matching tasks" : "🎉 All caught up!"}
          </div>
        ) : viewMode === "week" ? (
          // Week view - grouped by day (matching Dashboard)
          <div className="space-y-4">
            {sortedDays.map((day) => {
              const dayTasks = tasksByDay[day];
              const isToday = day !== "No Date" && new Date(day).toDateString() === today.toDateString();
              const isPast = day !== "No Date" && new Date(day) < today;

              return (
                <div key={day} className="space-y-2">
                  <div className={cn(
                    "flex items-center gap-2 px-2 py-1",
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
                  <div className="ml-3 border-l-2 border-[#E8DCC4] pl-2 space-y-2">
                    {dayTasks.map((task) => (
                      <TaskItem key={task.id} task={task} showOrder={sortMode === "suggested"} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Today / All view - simple list
          <div className="space-y-2">
            {sortedTasks.map((task) => (
              <TaskItem key={task.id} task={task} showOrder={sortMode === "suggested"} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
