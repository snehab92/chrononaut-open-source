"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Circle, Loader2, Calendar, Play, Search,
  ArrowRight, ChevronDown, ArrowUpDown
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
}

interface FocusTaskListProps {
  onSelectTask: (task: FocusTask) => void;
  onStartTimer: (task: FocusTask) => void;
  selectedTaskId?: string;
  isFocusing: boolean;
}

type ViewMode = "today" | "week" | "all";
type SortMode = "priority" | "due-date";

const priorityColors: Record<number, string> = {
  3: "text-red-500",
  2: "text-orange-500",
  1: "text-blue-500",
  0: "text-[#8B9A8F]",
};

export function FocusTaskList({ onSelectTask, onStartTimer, selectedTaskId, isFocusing }: FocusTaskListProps) {
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [searchQuery, setSearchQuery] = useState("");

  // Date update state
  const [updatingDate, setUpdatingDate] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

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
      })));
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Date helpers
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  // Filter tasks based on view mode and search
  const filteredTasks = tasks.filter((task) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(query)) return false;
    }

    if (viewMode === "all") return true;
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
      case "due-date": {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
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

  // Handle date change via local API
  const handleDateChange = async (task: FocusTask, newDate: Date | undefined) => {
    if (!newDate) return;
    setUpdatingDate(task.id);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          due_date: newDate.toISOString().split("T")[0],
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

  if (tasks.length === 0 && !isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center h-24 text-[#8B9A8F] text-sm border-2 border-dashed border-[#E8DCC4] rounded-xl">
          <Link href="/dashboard" className="flex items-center gap-2 hover:text-[#2D5A47] transition-colors">
            Add tasks from your dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const TaskItem = ({ task }: { task: FocusTask }) => {
    const isSelected = task.id === selectedTaskId;

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
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-[#1E3D32] leading-relaxed">
                {task.title}
              </p>
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-3 flex-wrap">
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

        {/* Sort Control */}
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs">
                <ArrowUpDown className="h-3 w-3" />
                <span className="capitalize">{sortMode.replace("-", " ")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortMode("priority")}>
                Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortMode("due-date")}>
                Due Date
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            {searchQuery ? "No matching tasks" : "All caught up!"}
          </div>
        ) : viewMode === "week" ? (
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
                      <TaskItem key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
