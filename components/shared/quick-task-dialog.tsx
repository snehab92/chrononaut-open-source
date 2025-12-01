"use client";

import { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";
import { Plus, Loader2, Calendar, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

// Simple inline quick-add parser (no external dependency)
function parseQuickAdd(input: string): { title: string; priority?: number; dueDate?: string } {
  let text = input.trim();
  let priority: number | undefined;
  let dueDate: string | undefined;

  // Parse priority
  const priorityMatch = text.match(/\s*!(high|med|medium|low)\s*/i);
  if (priorityMatch) {
    const p = priorityMatch[1].toLowerCase();
    priority = p === "high" ? 3 : p === "med" || p === "medium" ? 2 : 1;
    text = text.replace(priorityMatch[0], " ").trim();
  }

  // Parse due date keywords
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDatePatterns: [RegExp, () => Date][] = [
    [/\btoday\b/i, () => new Date(today)],
    [/\btomorrow\b/i, () => { const d = new Date(today); d.setDate(d.getDate() + 1); return d; }],
    [/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, () => {
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const target = days.indexOf(text.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)![1].toLowerCase());
      const d = new Date(today);
      const current = d.getDay();
      const diff = (target - current + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d;
    }],
  ];

  for (const [pattern, getDate] of dueDatePatterns) {
    if (pattern.test(text)) {
      dueDate = getDate().toISOString();
      text = text.replace(pattern, " ").trim();
      break;
    }
  }

  return { title: text, priority, dueDate };
}

// Context for controlling the dialog globally
interface QuickTaskContextValue {
  open: boolean;
  openDialog: () => void;
  closeDialog: () => void;
}

const QuickTaskContext = createContext<QuickTaskContextValue | null>(null);

export function useQuickTask() {
  const context = useContext(QuickTaskContext);
  if (!context) {
    throw new Error("useQuickTask must be used within QuickTaskProvider");
  }
  return context;
}

export function QuickTaskProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const openDialog = useCallback(() => setOpen(true), []);
  const closeDialog = useCallback(() => setOpen(false), []);

  // Listen for /t keyboard shortcut (slash command style)
  useEffect(() => {
    let slashPressed = false;
    let slashTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.key === "/") {
        slashPressed = true;
        if (slashTimeout) clearTimeout(slashTimeout);
        slashTimeout = setTimeout(() => {
          slashPressed = false;
        }, 1000);
        return;
      }

      if (slashPressed && e.key.toLowerCase() === "t") {
        e.preventDefault();
        slashPressed = false;
        if (slashTimeout) clearTimeout(slashTimeout);
        setOpen(true);
      } else if (slashPressed && e.key !== "t") {
        slashPressed = false;
        if (slashTimeout) clearTimeout(slashTimeout);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (slashTimeout) clearTimeout(slashTimeout);
    };
  }, []);

  return (
    <QuickTaskContext.Provider value={{ open, openDialog, closeDialog }}>
      {children}
      <QuickTaskDialog open={open} onOpenChange={setOpen} />
    </QuickTaskContext.Provider>
  );
}

interface QuickTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Priority display helpers
const PRIORITY_COLORS: Record<number, string> = {
  3: "text-red-500",
  2: "text-orange-500",
  1: "text-blue-500",
  0: "text-gray-400",
};

const PRIORITY_NAMES: Record<number, string> = {
  3: "High",
  2: "Medium",
  1: "Low",
  0: "None",
};

function QuickTaskDialog({ open, onOpenChange }: QuickTaskDialogProps) {
  const [input, setInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const supabase = createClient();

  // Parse input as user types
  const parsed = useMemo(() => parseQuickAdd(input), [input]);

  // Check if we have any metadata to show
  const hasMetadata = (parsed.priority !== undefined && parsed.priority > 0) || parsed.dueDate;

  const handleCreate = async () => {
    if (!parsed.title.trim()) return;

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("Not authenticated");
        return;
      }

      // Create local task
      const { error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: parsed.title.trim(),
          priority: parsed.priority || 0,
          due_date: parsed.dueDate ? parsed.dueDate.split("T")[0] : null,
        });

      if (error) {
        console.error("Failed to create task:", error);
        return;
      }

      // Success - close and reset
      setInput("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
  };

  // Format due date for display
  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#5C7A6B]" />
            Quick Task
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buy groceries !high tomorrow"
              autoFocus
              className="text-lg"
            />

            {/* Shorthand hints */}
            <p className="text-xs text-[#8B9A8F]">
              Shortcuts: <code className="bg-[#F5F0E6] px-1 rounded">!high</code>{" "}
              <code className="bg-[#F5F0E6] px-1 rounded">!med</code>{" "}
              <code className="bg-[#F5F0E6] px-1 rounded">!low</code>{" "}
              <code className="bg-[#F5F0E6] px-1 rounded">today</code>{" "}
              <code className="bg-[#F5F0E6] px-1 rounded">tomorrow</code>{" "}
              <code className="bg-[#F5F0E6] px-1 rounded">monday</code>
            </p>

            {/* Preview of parsed metadata */}
            {hasMetadata && (
              <div className="flex flex-wrap gap-2 pt-1">
                {parsed.priority !== undefined && parsed.priority > 0 && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#F5F0E6] ${PRIORITY_COLORS[parsed.priority]}`}>
                    <Flag className="w-3 h-3" />
                    {PRIORITY_NAMES[parsed.priority]}
                  </span>
                )}
                {parsed.dueDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#F5F0E6] text-[#5C7A6B]">
                    <Calendar className="w-3 h-3" />
                    {formatDueDate(parsed.dueDate)}
                  </span>
                )}
              </div>
            )}

            {/* Show parsed title preview if different from input */}
            {parsed.title && parsed.title !== input.trim() && (
              <p className="text-sm text-[#5C7A6B]">
                Task: <span className="font-medium text-[#1E3D32]">{parsed.title}</span>
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!parsed.title.trim() || isCreating}
              className="bg-[#1E3D32] hover:bg-[#2a5446] text-white"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
