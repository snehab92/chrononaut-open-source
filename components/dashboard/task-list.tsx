"use client";

import { useState, useEffect } from "react";
import { Circle, Loader2, Calendar, ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useTaskContext, Task } from "./task-context";

interface TaskListProps {
  isConnected: boolean;
}

type ViewMode = "today" | "week";

export function TaskList({ isConnected }: TaskListProps) {
  const { tasks, refreshTasks } = useTaskContext();
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const [updatingDate, setUpdatingDate] = useState<string | null>(null);

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
      // Today: due today or overdue
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return dueDate < tomorrow;
    } else {
      // Week: due within next 7 days (including overdue)
      return dueDate < endOfWeek;
    }
  });

  // Group tasks by day for week view
  const tasksByDay = filteredTasks.reduce((acc, task) => {
    if (!task.dueDate) return acc;
    const dateKey = new Date(task.dueDate).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Sort days chronologically
  const sortedDays = Object.keys(tasksByDay).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

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
        // Refresh tasks from database
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
        // Refresh tasks from database
        await refreshTasks();
      }
    } catch (error) {
      console.error("Failed to update due date:", error);
    } finally {
      setUpdatingDate(null);
    }
  };

  // Priority colors matching TickTick
  const priorityColors: Record<number, string> = {
    5: "text-red-500",
    3: "text-yellow-500",
    1: "text-blue-500",
    0: "text-[#8B9A8F]",
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
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

  const TaskItem = ({ task }: { task: Task }) => (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#F5F0E6] transition-colors group">
      <button
        onClick={() => handleComplete(task)}
        disabled={completingTask === task.id}
        className="mt-0.5 flex-shrink-0"
      >
        {completingTask === task.id ? (
          <Loader2 className="h-5 w-5 text-[#8B9A8F] animate-spin" />
        ) : (
          <Circle
            className={`h-5 w-5 ${priorityColors[task.priority] || priorityColors[0]} 
              group-hover:text-[#2D5A47] transition-colors cursor-pointer`}
          />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#1E3D32] leading-tight">{task.title}</p>

        {/* Date picker - only show in today view */}
        {viewMode === "today" && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={`flex items-center gap-1 mt-1 text-xs transition-colors
                  ${isOverdue(task.dueDate)
                    ? "text-red-500 hover:text-red-600"
                    : "text-[#8B9A8F] hover:text-[#5C7A6B]"
                  }`}
                disabled={updatingDate === task.id}
              >
                {updatingDate === task.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Calendar className="h-3 w-3" />
                )}
                <span>{formatDate(task.dueDate) || "No date"}</span>
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleDateChange(task, new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    const tmrw = new Date();
                    tmrw.setDate(tmrw.getDate() + 1);
                    handleDateChange(task, tmrw);
                  }}
                >
                  Tomorrow
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    handleDateChange(task, nextWeek);
                  }}
                >
                  Next week
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );

  if (!isConnected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center h-32 text-[#8B9A8F] text-sm border-2 border-dashed border-[#E8DCC4] rounded-xl">
          <Link
            href="/settings"
            className="flex items-center gap-2 hover:text-[#2D5A47] transition-colors"
          >
            Connect TickTick to see tasks
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex gap-1 p-1 bg-[#F5F0E6] rounded-lg w-fit">
        <button
          onClick={() => setViewMode("today")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            viewMode === "today"
              ? "bg-white text-[#1E3D32] shadow-sm"
              : "text-[#5C7A6B] hover:text-[#1E3D32]"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setViewMode("week")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            viewMode === "week"
              ? "bg-white text-[#1E3D32] shadow-sm"
              : "text-[#5C7A6B] hover:text-[#1E3D32]"
          }`}
        >
          This Week
        </button>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-[#8B9A8F] text-sm border-2 border-dashed border-[#E8DCC4] rounded-xl">
          🎉 {viewMode === "today" ? "All caught up for today!" : "Nothing due this week!"}
        </div>
      ) : viewMode === "today" ? (
        // Today view - simple list
        <div className="space-y-1">
          {filteredTasks
            .sort((a, b) => b.priority - a.priority)
            .map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
        </div>
      ) : (
        // Week view - grouped by day (timeline style)
        <div className="space-y-4">
          {sortedDays.map((day) => {
            const dayTasks = tasksByDay[day];
            const isToday = new Date(day).toDateString() === today.toDateString();
            const isPast = new Date(day) < today;

            return (
              <div key={day} className="space-y-1">
                {/* Day header */}
                <div className={`flex items-center gap-2 px-3 py-1 ${
                  isPast ? "text-red-500" : isToday ? "text-[#2D5A47] font-medium" : "text-[#5C7A6B]"
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isPast ? "bg-red-500" : isToday ? "bg-[#2D5A47]" : "bg-[#E8DCC4]"
                  }`} />
                  <span className="text-xs uppercase tracking-wide">
                    {formatDayHeader(day)}
                  </span>
                  <span className="text-xs text-[#8B9A8F]">
                    ({dayTasks.length})
                  </span>
                </div>

                {/* Tasks for this day */}
                <div className="ml-4 border-l-2 border-[#E8DCC4] pl-2 space-y-1">
                  {dayTasks
                    .sort((a, b) => b.priority - a.priority)
                    .map((task) => (
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
