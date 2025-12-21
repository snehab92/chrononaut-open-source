// ADHD-Informed Cue Templates
// Tone: Gentle coach standing next to you, not a nagging parent
// Principles: Positive framing, body doubling effect, dopamine-friendly

import { FocusCue, CueType } from "./cue-types";

type CueTemplate = Omit<FocusCue, "id" | "contextData">;

// Session milestone cues - celebrate progress!
const SESSION_MILESTONES: Record<number, CueTemplate> = {
  // 15 minutes
  900: {
    type: "session_milestone",
    title: "Warming up!",
    message: "15 minutes of focus. You've got momentum now - keep riding it!",
    emoji: "🌱",
    primaryAction: { label: "Got it!", action: "dismiss" },
    priority: "low",
  },
  // 25 minutes (Pomodoro)
  1500: {
    type: "session_milestone",
    title: "Quarter hour champion",
    message: "25 minutes deep! Your brain is in the zone. How does a quick stretch sound?",
    emoji: "✨",
    primaryAction: { label: "Keep going", action: "dismiss" },
    secondaryAction: { label: "Quick stretch", action: "take_break" },
    snoozeMinutes: 10,
    priority: "low",
  },
  // 45 minutes
  2700: {
    type: "session_milestone",
    title: "Focus superstar",
    message: "45 minutes! That's impressive sustained attention. Your brain deserves a high-five.",
    emoji: "🌟",
    primaryAction: { label: "High-five!", action: "dismiss" },
    priority: "low",
  },
  // 60 minutes
  3600: {
    type: "session_milestone",
    title: "One hour of deep work!",
    message: "A full hour of focus - you're crushing it! Consider a short break to stay sharp.",
    emoji: "🏆",
    primaryAction: { label: "Take 5", action: "take_break" },
    secondaryAction: { label: "I'm in flow", action: "dismiss" },
    snoozeMinutes: 15,
    priority: "medium",
  },
  // 90 minutes
  5400: {
    type: "session_milestone",
    title: "Deep work master",
    message: "90 minutes! You've hit the deep work sweet spot. Time for a proper break?",
    emoji: "🎯",
    primaryAction: { label: "Break time", action: "take_break" },
    secondaryAction: { label: "5 more min", action: "snooze" },
    snoozeMinutes: 5,
    priority: "high",
  },
};

// Break reminder templates
const BREAK_REMINDERS: CueTemplate[] = [
  {
    type: "break_reminder",
    title: "Gentle nudge",
    message: "You've been at this a while. A quick walk or stretch can actually boost your focus when you return.",
    emoji: "🚶",
    primaryAction: { label: "Take a break", action: "take_break" },
    secondaryAction: { label: "Remind me later", action: "snooze" },
    snoozeMinutes: 15,
    priority: "medium",
  },
  {
    type: "break_reminder",
    title: "Body check-in",
    message: "How's your body feeling? Shoulders tense? Eyes tired? Even 2 minutes away from the screen helps.",
    emoji: "💆",
    primaryAction: { label: "Quick stretch", action: "take_break" },
    secondaryAction: { label: "I'm okay", action: "dismiss" },
    snoozeMinutes: 10,
    priority: "medium",
  },
  {
    type: "break_reminder",
    title: "Hydration check",
    message: "When did you last drink water? Grab a glass - your brain runs better hydrated!",
    emoji: "💧",
    primaryAction: { label: "Getting water", action: "take_break" },
    secondaryAction: { label: "Already did", action: "dismiss" },
    priority: "low",
  },
];

// Tab return cues - welcome back warmly, no shame
const TAB_RETURN_CUES: CueTemplate[] = [
  {
    type: "tab_return",
    title: "Welcome back!",
    message: "Hey, you're back! No judgment - happens to everyone. Ready to pick up where you left off?",
    emoji: "👋",
    primaryAction: { label: "Let's go", action: "dismiss" },
    priority: "low",
  },
  {
    type: "tab_return",
    title: "Good catch",
    message: "Nice job catching yourself! That awareness is a skill. What's one small thing you can do right now?",
    emoji: "🎯",
    primaryAction: { label: "On it", action: "dismiss" },
    priority: "low",
  },
  {
    type: "tab_return",
    title: "Back in the game",
    message: "Distractions happen. What matters is you came back. The task is still here waiting for you!",
    emoji: "💪",
    primaryAction: { label: "Continuing", action: "dismiss" },
    priority: "low",
  },
];

// Task progress check-ins
const TASK_PROGRESS_CUES: CueTemplate[] = [
  {
    type: "task_progress",
    title: "Quick check-in",
    message: "How's the task going? Are you making progress, or feeling stuck somewhere?",
    emoji: "🤔",
    primaryAction: { label: "Making progress", action: "dismiss" },
    secondaryAction: { label: "Kinda stuck", action: "snooze" },
    snoozeMinutes: 10,
    priority: "low",
  },
  {
    type: "task_progress",
    title: "Progress pulse",
    message: "You've been on this task a while. Celebrate any small wins so far?",
    emoji: "📊",
    primaryAction: { label: "Yes, progressing!", action: "dismiss" },
    secondaryAction: { label: "Need a reset", action: "switch_task" },
    priority: "low",
  },
];

