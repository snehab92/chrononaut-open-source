// Focus Cue Evaluation Engine
// Variable intervals, context-aware, not annoying

import {
  FocusCue,
  CueType,
  SessionMetrics,
  CUE_COOLDOWNS,
  GLOBAL_CUE_COOLDOWN,
} from "./cue-types";
import {
  getSessionMilestoneCue,
  getBreakReminderCue,
  getTabReturnCue,
  getTaskProgressCue,
  getEncouragementCue,
  getGettingStartedCue,
  getCompletionNudgeCue,
  getEnergyCheckCue,
} from "./cue-templates";

// Track when each cue type was last fired
const lastCueFiredByType: Map<CueType, Date> = new Map();

// Check if enough time has passed since last cue of this type
function canFireCueType(type: CueType): boolean {
  const lastFired = lastCueFiredByType.get(type);
  if (!lastFired) return true;

  const cooldownSeconds = CUE_COOLDOWNS[type];
  const secondsSinceLast = (Date.now() - lastFired.getTime()) / 1000;
  return secondsSinceLast >= cooldownSeconds;
}

// Check global cooldown (prevents cue spam)
function canFireAnyCue(metrics: SessionMetrics): boolean {
  if (!metrics.lastCueFiredAt) return true;

  const secondsSinceLast =
    (Date.now() - metrics.lastCueFiredAt.getTime()) / 1000;
  return secondsSinceLast >= GLOBAL_CUE_COOLDOWN;
}

// Add some randomness to prevent predictable patterns (users habituate to patterns)
function addJitter(baseSeconds: number, jitterPercent: number = 0.2): number {
  const jitter = baseSeconds * jitterPercent;
  return baseSeconds + (Math.random() * jitter * 2 - jitter);
}

