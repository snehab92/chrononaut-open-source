"use client";

import { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";
import { Plus, Loader2, Calendar, Flag, FolderOpen, ChevronDown, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { parseQuickAdd } from "@/lib/ticktick/quick-add-parser";

interface TickTickProject {
  id: string;
  name: string;
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
        // Reset after 1 second if no 't' follows
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
        // Any other key resets the slash state
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
  5: "text-red-500",
  3: "text-orange-500",
  1: "text-blue-500",
  0: "text-gray-400",
};

const PRIORITY_NAMES: Record<number, string> = {
  5: "High",
  3: "Medium",
  1: "Low",
  0: "None",
};

function QuickTaskDialog({ open, onOpenChange }: QuickTaskDialogProps) {
  const [input, setInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [projects, setProjects] = useState<TickTickProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<TickTickProject | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const supabase = createClient();

  // Fetch TickTick projects when dialog opens
  useEffect(() => {
    if (open && projects.length === 0) {
      fetchProjects();
    }
  }, [open]);

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await fetch("/api/integrations/ticktick/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch {
      console.log("Failed to fetch TickTick projects");
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Parse input as user types
  const parsed = useMemo(() => parseQuickAdd(input), [input]);

  // Check if we have any metadata to show (removed listName and sectionName)
  const hasMetadata = parsed.priority !== undefined || parsed.dueDate || selectedProject;

  const handleCreate = async () => {
    if (!parsed.title.trim()) return;

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("Not authenticated");
        return;
      }

      // Try to create in TickTick first if connected
      let ticktickId: string | null = null;
      let ticktickListId: string | null = null;

      try {
        const response = await fetch("/api/integrations/ticktick/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: parsed.title.trim(),
            priority: parsed.priority || 0,
            dueDate: parsed.dueDate || null,
            projectId: selectedProject?.id || undefined,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          ticktickId = data.ticktickId;
          ticktickListId = data.projectId;
        }
      } catch {
        // TickTick not connected or failed - continue with local only
        console.log("TickTick sync skipped - not connected or failed");
      }

      // Map TickTick priority to local priority
      const localPriority = parsed.priority === 5 ? 3 : parsed.priority === 3 ? 2 : parsed.priority === 1 ? 1 : 0;

      // Create local task (with ticktick_id if available)
      const { error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: parsed.title.trim(),
          priority: localPriority,
          due_date: parsed.dueDate ? parsed.dueDate.split("T")[0] : null,
          ticktick_id: ticktickId,
          ticktick_list_id: ticktickListId,
          sync_status: ticktickId ? "synced" : "local_only",
        });

      if (error) {
        console.error("Failed to create task:", error);
        return;
      }

      // Success - close and reset
      setInput("");
      setSelectedProject(null);
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

            {/* List picker */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8B9A8F]">List:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 border-[#E8DCC4] text-[#5C7A6B]"
                    disabled={isLoadingProjects}
                  >
                    {selectedProject ? (
                      <>
                        <FolderOpen className="w-3.5 h-3.5" />
                        {selectedProject.name}
                      </>
                    ) : (
                      <>
                        <Inbox className="w-3.5 h-3.5" />
                        Inbox
                      </>
                    )}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setSelectedProject(null)}>
                    <Inbox className="w-4 h-4 mr-2" />
                    Inbox
                  </DropdownMenuItem>
                  {projects.map((project) => (
                    <DropdownMenuItem
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      {project.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

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
                {selectedProject && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#F5F0E6] text-[#5C7A6B]">
                    <FolderOpen className="w-3 h-3" />
                    {selectedProject.name}
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
