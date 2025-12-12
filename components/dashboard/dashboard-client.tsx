"use client";

import { TaskProvider, Task } from "./task-context";
import { CalendarProvider, CalendarEvent } from "./calendar-context";
import { CombinedSyncStatus } from "./combined-sync-status";
import { TaskList } from "./task-list";
import { EventList } from "./event-list";
import { useTaskContext } from "./task-context";

interface DashboardClientProps {
  initialTasks: Task[];
  initialEvents: CalendarEvent[];
  isTickTickConnected: boolean;
  isGoogleCalendarConnected: boolean;
}

export function DashboardClient({ 
  initialTasks, 
  initialEvents,
  isTickTickConnected,
  isGoogleCalendarConnected,
}: DashboardClientProps) {
  return (
    <TaskProvider initialTasks={initialTasks} isConnected={isTickTickConnected}>
      <CalendarProvider initialEvents={initialEvents} isConnected={isGoogleCalendarConnected}>
        <CombinedSyncStatus />
        
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Today's Tasks */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm">
            <div className="mb-4">
              <h2 className="font-serif text-lg font-semibold text-[#1E3D32]">Tasks</h2>
              <TaskCount isConnected={isTickTickConnected} />
            </div>
            <TaskList isConnected={isTickTickConnected} />
          </div>

          {/* Calendar */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm">
            <div className="mb-4">
              <h2 className="font-serif text-lg font-semibold text-[#1E3D32]">Calendar</h2>
              <EventCount isConnected={isGoogleCalendarConnected} />
            </div>
            <EventList isConnected={isGoogleCalendarConnected} />
          </div>
        </div>
      </CalendarProvider>
    </TaskProvider>
  );
}

// Task count component
function TaskCount({ isConnected }: { isConnected: boolean }) {
  const { tasks } = useTaskContext();
  
  if (!isConnected) {
    return <p className="text-sm text-[#8B9A8F]">Connect TickTick to see tasks</p>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const weekTasks = tasks.filter((task) => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate < endOfWeek;
  });
  
  return (
    <p className="text-sm text-[#8B9A8F]">
      {weekTasks.length} task{weekTasks.length !== 1 ? 's' : ''} this week
    </p>
  );
}

// Event count component  
import { useCalendarContext } from "./calendar-context";

function EventCount({ isConnected }: { isConnected: boolean }) {
  const { events } = useCalendarContext();
  
  if (!isConnected) {
    return <p className="text-sm text-[#8B9A8F]">Connect Google Calendar to see events</p>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayEvents = events.filter((event) => {
    if (event.status === "cancelled") return false;
    const startTime = new Date(event.startTime);
    return startTime >= today && startTime < tomorrow;
  });
  
  return (
    <p className="text-sm text-[#8B9A8F]">
      {todayEvents.length} event{todayEvents.length !== 1 ? 's' : ''} today
    </p>
  );
}