// Generate unique cue ID
function generateCueId(): string {
  return `cue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Main evaluation function - called every ~30 seconds during focus session
export function evaluateCues(metrics: SessionMetrics): FocusCue | null {
  // Global cooldown check
  if (!canFireAnyCue(metrics)) {
    return null;
  }

  // Don't fire cues if user has dismissed/snoozed many recently (they're in flow)
  if (metrics.cuesDismissedCount >= 3 && metrics.focusTimeSeconds < 3600) {
    // Back off if they've dismissed 3+ cues in under an hour
    return null;
  }

  let cue: FocusCue | null = null;

  // Priority 1: Tab return (most time-sensitive)
  cue = evaluateTabReturn(metrics);
  if (cue) return cue;

  // Priority 2: Session milestones (celebrates progress)
  cue = evaluateSessionMilestones(metrics);
  if (cue) return cue;

  // Priority 3: Break reminders (after sustained focus)
  cue = evaluateBreakReminder(metrics);
  if (cue) return cue;

  // Priority 4: Getting started help (if no task progress)
  cue = evaluateGettingStarted(metrics);
  if (cue) return cue;

  // Priority 5: Task progress check-ins
  cue = evaluateTaskProgress(metrics);
  if (cue) return cue;

  // Priority 6: Completion nudges (for long tasks)
  cue = evaluateCompletionNudge(metrics);
  if (cue) return cue;

  // Priority 7: Energy checks (time-of-day aware)
  cue = evaluateEnergyCheck(metrics);
  if (cue) return cue;

  // Priority 8: Random encouragement (dopamine boost)
  cue = evaluateEncouragement(metrics);
  if (cue) return cue;

  return null;
}

// Evaluate tab return cue
function evaluateTabReturn(metrics: SessionMetrics): FocusCue | null {
  // Only fire if:
  // 1. Window just became focused again
  // 2. They were away for at least 30 seconds
  // 3. Cooldown has passed
  if (!metrics.isWindowFocused) return null;
  if (!metrics.lastTabSwitchAt) return null;
  if (!canFireCueType("tab_return")) return null;

  const secondsAway =
    (Date.now() - metrics.lastTabSwitchAt.getTime()) / 1000;

  // Only show if they were away 30s-5min (longer = probably intentional break)
  if (secondsAway < 30 || secondsAway > 300) return null;

  const template = getTabReturnCue();
  lastCueFiredByType.set("tab_return", new Date());

  return {
    ...template,
    id: generateCueId(),
    contextData: {
      secondsAway,
      tabSwitchCount: metrics.tabSwitchCount,
    },
  };
}

// Evaluate session milestones
function evaluateSessionMilestones(metrics: SessionMetrics): FocusCue | null {
  if (!canFireCueType("session_milestone")) return null;

  const template = getSessionMilestoneCue(metrics.focusTimeSeconds);
  if (!template) return null;

  lastCueFiredByType.set("session_milestone", new Date());

  return {
    ...template,
    id: generateCueId(),
    contextData: {
      focusMinutes: Math.floor(metrics.focusTimeSeconds / 60),
    },
  };
}

// Evaluate break reminder
function evaluateBreakReminder(metrics: SessionMetrics): FocusCue | null {
  if (!canFireCueType("break_reminder")) return null;

  // Suggest breaks after 45+ minutes of continuous focus
  // Use variable timing to prevent habituation
  const breakThreshold = addJitter(45 * 60, 0.15); // 45 min +/- 15%

  if (metrics.focusTimeSeconds < breakThreshold) return null;

  // Don't suggest break if they just came back from one
  if (metrics.tabSwitchCount > 0 && metrics.lastTabSwitchAt) {
    const secondsSinceSwitch =
      (Date.now() - metrics.lastTabSwitchAt.getTime()) / 1000;
    if (secondsSinceSwitch < 600) return null; // Within 10 min of a switch
  }

  const template = getBreakReminderCue();
  lastCueFiredByType.set("break_reminder", new Date());

  return {
    ...template,
    id: generateCueId(),
    contextData: {
      focusMinutes: Math.floor(metrics.focusTimeSeconds / 60),
    },
  };
}

// Evaluate getting started help
function evaluateGettingStarted(metrics: SessionMetrics): FocusCue | null {
  if (!canFireCueType("getting_started")) return null;

  // Only show if:
  // 1. Task is selected but timer has been running < 5 min with low engagement
  // 2. OR session started but no task selected after 3 min
  const hasTask = !!metrics.taskTitle;
  const taskTimeMinutes = metrics.taskTimeSeconds / 60;
  const focusTimeMinutes = metrics.focusTimeSeconds / 60;

  // No task after 3 minutes of focus session
  if (!hasTask && focusTimeMinutes > 3 && focusTimeMinutes < 5) {
    const template = getGettingStartedCue();
    lastCueFiredByType.set("getting_started", new Date());
    return {
      ...template,
      id: generateCueId(),
      contextData: { trigger: "no_task_selected" },
    };
  }

  // Task selected but very little progress (might be stuck on initiation)
  if (hasTask && taskTimeMinutes > 2 && taskTimeMinutes < 4) {
    // This is a gentle nudge - only if they seem stuck
    const template = getGettingStartedCue();
    lastCueFiredByType.set("getting_started", new Date());
    return {
      ...template,
      id: generateCueId(),
      contextData: { trigger: "possible_initiation_block" },
    };
  }

  return null;
}

// Evaluate task progress check-in
function evaluateTaskProgress(metrics: SessionMetrics): FocusCue | null {
  if (!canFireCueType("task_progress")) return null;
  if (!metrics.taskTitle) return null;

  // Check in after 15-20 minutes on a task (variable)
  const checkInThreshold = addJitter(15 * 60, 0.2);

  if (metrics.taskTimeSeconds < checkInThreshold) return null;

  const template = getTaskProgressCue();
  lastCueFiredByType.set("task_progress", new Date());

  return {
    ...template,
    id: generateCueId(),
    contextData: {
      taskMinutes: Math.floor(metrics.taskTimeSeconds / 60),
      taskTitle: metrics.taskTitle,
    },
  };
}

// Evaluate completion nudge
function evaluateCompletionNudge(metrics: SessionMetrics): FocusCue | null {
  if (!canFireCueType("completion_nudge")) return null;
  if (!metrics.taskTitle) return null;

  // Nudge toward completion after 30+ minutes on same task
  const completionThreshold = addJitter(30 * 60, 0.15);

  if (metrics.taskTimeSeconds < completionThreshold) return null;

  const template = getCompletionNudgeCue();
  lastCueFiredByType.set("completion_nudge", new Date());

  return {
    ...template,
    id: generateCueId(),
    contextData: {
      taskMinutes: Math.floor(metrics.taskTimeSeconds / 60),
      taskTitle: metrics.taskTitle,
    },
  };
}

// Evaluate energy check-in
function evaluateEnergyCheck(metrics: SessionMetrics): FocusCue | null {
  if (!canFireCueType("energy_check")) return null;

  // Only after 20+ minutes of focus
  if (metrics.focusTimeSeconds < 20 * 60) return null;

  // Random chance (30%) to add variability
  if (Math.random() > 0.3) return null;

  const template = getEnergyCheckCue();
  lastCueFiredByType.set("energy_check", new Date());

  return {
    ...template,
    id: generateCueId(),
    contextData: {
      timeOfDay: getTimeOfDay(),
    },
  };
}

// Evaluate random encouragement
function evaluateEncouragement(metrics: SessionMetrics): FocusCue | null {
  if (!canFireCueType("encouragement")) return null;

  // Only after 10+ minutes of focus
  if (metrics.focusTimeSeconds < 10 * 60) return null;

  // Low random chance (15%) - these should feel like pleasant surprises
  if (Math.random() > 0.15) return null;

  const template = getEncouragementCue();
  lastCueFiredByType.set("encouragement", new Date());

  return {
    ...template,
    id: generateCueId(),
    contextData: {
      focusMinutes: Math.floor(metrics.focusTimeSeconds / 60),
    },
  };
}

// Helper
function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

// Reset cue tracking (call when session ends)
export function resetCueTracking(): void {
  lastCueFiredByType.clear();
}
