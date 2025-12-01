"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Task {
  id: string;
  title: string;
  content: string | null;
  priority: number;
  dueDate: string | null;
  isCompleted: boolean;
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
}

export function TaskProvider({ children, initialTasks }: TaskProviderProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTasks = useCallback(async () => {
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

      const formattedTasks: Task[] = (tasksData || []).map((task: any) => ({
        id: task.id,
        title: task.title,
        content: task.content || null,
        priority: task.priority,
        dueDate: task.due_date,
        isCompleted: task.completed,
      }));

      setTasks(formattedTasks);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <TaskContext.Provider value={{ tasks, isLoading, error, refreshTasks }}>
      {children}
    </TaskContext.Provider>
  );
}
