"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Timer, Play, Pause, Square, ChevronRight, ChevronLeft,
  Zap, FileText, Users, Mic, Briefcase, Maximize2, Minimize2,
  CheckCircle2, Clock, Sparkles, Bell, BellOff,
  ChevronDown, ChevronUp, Brain, BarChart3, X, Copy, Check, RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useChatDrawer } from "@/components/chat/chat-provider";
import { FocusTaskList, FocusTask } from "@/components/focus/focus-task-list";
import { FocusCalendarWidget } from "@/components/focus/focus-calendar-widget";
import { FocusAnalyticsWidget } from "@/components/focus/focus-analytics-widget";
import { FocusNoteEditor } from "@/components/focus/focus-note-editor";
import { FocusCuePopup } from "@/components/focus/focus-cue-popup";
import { useFocusCues } from "@/hooks/use-focus-cues";

type FocusMode = "admin" | "research" | "writing" | "meeting-prep" | "toastmasters";

const MODE_CONFIG: Record<FocusMode, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
  agentType: string;
}> = {
  admin: {
    label: "Admin",
    icon: <Briefcase className="w-4 h-4" />,
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    description: "Quick tasks, emails, scheduling",
    agentType: "research-assistant"
  },
  research: {
    label: "Research",
    icon: <FileText className="w-4 h-4" />,
    color: "bg-purple-500",
    bgColor: "bg-purple-50",
    description: "Web search, summarization, deep dives",
    agentType: "research-assistant"
  },
  writing: {
    label: "Writing",
    icon: <Zap className="w-4 h-4" />,
    color: "bg-amber-500",
    bgColor: "bg-amber-50",
    description: "Documents, drafts, creative work",
    agentType: "executive-coach"
  },
  "meeting-prep": {
    label: "Meeting Prep",
    icon: <Users className="w-4 h-4" />,
    color: "bg-green-500",
    bgColor: "bg-green-50",
    description: "Context briefing, risk assessment",
    agentType: "executive-coach"
  },
  toastmasters: {
    label: "Toastmasters",
    icon: <Mic className="w-4 h-4" />,
    color: "bg-pink-500",
    bgColor: "bg-pink-50",
    description: "Speech practice, voice coaching",
    agentType: "executive-coach"
  }
};

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Session persistence key
const SESSION_STORAGE_KEY = "chrononaut_focus_session";

interface StoredSession {
  sessionId: string;
  startedAt: string;
  focusMode: FocusMode;
  focusTime: number; // Store elapsed time
  taskId?: string;
  taskTitle?: string;
  taskPriority?: number;
  taskTime?: number;
  taskTimerRunning?: boolean;
  noteId?: string;
}

