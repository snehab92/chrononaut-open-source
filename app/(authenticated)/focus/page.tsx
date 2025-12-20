"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Timer, Play, Pause, Square, ChevronRight, ChevronLeft, 
  Zap, FileText, Users, Mic, Briefcase, Maximize2, Minimize2,
  CheckCircle2, Clock, Sparkles, Bell, BellOff,
  ChevronDown, ChevronUp, Brain, BarChart3, X
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

type FocusMode = "admin" | "research" | "writing" | "meeting-prep" | "toastmasters";

const MODE_CONFIG: Record<FocusMode, {
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  agentType: string;
}> = {
  admin: {
    label: "Admin",
    icon: <Briefcase className="w-4 h-4" />,
    color: "bg-blue-500",
    description: "Quick tasks, emails, scheduling",
    agentType: "research-assistant"
  },
  research: {
    label: "Research",
    icon: <FileText className="w-4 h-4" />,
    color: "bg-purple-500",
    description: "Web search, summarization, deep dives",
    agentType: "research-assistant"
  },
  writing: {
    label: "Writing",
    icon: <Zap className="w-4 h-4" />,
    color: "bg-amber-500",
    description: "Documents, drafts, creative work",
    agentType: "executive-coach"
  },
  "meeting-prep": {
    label: "Meeting Prep",
    icon: <Users className="w-4 h-4" />,
    color: "bg-green-500",
    description: "Context briefing, risk assessment",
    agentType: "executive-coach"
  },
  toastmasters: {
    label: "Toastmasters",
    icon: <Mic className="w-4 h-4" />,
    color: "bg-pink-500",
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
  taskId?: string;
  taskTitle?: string;
  taskTimerStarted?: string;
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
  
  // Task state - separate selection from timer
  const [selectedTask, setSelectedTask] = useState<FocusTask | null>(null);
  const [activeTimerTask, setActiveTimerTask] = useState<FocusTask | null>(null);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(true);
  
  // AI state
  const [getStartedContent, setGetStartedContent] = useState<string | null>(null);
  const [isLoadingGetStarted, setIsLoadingGetStarted] = useState(false);
  const [isGetStartedExpanded, setIsGetStartedExpanded] = useState(true);
  const [focusCuesEnabled, setFocusCuesEnabled] = useState(true);
  
  // Analytics widget
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  
  // Note state - for opening notes from calendar
  const [initialNoteId, setInitialNoteId] = useState<string | undefined>(undefined);
  
  // Refs
  const focusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const taskTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionStartRef = useRef<Date | null>(null);
  const taskTimerStartRef = useRef<Date | null>(null);
  
  const supabase = createClient();
  const { isOpen: isChatOpen } = useChatDrawer();
  
  const modeConfig = MODE_CONFIG[mode];

  // Restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      try {
        const session: StoredSession = JSON.parse(stored);
        const startedAt = new Date(session.startedAt);
        const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
        
        // Restore session state
        setSessionId(session.sessionId);
        setMode(session.focusMode);
        setFocusTime(elapsed);
        setIsFocusing(true);
        sessionStartRef.current = startedAt;
        
        // Restore task timer if there was one
        if (session.taskTimerStarted) {
          const taskStarted = new Date(session.taskTimerStarted);
          const taskElapsed = Math.floor((Date.now() - taskStarted.getTime()) / 1000);
          setTaskTime(taskElapsed);
          taskTimerStartRef.current = taskStarted;
          
          if (session.taskId && session.taskTitle) {
            setActiveTimerTask({
              id: session.taskId,
              title: session.taskTitle,
              priority: 0,
              due_date: null,
              content: null,
              estimated_minutes: null,
              ticktick_id: null,
              ticktick_list_id: null,
              ticktick_list_name: null,
              ticktick_section_name: null,
            });
            setIsTaskTimerRunning(true);
          }
        }
      } catch (e) {
        console.error("Failed to restore session:", e);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  }, []);

  // Persist session to localStorage
  const persistSession = useCallback(() => {
    if (sessionId && sessionStartRef.current) {
      const session: StoredSession = {
        sessionId,
        startedAt: sessionStartRef.current.toISOString(),
        focusMode: mode,
        taskId: activeTimerTask?.id,
        taskTitle: activeTimerTask?.title,
        taskTimerStarted: taskTimerStartRef.current?.toISOString(),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }, [sessionId, mode, activeTimerTask]);

  // Save session whenever it changes
  useEffect(() => {
    if (isFocusing) {
      persistSession();
    }
  }, [isFocusing, activeTimerTask, persistSession]);

  // Focus timer - runs when focusing
  useEffect(() => {
    if (isFocusing) {
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
  }, [isFocusing]);

  // Task timer - runs when task timer is active
  useEffect(() => {
    if (isTaskTimerRunning) {
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
  }, [isTaskTimerRunning]);

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
    taskTimerStartRef.current = null;
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
    taskTimerStartRef.current = new Date();
    setGetStartedContent(null);
    
    // Update time_block with task
    if (sessionId) {
      supabase
        .from("time_blocks")
        .update({ task_id: task.id })
        .eq("id", sessionId);
    }
    
    // Persist immediately
    persistSession();
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
    taskTimerStartRef.current = null;
    setGetStartedContent(null);
    persistSession();
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
    taskTimerStartRef.current = null;
    setGetStartedContent(null);
    persistSession();
  };

  // Get AI "Get Started" content
  const getStartedHelp = async () => {
    const taskForHelp = activeTimerTask || selectedTask;
    if (!taskForHelp) return;
    
    setIsLoadingGetStarted(true);
    setIsGetStartedExpanded(true);
    
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
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-serif font-semibold text-[#1E3D32]">Focus</h1>
            
            {/* Mode Selector */}
            <Select value={mode} onValueChange={(v: FocusMode) => setMode(v)}>
              <SelectTrigger className="w-40 bg-white border-[#E8DCC4] h-9">
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
            
            {!isFocusing && (
              <span className="text-sm text-[#8B9A8F]">{modeConfig.description}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Focus Session Timer - always visible when focusing */}
            {isFocusing && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2D5A47] text-white rounded-lg">
                <Timer className="w-4 h-4" />
                <span className="font-mono text-sm font-medium">{formatTime(focusTime)}</span>
                <span className="text-xs opacity-70">session</span>
              </div>
            )}

            {/* Active Task Timer in Header - only when task timer is running */}
            {isFocusing && activeTimerTask && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F5F0E6] rounded-lg border border-[#E8DCC4]">
                <span className={cn("w-2 h-2 rounded-full", getPriorityColor(activeTimerTask.priority))} />
                <span className="text-sm text-[#1E3D32] max-w-32 truncate font-medium">
                  {activeTimerTask.title}
                </span>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-white rounded">
                  <Clock className="w-3 h-3 text-[#5C7A6B]" />
                  <span className="font-mono text-sm text-[#1E3D32]">{formatTime(taskTime)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTaskTimer}
                  className="h-7 w-7 p-0"
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
                  className="h-7 w-7 p-0 text-[#8B9A8F] hover:text-red-500"
                  title="Abandon task"
                >
                  <X className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  onClick={completeTask}
                  className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Done
                </Button>
              </div>
            )}
            
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
              title={focusCuesEnabled ? "Focus cues ON" : "Focus cues OFF"}
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
            
            {/* Start/End Focus */}
            {!isFocusing ? (
              <Button 
                onClick={startFocus}
                className="bg-[#2D5A47] hover:bg-[#1E3D32] text-white h-9"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Focus
              </Button>
            ) : (
              <Button 
                onClick={endFocus}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 h-9"
              >
                <Square className="w-4 h-4 mr-2" />
                End
              </Button>
            )}
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
                <FocusTaskList 
                  onSelectTask={handleSelectTask}
                  onStartTimer={startTaskTimer}
                  selectedTaskId={selectedTask?.id}
                  isFocusing={isFocusing}
                />
                <FocusCalendarWidget onMeetingNoteCreated={setInitialNoteId} />
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
              {/* Quick Start Section - collapsible, includes nudge text */}
              <Card className="mb-4 border-[#E8DCC4]">
                <CardHeader 
                  className="pb-2 cursor-pointer py-3"
                  onClick={() => setIsGetStartedExpanded(!isGetStartedExpanded)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#D4A84B]" />
                      <CardTitle className="text-sm">Quick Start</CardTitle>
                      {!activeTimerTask && !selectedTask && (
                        <span className="text-xs text-[#8B9A8F]">• Select a task to begin</span>
                      )}
                      {selectedTask && !activeTimerTask && (
                        <span className="text-xs text-[#5C7A6B]">• "{selectedTask.title}" selected</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {(selectedTask || activeTimerTask) && !getStartedContent && !isLoadingGetStarted && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            getStartedHelp();
                          }}
                          className="bg-[#2D5A47] hover:bg-[#1E3D32] text-white h-7 text-xs"
                        >
                          <Brain className="w-3 h-3 mr-1" />
                          AI Help
                        </Button>
                      )}
                      {selectedTask && !activeTimerTask && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            startTaskTimer(selectedTask);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Start Timer
                        </Button>
                      )}
                      {isGetStartedExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#8B9A8F]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#8B9A8F]" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                {isGetStartedExpanded && (
                  <CardContent className="pt-0">
                    {isLoadingGetStarted ? (
                      <div className="flex items-center gap-2 text-[#8B9A8F]">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-[#8B9A8F] rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-[#8B9A8F] rounded-full animate-bounce [animation-delay:0.1s]" />
                          <span className="w-2 h-2 bg-[#8B9A8F] rounded-full animate-bounce [animation-delay:0.2s]" />
                        </div>
                        <span className="text-sm">Generating your game plan...</span>
                      </div>
                    ) : getStartedContent ? (
                      <div 
                        className="prose prose-sm prose-stone max-w-none [&_p]:my-2 [&_strong]:text-[#1E3D32] [&_li]:my-1"
                        dangerouslySetInnerHTML={{ 
                          __html: getStartedContent
                            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n/g, '<br/>')
                        }}
                      />
                    ) : !selectedTask && !activeTimerTask ? (
                      <p className="text-sm text-[#8B9A8F]">
                        Select a task from the drawer to get started. Click a task to select it, then click "Start Timer" to begin tracking time.
                      </p>
                    ) : (
                      <p className="text-sm text-[#8B9A8F]">
                        Click "AI Help" for a quick brief on how to approach this task, or start your timer and dive in!
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Note Editor Section */}
              <FocusNoteEditor 
                initialNoteId={initialNoteId}
                onNoteCreated={(noteId) => setInitialNoteId(noteId)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
