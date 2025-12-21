"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Task {
  id: string;
  localId: string;
  title: string;
  content: string | null; // Task description/details - used for [u.e Xm] parsing
  projectId: string;
  priority: number;
  dueDate: string | null;
  isCompleted: boolean;
  syncStatus: string;
  ticktickListName: string | null;
  ticktickSectionName: string | null;
}

interface TaskContextValue {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  refreshTasks: () => Promise<void>;
}

const TaskContext = createContext<TaskContextValue | null>(null);

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTaskContext must be used within TaskProvider");
  }
  return context;
}

interface TaskProviderProps {
  children: React.ReactNode;
  initialTasks: Task[];
  isConnected: boolean;
}

// Map local priority (0-4) back to TickTick format (0,1,3,5) for UI consistency
function mapLocalPriority(localPriority: number): number {
  switch (localPriority) {
    case 3: return 5; // high
    case 2: return 3; // medium
    case 1: return 1; // low
    default: return 0; // none
  }
}

export function TaskProvider({ children, initialTasks, isConnected }: TaskProviderProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTasks = useCallback(async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("Not authenticated");
        return;
      }

      const { data: tasksData, error: fetchError } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      // Transform to match Task interface
      const formattedTasks: Task[] = (tasksData || []).map((task: any) => ({
        id: task.ticktick_id || task.id,
        localId: task.id,
        title: task.title,
        content: task.content || null, // Task description for [u.e Xm] parsing
        projectId: task.ticktick_list_id,
        priority: mapLocalPriority(task.priority),
        dueDate: task.due_date,
        isCompleted: task.completed,
        syncStatus: task.sync_status,
        ticktickListName: task.ticktick_list_name || null,
        ticktickSectionName: task.ticktick_section_name || null,
      }));

      setTasks(formattedTasks);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  return (
    <TaskContext.Provider value={{ tasks, isLoading, error, refreshTasks }}>
      {children}
    </TaskContext.Provider>
  );
}
