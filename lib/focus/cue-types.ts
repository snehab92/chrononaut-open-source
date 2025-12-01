// Focus Cue Types and Best Practices
// Based on research: variable intervals, positive framing, body doubling, dopamine-friendly

export type CueType =
  | "session_milestone"      // Celebrate focus duration achievements
  | "break_reminder"         // Gentle break suggestions after sustained focus
  | "tab_return"             // Welcome back when returning from distraction
  | "task_progress"          // Check-in on current task
  | "energy_check"           // Time-of-day based energy awareness
  | "encouragement"          // Random positive reinforcement
  | "getting_started"        // Help overcoming task initiation
  | "completion_nudge";      // Gentle push toward finishing

export interface FocusCue {
  id: string;
  type: CueType;
  title: string;
  message: string;
  emoji: string;
  primaryAction?: {
    label: string;
    action: "dismiss" | "snooze" | "take_break" | "complete_task" | "switch_task";
  };
  secondaryAction?: {
    label: string;
    action: "dismiss" | "snooze" | "take_break" | "complete_task" | "switch_task";
  };
  snoozeMinutes?: number;
  priority: "low" | "medium" | "high";
  // For tracking effectiveness
  contextData?: Record<string, unknown>;
}

export interface SessionMetrics {
  focusTimeSeconds: number;
  taskTimeSeconds: number;
  tabSwitchCount: number;
  lastTabSwitchAt: Date | null;
  isWindowFocused: boolean;
  sessionStartedAt: Date;
  lastCueFiredAt: Date | null;
  lastCueType: CueType | null;
  cuesDismissedCount: number;
  cuesSnoozedCount: number;
  taskTitle: string | null;
  focusMode: string;
}

// Cue cooldown periods (in seconds) - balanced: not too frequent, not too sparse
export const CUE_COOLDOWNS: Record<CueType, number> = {
  session_milestone: 300,    // 5 min between milestone cues
  break_reminder: 600,       // 10 min between break reminders
  tab_return: 120,           // 2 min cooldown for tab return
  task_progress: 900,        // 15 min between task check-ins
  energy_check: 1800,        // 30 min between energy checks
  encouragement: 600,        // 10 min between encouragements
  getting_started: 300,      // 5 min for initiation help
  completion_nudge: 600,     // 10 min between completion nudges
};

// Global minimum cooldown between ANY cue (prevents overwhelm)
export const GLOBAL_CUE_COOLDOWN = 90; // 1.5 minutes minimum between cues