// Encouragement cues - random dopamine hits
const ENCOURAGEMENT_CUES: CueTemplate[] = [
  {
    type: "encouragement",
    title: "You're doing great",
    message: "Just wanted to say: you showed up and you're doing the work. That's what counts.",
    emoji: "🌈",
    primaryAction: { label: "Thanks!", action: "dismiss" },
    priority: "low",
  },
  {
    type: "encouragement",
    title: "Keep going",
    message: "Every minute of focus is building your concentration muscle. You're training your brain right now!",
    emoji: "🧠",
    primaryAction: { label: "Let's go!", action: "dismiss" },
    priority: "low",
  },
  {
    type: "encouragement",
    title: "Proud of you",
    message: "ADHD brain + focused work = harder than people think. You're doing something genuinely difficult.",
    emoji: "💜",
    primaryAction: { label: "Thanks friend", action: "dismiss" },
    priority: "low",
  },
  {
    type: "encouragement",
    title: "Small wins matter",
    message: "Remember: done is better than perfect. What's one thing you can finish in the next 10 minutes?",
    emoji: "✅",
    primaryAction: { label: "I've got this", action: "dismiss" },
    priority: "low",
  },
];

// Getting started help (task initiation)
const GETTING_STARTED_CUES: CueTemplate[] = [
  {
    type: "getting_started",
    title: "Stuck on start?",
    message: "Task initiation is hard! Try this: what's the absolute smallest first step? Just do that one thing.",
    emoji: "🚀",
    primaryAction: { label: "Found it!", action: "dismiss" },
    secondaryAction: { label: "Still stuck", action: "snooze" },
    snoozeMinutes: 5,
    priority: "medium",
  },
  {
    type: "getting_started",
    title: "2-minute trick",
    message: "Can you commit to just 2 minutes on this? Often starting is the hardest part - momentum follows.",
    emoji: "⏱️",
    primaryAction: { label: "2 min, go!", action: "dismiss" },
    priority: "medium",
  },
];

// Completion nudges
const COMPLETION_NUDGES: CueTemplate[] = [
  {
    type: "completion_nudge",
    title: "Almost there?",
    message: "You've been on this task a good while. Is it close to done, or is scope creeping?",
    emoji: "🏁",
    primaryAction: { label: "Wrapping up", action: "dismiss" },
    secondaryAction: { label: "It's growing", action: "snooze" },
    snoozeMinutes: 15,
    priority: "medium",
  },
  {
    type: "completion_nudge",
    title: "Good enough?",
    message: "Perfectionism check: is this task 'good enough' to move on? Perfect is the enemy of done.",
    emoji: "🎯",
    primaryAction: { label: "Ship it!", action: "complete_task" },
    secondaryAction: { label: "Needs more", action: "dismiss" },
    priority: "medium",
  },
];

// Energy check-ins (time-of-day aware)
const ENERGY_CHECKS: Record<"morning" | "afternoon" | "evening", CueTemplate[]> = {
  morning: [
    {
      type: "energy_check",
      title: "Morning energy",
      message: "Morning is often peak cognitive time. Are you using it for your hardest task?",
      emoji: "☀️",
      primaryAction: { label: "Yep!", action: "dismiss" },
      secondaryAction: { label: "Good point", action: "switch_task" },
      priority: "low",
    },
  ],
  afternoon: [
    {
      type: "energy_check",
      title: "Afternoon dip",
      message: "Feeling the post-lunch slump? A short walk or some cold water can help reset.",
      emoji: "🌤️",
      primaryAction: { label: "I'm good", action: "dismiss" },
      secondaryAction: { label: "Need a reset", action: "take_break" },
      priority: "low",
    },
  ],
  evening: [
    {
      type: "energy_check",
      title: "Evening wind-down",
      message: "Working late? Make sure you're not burning tomorrow's fuel. What's essential to finish tonight?",
      emoji: "🌙",
      primaryAction: { label: "Almost done", action: "dismiss" },
      secondaryAction: { label: "Time to stop", action: "take_break" },
      priority: "medium",
    },
  ],
};

// Helper to get random item from array
function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Get time of day
function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

// Export functions to get cue templates
export function getSessionMilestoneCue(focusSeconds: number): CueTemplate | null {
  // Find the closest milestone we've passed
  const milestones = Object.keys(SESSION_MILESTONES)
    .map(Number)
    .sort((a, b) => b - a);

  for (const milestone of milestones) {
    if (focusSeconds >= milestone && focusSeconds < milestone + 60) {
      return SESSION_MILESTONES[milestone];
    }
  }
  return null;
}

export function getBreakReminderCue(): CueTemplate {
  return getRandomItem(BREAK_REMINDERS);
}

export function getTabReturnCue(): CueTemplate {
  return getRandomItem(TAB_RETURN_CUES);
}

export function getTaskProgressCue(): CueTemplate {
  return getRandomItem(TASK_PROGRESS_CUES);
}

export function getEncouragementCue(): CueTemplate {
  return getRandomItem(ENCOURAGEMENT_CUES);
}

export function getGettingStartedCue(): CueTemplate {
  return getRandomItem(GETTING_STARTED_CUES);
}

export function getCompletionNudgeCue(): CueTemplate {
  return getRandomItem(COMPLETION_NUDGES);
}

export function getEnergyCheckCue(): CueTemplate {
  const timeOfDay = getTimeOfDay();
  return getRandomItem(ENERGY_CHECKS[timeOfDay]);
}
