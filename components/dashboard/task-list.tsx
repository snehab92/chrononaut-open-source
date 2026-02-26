"use client";

import { useState } from "react";
import {
  Circle, Loader2, Calendar, ChevronDown,
  ArrowUpDown
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTaskContext, Task } from "./task-context";
import { cn } from "@/lib/utils";

interface TaskListProps {
  compact?: boolean;
  onStartTask?: (task: Task) => void;
}

type ViewMode = "today" | "week";
type SortMode = "priority" | "due-date";

const priorityColors: Record<number, string> = {
  3: "text-red-500",
  2: "text-orange-500",
  1: "text-blue-500",
  0: "text-[#8B9A8F]",
};

export function TaskList({ compact = false, onStartTask }: TaskListProps) {
  const { tasks, refreshTasks } = useTaskContext();
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const [updatingDate, setUpdatingDate] = useState<string | null>(null);

  // Filter tasks based on view mode
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const filteredTasks = tasks.filter((task) => {
    if (!task.dueDate) return viewMode === "week";
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
      case "due-date": {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
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
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
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
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ due_date: newDate.toISOString().split("T")[0] }),
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

  const TaskItem = ({ task }: { task: Task }) => {
    return (
      <div className={cn(
        "p-3 rounded-xl transition-all group border bg-white hover:bg-[#F5F0E6] border-transparent hover:border-[#E8DCC4]",
        compact && "p-2"
      )}>
        <div className="flex items-start gap-3">
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
            <div className="flex items-start justify-between gap-2">
              <p className={cn(
                "text-sm text-[#1E3D32] leading-relaxed font-medium",
                compact && "text-xs"
              )}>
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

            <div className="flex items-center gap-3 flex-wrap">
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
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (tasks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center h-32 text-[#8B9A8F] text-sm border-2 border-dashed border-[#E8DCC4] rounded-xl">
          No tasks yet. Add one with the + button above.
        </div>
      </div>
    );
  }

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
              <ArrowUpDown className="h-4 w-4" />
              <span className="text-xs capitalize">{sortMode.replace("-", " ")}</span>
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

      {filteredTasks.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-[#8B9A8F] text-sm border-2 border-dashed border-[#E8DCC4] rounded-xl">
          {viewMode === "today" ? "All caught up for today!" : "Nothing due this week!"}
        </div>
      ) : viewMode === "today" ? (
        <div className="space-y-2">
          {sortedTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
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