export default function FocusPage() {
  // Core state
  const [mode, setMode] = useState<FocusMode>("writing");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFocusing, setIsFocusing] = useState(false);
  const [focusTime, setFocusTime] = useState(0);
  const [taskTime, setTaskTime] = useState(0);
  const [isTaskTimerRunning, setIsTaskTimerRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  
  // Task state - separate selection from timer
  const [selectedTask, setSelectedTask] = useState<FocusTask | null>(null);
  const [activeTimerTask, setActiveTimerTask] = useState<FocusTask | null>(null);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(true);
  
  // AI state
  const [getStartedContent, setGetStartedContent] = useState<string | null>(null);
  const [isLoadingGetStarted, setIsLoadingGetStarted] = useState(false);
  const [focusCuesEnabled, setFocusCuesEnabled] = useState(true);
  const [isQuickStartExpanded, setIsQuickStartExpanded] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  
  // Analytics widget
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  
  // Note state - for opening notes from calendar
  const [initialNoteId, setInitialNoteId] = useState<string | undefined>(undefined);
  
  // Refs
  const focusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const taskTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionStartRef = useRef<Date | null>(null);
  const lastSaveRef = useRef<number>(0);
  
  const supabase = createClient();
  const { isOpen: isChatOpen } = useChatDrawer();

  const modeConfig = MODE_CONFIG[mode];

  // Focus Cues - ADHD-informed gentle coaching
  const {
    currentCue,
    dismissCue,
    snoozeCue,
  } = useFocusCues({
    enabled: focusCuesEnabled,
    isFocusing,
    focusTimeSeconds: focusTime,
    taskTimeSeconds: taskTime,
    taskTitle: activeTimerTask?.title || selectedTask?.title || null,
    focusMode: mode,
    onTakeBreak: () => {
      // Pause the task timer but keep session running
      setIsTaskTimerRunning(false);
    },
    onCompleteTask: () => {
      if (activeTimerTask) {
        completeTask();
      }
    },
    onSwitchTask: () => {
      // Open task drawer and clear current task
      setIsTaskDrawerOpen(true);
      abandonTask();
    },
  });

  // Handle cue action
  const handleCueAction = (action: string) => {
    switch (action) {
      case "take_break":
        setIsTaskTimerRunning(false);
        dismissCue();
        break;
      case "complete_task":
        if (activeTimerTask) {
          completeTask();
        }
        dismissCue();
        break;
      case "switch_task":
        setIsTaskDrawerOpen(true);
        abandonTask();
        dismissCue();
        break;
      default:
        dismissCue();
    }
  };

  // Persist session to localStorage (throttled)
  const persistSession = useCallback(() => {
    const now = Date.now();
    // Throttle saves to every 5 seconds
    if (now - lastSaveRef.current < 5000) return;
    lastSaveRef.current = now;

    if (sessionId && isFocusing) {
      const session: StoredSession = {
        sessionId,
        startedAt: sessionStartRef.current?.toISOString() || new Date().toISOString(),
        focusMode: mode,
        focusTime,
        taskId: activeTimerTask?.id,
        taskTitle: activeTimerTask?.title,
        taskPriority: activeTimerTask?.priority,
        taskTime,
        taskTimerRunning: isTaskTimerRunning,
        noteId: initialNoteId,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }, [sessionId, isFocusing, mode, focusTime, activeTimerTask, taskTime, isTaskTimerRunning, initialNoteId]);

  // Restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored && !isRestored) {
      try {
        const session: StoredSession = JSON.parse(stored);
        
        // Restore session state
        setSessionId(session.sessionId);
        setMode(session.focusMode);
        setFocusTime(session.focusTime);
        setIsFocusing(true);
        sessionStartRef.current = new Date(session.startedAt);
        
        // Restore task timer if there was one
        if (session.taskId && session.taskTitle) {
          const restoredTask: FocusTask = {
            id: session.taskId,
            title: session.taskTitle,
            priority: session.taskPriority || 0,
            due_date: null,
            content: null,
            estimated_minutes: null,
            ticktick_id: null,
            ticktick_list_id: null,
            ticktick_list_name: null,
            ticktick_section_name: null,
          };
          setActiveTimerTask(restoredTask);
          setSelectedTask(restoredTask);
          setTaskTime(session.taskTime || 0);
          setIsTaskTimerRunning(session.taskTimerRunning || false);
        }
        
        // Restore note if there was one
        if (session.noteId) {
          setInitialNoteId(session.noteId);
        }
        
        setIsRestored(true);
      } catch (e) {
        console.error("Failed to restore session:", e);
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setIsRestored(true);
      }
    } else {
      setIsRestored(true);
    }
  }, [isRestored]);

  // Save session periodically and on state changes
  useEffect(() => {
    if (isFocusing && isRestored) {
      persistSession();
    }
  }, [isFocusing, focusTime, taskTime, activeTimerTask, isRestored, persistSession]);

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionId && isFocusing) {
        const session: StoredSession = {
          sessionId,
          startedAt: sessionStartRef.current?.toISOString() || new Date().toISOString(),
          focusMode: mode,
          focusTime,
          taskId: activeTimerTask?.id,
          taskTitle: activeTimerTask?.title,
          taskPriority: activeTimerTask?.priority,
          taskTime,
          taskTimerRunning: isTaskTimerRunning,
          noteId: initialNoteId,
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionId, isFocusing, mode, focusTime, activeTimerTask, taskTime, isTaskTimerRunning, initialNoteId]);

  // Focus timer - runs when focusing
  useEffect(() => {
    if (isFocusing && isRestored) {
      focusTimerRef.current = setInterval(() => {
        setFocusTime(prev => prev + 1);
      }, 1000);
    } else {
      if (focusTimerRef.current) {
        clearInterval(focusTimerRef.current);
      }
    }
    
    return () => {
      if (focusTimerRef.current) {
        clearInterval(focusTimerRef.current);
      }
    };
  }, [isFocusing, isRestored]);

  // Task timer - runs when task timer is active
  useEffect(() => {
    if (isTaskTimerRunning && isRestored) {
      taskTimerRef.current = setInterval(() => {
        setTaskTime(prev => prev + 1);
      }, 1000);
    } else {
      if (taskTimerRef.current) {
        clearInterval(taskTimerRef.current);
      }
    }
    
    return () => {
      if (taskTimerRef.current) {
        clearInterval(taskTimerRef.current);
      }
    };
  }, [isTaskTimerRunning, isRestored]);

  // Start focus session - save to time_blocks
  const startFocus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const startTime = new Date();
    sessionStartRef.current = startTime;
    
    // Create time_block record
    const { data, error } = await supabase
      .from("time_blocks")
      .insert({
        user_id: user.id,
        focus_mode: mode.replace("-", "_") as any,
        started_at: startTime.toISOString(),
        planned_minutes: 90,
      })
      .select()
      .single();
    
    if (!error && data) {
      setSessionId(data.id);
    }
    
    setIsFocusing(true);
    setFocusTime(0);
    setTaskTime(0);
  };

  // End focus session - update time_block
  const endFocus = async () => {
    if (sessionId && sessionStartRef.current) {
      await supabase
        .from("time_blocks")
        .update({
          ended_at: new Date().toISOString(),
          completed: true,
          task_id: activeTimerTask?.id || null,
        })
        .eq("id", sessionId);
    }
    
    // Clear persisted session
    localStorage.removeItem(SESSION_STORAGE_KEY);
    
    setIsFocusing(false);
    setIsTaskTimerRunning(false);
    setSelectedTask(null);
    setActiveTimerTask(null);
    setGetStartedContent(null);
    setSessionId(null);
    sessionStartRef.current = null;
  };

  // Select a task (without starting timer)
  const handleSelectTask = (task: FocusTask) => {
    setSelectedTask(task);
  };

  // Start timer for selected task
  const startTaskTimer = (task: FocusTask) => {
    setActiveTimerTask(task);
    setSelectedTask(task);
    setTaskTime(0);
    setIsTaskTimerRunning(true);
    setGetStartedContent(null);
    
    // Update time_block with task
    if (sessionId) {
      supabase
        .from("time_blocks")
        .update({ task_id: task.id })
        .eq("id", sessionId);
    }
  };

  // Pause/resume task timer
  const toggleTaskTimer = () => {
    setIsTaskTimerRunning(!isTaskTimerRunning);
  };

  // Abandon task (stop timer without completing)
  const abandonTask = () => {
    setActiveTimerTask(null);
    setIsTaskTimerRunning(false);
    setTaskTime(0);
    setGetStartedContent(null);
  };

  // Complete task - update Supabase AND TickTick
  const completeTask = async () => {
    if (!activeTimerTask) return;
    
    const actualMinutes = Math.round(taskTime / 60);
    
    // Update in Supabase
    await supabase
      .from("tasks")
      .update({ 
        completed: true, 
        completed_at: new Date().toISOString(),
        actual_minutes: actualMinutes,
      })
      .eq("id", activeTimerTask.id);
    
    // Sync to TickTick if connected
    if (activeTimerTask.ticktick_id) {
      try {
        await fetch("/api/integrations/ticktick/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: activeTimerTask.ticktick_id,
            projectId: activeTimerTask.ticktick_list_id,
          }),
        });
      } catch (error) {
        console.error("Failed to sync task completion to TickTick:", error);
      }
    }
    
    setActiveTimerTask(null);
    setSelectedTask(null);
    setIsTaskTimerRunning(false);
    setTaskTime(0);
    setGetStartedContent(null);
  };

  // Get AI "Get Started" content - triggered by clicking Quick Start card
  const getStartedHelp = async () => {
    const taskForHelp = activeTimerTask || selectedTask;
    if (!taskForHelp) return;
    
    setIsLoadingGetStarted(true);
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `I'm about to work on this task in ${modeConfig.label} mode: "${taskForHelp.title}"

Please give me a quick "get started" brief with:
1. **Framework**: Best approach/structure for this type of task
2. **First Step**: The single smallest action to begin
3. **Cognitive Trap**: One bias or pattern to watch for (perfectionism, scope creep, etc.)
4. **Time Check**: Realistic time estimate and a checkpoint

Keep it concise and actionable - I have ADHD and need clear, direct guidance.`
          }],
          agentType: modeConfig.agentType,
          focusMode: mode,
          conversationId: crypto.randomUUID(),
        }),
      });

      if (!response.ok) throw new Error("Failed to get help");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          content += decoder.decode(value);
          setGetStartedContent(content);
        }
      }
    } catch (error) {
      console.error("Error getting started help:", error);
      setGetStartedContent("Sorry, I couldn't generate help right now. Try again or just dive in!");
    } finally {
      setIsLoadingGetStarted(false);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Priority badge color
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3: return "bg-red-500";
      case 2: return "bg-orange-500";
      case 1: return "bg-blue-500";
      default: return "bg-gray-400";
    }
  };

  // Parse markdown to HTML
  const parseMarkdown = (text: string): string => {
    return text
      // Headers
      .replace(/^#### (.+)$/gm, '<h4 class="font-semibold text-[#1E3D32] mt-3 mb-1">$1</h4>')
      .replace(/^### (.+)$/gm, '<h3 class="font-semibold text-[#1E3D32] mt-3 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="font-semibold text-lg text-[#1E3D32] mt-3 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="font-bold text-xl text-[#1E3D32] mt-3 mb-2">$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#1E3D32]">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Numbered lists
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal my-1">$2</li>')
      // Bullet points
      .replace(/^[-•] (.+)$/gm, '<li class="ml-4 list-disc my-1">$1</li>')
      // Line breaks (but not multiple consecutive ones)
      .replace(/\n\n/g, '</p><p class="my-2">')
      .replace(/\n/g, '<br/>')
      // Wrap in paragraph
      .replace(/^(.+)/, '<p class="my-2">$1</p>');
  };

  // Copy quick start content (strip markdown for plain text)
  const copyQuickStart = async () => {
    if (!getStartedContent) return;
    try {
      // Strip markdown formatting for clean plain text
      const plainText = getStartedContent
        .replace(/^#{1,4}\s+/gm, '')  // Remove headers (# ## ### ####)
        .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // Remove bold+italic
        .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold
        .replace(/\*(.+?)\*/g, '$1')  // Remove italic
        .replace(/^[-•]\s+/gm, '• ')  // Normalize bullet points
        .replace(/^\d+\.\s+/gm, (match) => match)  // Keep numbered lists
        .trim();

      await navigator.clipboard.writeText(plainText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Regenerate quick start
  const regenerateQuickStart = () => {
    setGetStartedContent(null);
    getStartedHelp();
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "min-h-[calc(100vh-4rem)] bg-[#FAF8F5] transition-all duration-300",
        isFullscreen && "fixed inset-0 z-50 min-h-screen",
        isChatOpen && !isFullscreen && "mr-[420px]"
      )}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#E8DCC4] px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-serif font-semibold text-[#1E3D32]">Focus</h1>
            
            {/* Mode Selector + Session Timer Group */}
            <div className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-lg transition-colors",
              isFocusing ? modeConfig.bgColor : ""
            )}>
              <Select value={mode} onValueChange={(v: FocusMode) => setMode(v)}>
                <SelectTrigger className="w-32 bg-white border-[#E8DCC4] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MODE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", config.color)} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Session Timer - right next to mode when focusing */}
              {isFocusing && (
                <>
                  <div className="flex items-center gap-1.5 px-3 h-9 bg-white rounded-md border border-[#E8DCC4]">
                    <Timer className="w-3.5 h-3.5 text-[#5C7A6B]" />
                    <span className="font-mono text-sm font-medium text-[#1E3D32]">{formatTime(focusTime)}</span>
                  </div>
                  <Button
                    onClick={endFocus}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-[#8B9A8F] hover:text-red-600 hover:bg-red-50"
                  >
                    End
                  </Button>

                  {/* Task Timer - immediately right of session timer */}
                  {activeTimerTask && (
                    <div className="flex items-center gap-1.5 px-3 h-9 bg-white rounded-md border border-[#E8DCC4] ml-2">
                      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", getPriorityColor(activeTimerTask.priority))} />
                      <span className="text-sm text-[#1E3D32] max-w-48 truncate">
                        {activeTimerTask.title}
                      </span>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#F5F0E6] rounded flex-shrink-0">
                        <Clock className="w-3 h-3 text-[#5C7A6B]" />
                        <span className="font-mono text-sm text-[#1E3D32]">{formatTime(taskTime)}</span>
                      </div>
                      <div className="flex items-center flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleTaskTimer}
                          className="h-6 w-6 p-0 text-[#8B9A8F] hover:text-[#1E3D32]"
                          title={isTaskTimerRunning ? "Pause" : "Resume"}
                        >
                          {isTaskTimerRunning ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={abandonTask}
                          className="h-6 w-6 p-0 text-[#8B9A8F] hover:text-red-500"
                          title="Abandon task"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={completeTask}
                          className="h-6 w-6 p-0 text-[#5C7A6B] hover:text-green-600 hover:bg-green-50"
                          title="Complete task"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {!isFocusing && (
              <span className="text-sm text-[#8B9A8F]">{modeConfig.description}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Analytics Toggle */}
            <Popover open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9",
                    isAnalyticsOpen ? "text-[#2D5A47] bg-[#F5F0E6]" : "text-[#8B9A8F]"
                  )}
                  title="Focus Analytics"
                >
                  <BarChart3 className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end">
                <FocusAnalyticsWidget />
              </PopoverContent>
            </Popover>
            
            {/* Focus Cues Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFocusCuesEnabled(!focusCuesEnabled)}
              className={cn(
                "h-9",
                focusCuesEnabled ? "text-[#2D5A47]" : "text-[#8B9A8F]"
              )}
              title={focusCuesEnabled ? "Focus cues ON (coming soon)" : "Focus cues OFF"}
            >
              {focusCuesEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </Button>
            
            {/* Fullscreen Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-9"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-7rem)]">
        {/* Task & Calendar Drawer */}
        <div 
          className={cn(
            "border-r border-[#E8DCC4] bg-white transition-all duration-300 flex flex-col",
            isTaskDrawerOpen ? "w-80" : "w-12"
          )}
        >
          {isTaskDrawerOpen ? (
            <>
              <div className="p-3 border-b border-[#E8DCC4] flex items-center justify-between">
                <h2 className="font-medium text-[#1E3D32] text-sm">Tasks & Calendar</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTaskDrawerOpen(false)}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <FocusCalendarWidget onMeetingNoteCreated={setInitialNoteId} />
                <FocusTaskList
                  onSelectTask={handleSelectTask}
                  onStartTimer={startTaskTimer}
                  selectedTaskId={selectedTask?.id}
                  isFocusing={isFocusing}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTaskDrawerOpen(true)}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Main Focus Area */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {!isFocusing ? (
            // Not focusing - show welcome state
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", modeConfig.color)}>
                <span className="text-white">{modeConfig.icon}</span>
              </div>
              <h2 className="text-2xl font-serif font-semibold text-[#1E3D32] mb-2">
                Ready for {modeConfig.label} Mode
              </h2>
              <p className="text-[#8B9A8F] mb-6 max-w-md">
                {modeConfig.description}. Select a task from the drawer or start focusing to begin.
              </p>
              <Button 
                onClick={startFocus}
                size="lg"
                className="bg-[#2D5A47] hover:bg-[#1E3D32] text-white"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Focus Session
              </Button>
            </div>
          ) : (
            // Focusing - show active focus UI
            <div className="flex-1 flex flex-col">
              {/* Quick Start Card - Redesigned for dopamine/gamification */}
              {(selectedTask || activeTimerTask) && (
                <div
                  className={cn(
                    "mb-4 rounded-xl border-2 transition-all duration-200 overflow-hidden",
                    !getStartedContent && !isLoadingGetStarted
                      ? "border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50"
                      : "border-[#E8DCC4] bg-white"
                  )}
                >
                  {/* Header - always visible */}
                  <div
                    onClick={!getStartedContent && !isLoadingGetStarted ? getStartedHelp : undefined}
                    className={cn(
                      "p-4 flex items-center justify-between",
                      !getStartedContent && !isLoadingGetStarted && "cursor-pointer hover:bg-amber-100/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shadow-sm",
                        getStartedContent ? "bg-[#5C7A6B]" : "bg-amber-400"
                      )}>
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-[#1E3D32]">
                          {getStartedContent
                            ? "Quick Start Guide"
                            : `Get a Quick Start on "${(activeTimerTask || selectedTask)?.title}"`
                          }
                        </p>
                        {!getStartedContent && !isLoadingGetStarted && (
                          <p className="text-xs text-[#8B9A8F]">Click for AI-powered task guidance</p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons - only show when content exists */}
                    {getStartedContent && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); copyQuickStart(); }}
                          className="h-8 w-8 p-0 text-[#8B9A8F] hover:text-[#1E3D32]"
                          title="Copy to clipboard"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); regenerateQuickStart(); }}
                          className="h-8 w-8 p-0 text-[#8B9A8F] hover:text-[#1E3D32]"
                          title="Regenerate"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setIsQuickStartExpanded(!isQuickStartExpanded); }}
                          className="h-8 w-8 p-0 text-[#8B9A8F] hover:text-[#1E3D32]"
                          title={isQuickStartExpanded ? "Collapse" : "Expand"}
                        >
                          {isQuickStartExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Content - collapsible */}
                  {isLoadingGetStarted && (
                    <div className="px-4 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                          <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                        </div>
                        <span className="text-sm text-[#5C7A6B]">Generating your game plan...</span>
                      </div>
                    </div>
                  )}

                  {getStartedContent && isQuickStartExpanded && (
                    <div className="px-4 pb-4 border-t border-[#E8DCC4]/50">
                      <div
                        className="prose prose-sm prose-stone max-w-none pt-3 text-[#3D4F47] [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_strong]:text-[#1E3D32] [&_li]:my-1"
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(getStartedContent) }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* No task selected prompt */}
              {!selectedTask && !activeTimerTask && (
                <Card className="mb-4 border-[#E8DCC4]">
                  <CardContent className="py-4">
                    <p className="text-sm text-[#8B9A8F] text-center">
                      Select a task from the drawer to get started, or create a note below.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Note Editor Section */}
              <FocusNoteEditor
                initialNoteId={initialNoteId}
                onNoteCreated={(noteId) => setInitialNoteId(noteId)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Focus Cue Popup - ADHD-friendly gentle nudges */}
      <FocusCuePopup
        cue={currentCue}
        onDismiss={dismissCue}
        onSnooze={snoozeCue}
        onAction={handleCueAction}
      />
    </div>
  );
}
