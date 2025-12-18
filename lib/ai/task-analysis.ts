/**
 * Task Analysis Module
 * 
 * Provides AI-powered task time estimation and prioritization
 * with ADHD-informed defaults and learning from user patterns.
 * 
 * HYBRID APPROACH:
 * 1. User provides estimate in task content: [u.e 30m] or [u.e 2h]
 * 2. System tracks actual time from focus sessions
 * 3. Pattern analyzer calculates personal overrun factor
 * 4. Adjusted estimate = user_estimate × personal_factor
 */

import { createClient } from "@/lib/supabase/server";

// ============================================
// TYPES
// ============================================

export interface Task {
  id: string;
  title: string;
  content?: string | null;
  priority: number; // TickTick: 0=none, 1=low, 3=medium, 5=high
  dueDate: string | null;
  projectId?: string;
  tags?: string[];
  items?: { title: string; status: number }[]; // Subtasks
}

export interface TaskAnalysis {
  taskId: string;
  timeEstimate: {
    userEstimate: number | null;      // Parsed from [u.e Xm/Xh]
    adjustedEstimate: number;          // After applying personal factor
    aiEstimate: number;                // Fallback if no user estimate
    displayMinutes: number;            // What to show (adjusted or AI)
    adjustmentFactor: number | null;   // e.g., 1.35 means +35%
    confidence: "none" | "low" | "medium" | "high";
    source: "user_adjusted" | "user_raw" | "ai_guess";
    explanation: string;
    factors: string[];
  };
  prioritization: {
    suggestedOrder: number;
    suggestedTimeOfDay: "morning" | "afternoon" | "evening" | "anytime";
    explanation: string;
    factors: string[];
  };
  dataState: "no_data" | "emerging" | "established";
}

export interface UserTaskPatterns {
  completedTaskCount: number;
  tasksWithTimeData: number;           // Tasks that have both estimate + actual
  averageOverrunFactor: number;        // Calculated from actual/estimate ratios
  overrunFactorConfidence: "none" | "low" | "medium" | "high";
  averageCompletionTimeByComplexity: Record<string, number>;
  preferredWorkTimes: {
    morning: number;
    afternoon: number;
    evening: number;
  };
  energyPatterns: {
    currentLevel: number;
    trend: "rising" | "stable" | "falling";
  } | null;
}

// ============================================
// CONSTANTS
// ============================================

const BASE_TIME_ESTIMATES = {
  trivial: 5,
  simple: 15,
  moderate: 45,
  complex: 90,
  major: 180,
} as const;

const DEFAULT_ADHD_MULTIPLIER = 1.5;

const TIME_OF_DAY_FACTORS = {
  morning: 1.2,
  afternoon: 1.0,
  evening: 1.1,
} as const;

const COMPLEXITY_SIGNALS = {
  trivial: [/reply/i, /respond/i, /file/i, /save/i, /bookmark/i, /quick/i, /simple/i, /just/i, /only/i],
  simple: [/schedule/i, /book/i, /send/i, /review/i, /check/i, /update/i, /confirm/i, /share/i],
  moderate: [/write/i, /draft/i, /prepare/i, /create/i, /design/i, /plan/i, /organize/i, /summarize/i, /analyze/i],
  complex: [/research/i, /develop/i, /build/i, /implement/i, /strategy/i, /proposal/i, /present/i, /report/i],
  major: [/project/i, /launch/i, /migrate/i, /overhaul/i, /comprehensive/i, /complete/i, /full/i],
} as const;

// ============================================
// USER ESTIMATE PARSER
// ============================================

/**
 * Parse user estimate from task content
 * Supports: [u.e 30m], [u.e 30min], [u.e 2h], [u.e 2hr], [u.e 1.5h], [u.e 1h30m]
 */
export function parseUserEstimate(content: string | null | undefined): number | null {
  if (!content) return null;
  
  // Match patterns like [u.e 30m], [u.e 2h], [u.e 1h30m], [u.e 1.5h]
  const patterns = [
    // [u.e 1h30m] or [u.e 1h 30m]
    /\[u\.e\s*(\d+)\s*h\s*(\d+)\s*m(?:in)?\s*\]/i,
    // [u.e 1.5h] or [u.e 1.5hr]
    /\[u\.e\s*(\d+(?:\.\d+)?)\s*h(?:r|rs|our|ours)?\s*\]/i,
    // [u.e 30m] or [u.e 30min]
    /\[u\.e\s*(\d+)\s*m(?:in|ins|inute|inutes)?\s*\]/i,
  ];
  
  // Try hours + minutes pattern first
  const hoursMinMatch = content.match(patterns[0]);
  if (hoursMinMatch) {
    const hours = parseInt(hoursMinMatch[1], 10);
    const minutes = parseInt(hoursMinMatch[2], 10);
    return hours * 60 + minutes;
  }
  
  // Try hours pattern (including decimals)
  const hoursMatch = content.match(patterns[1]);
  if (hoursMatch) {
    const hours = parseFloat(hoursMatch[1]);
    return Math.round(hours * 60);
  }
  
  // Try minutes pattern
  const minutesMatch = content.match(patterns[2]);
  if (minutesMatch) {
    return parseInt(minutesMatch[1], 10);
  }
  
  return null;
}

// ============================================
// CORE FUNCTIONS
// ============================================

function inferComplexity(task: Task): keyof typeof BASE_TIME_ESTIMATES {
  const text = `${task.title} ${task.content || ""}`.toLowerCase();
  
  const subtaskCount = task.items?.length || 0;
  if (subtaskCount >= 5) return "major";
  if (subtaskCount >= 3) return "complex";
  
  for (const [complexity, patterns] of Object.entries(COMPLEXITY_SIGNALS).reverse()) {
    if (patterns.some(pattern => pattern.test(text))) {
      return complexity as keyof typeof BASE_TIME_ESTIMATES;
    }
  }
  
  if (task.priority >= 5) return "moderate";
  if (task.priority >= 3) return "simple";
  return "simple";
}

/**
 * Get user's historical task patterns including time tracking data
 */
export async function getUserTaskPatterns(userId: string): Promise<UserTaskPatterns> {
  const supabase = await createClient();
  
  // Get completed tasks
  const { data: completedTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("completed", true)
    .order("completed_at", { ascending: false })
    .limit(100);
  
  // Get time blocks with task associations for actual time data
  const { data: timeBlocks } = await supabase
    .from("time_blocks")
    .select("task_id, planned_minutes, started_at, ended_at")
    .eq("user_id", userId)
    .eq("completed", true)
    .not("task_id", "is", null)
    .not("ended_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);
  
  // Get health metrics for energy
  const { data: healthMetrics } = await supabase
    .from("health_metrics")
    .select("recovery_score, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(7);
  
  // Get journal entries for energy
  const { data: journalEntries } = await supabase
    .from("journal_entries")
    .select("energy_rating, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(7);
  
  const completedCount = completedTasks?.length || 0;
  
  // Calculate overrun factor from time blocks
  let averageOverrunFactor = DEFAULT_ADHD_MULTIPLIER;
  let tasksWithTimeData = 0;
  let overrunFactorConfidence: "none" | "low" | "medium" | "high" = "none";
  
  if (timeBlocks && timeBlocks.length > 0) {
    const ratios: number[] = [];
    
    for (const block of timeBlocks) {
      if (block.planned_minutes && block.started_at && block.ended_at) {
        const actualMinutes = (new Date(block.ended_at).getTime() - new Date(block.started_at).getTime()) / (1000 * 60);
        if (actualMinutes > 0 && block.planned_minutes > 0) {
          ratios.push(actualMinutes / block.planned_minutes);
        }
      }
    }
    
    tasksWithTimeData = ratios.length;
    
    if (ratios.length >= 5) {
      // Remove outliers (> 3x or < 0.3x)
      const filteredRatios = ratios.filter(r => r >= 0.3 && r <= 3.0);
      if (filteredRatios.length > 0) {
        averageOverrunFactor = filteredRatios.reduce((a, b) => a + b, 0) / filteredRatios.length;
        
        // Set confidence based on sample size
        if (filteredRatios.length >= 20) overrunFactorConfidence = "high";
        else if (filteredRatios.length >= 10) overrunFactorConfidence = "medium";
        else overrunFactorConfidence = "low";
      }
    }
  }
  
  // Calculate energy
  let energyLevel: number | null = null;
  let energyTrend: "rising" | "stable" | "falling" = "stable";
  
  if (healthMetrics?.length || journalEntries?.length) {
    const whoopAvg = healthMetrics?.length 
      ? healthMetrics.reduce((sum, m) => sum + (m.recovery_score || 0), 0) / healthMetrics.length / 10
      : null;
    const journalAvg = journalEntries?.length
      ? journalEntries.reduce((sum, e) => sum + (e.energy_rating || 5), 0) / journalEntries.length
      : null;
    
    if (whoopAvg && journalAvg) {
      energyLevel = (whoopAvg * 0.6) + (journalAvg * 0.4);
    } else if (whoopAvg) {
      energyLevel = whoopAvg;
    } else if (journalAvg) {
      energyLevel = journalAvg;
    }
    
    if (healthMetrics && healthMetrics.length >= 4) {
      const recentHalf = healthMetrics.slice(0, Math.floor(healthMetrics.length / 2));
      const olderHalf = healthMetrics.slice(Math.floor(healthMetrics.length / 2));
      const recentAvg = recentHalf.reduce((s, m) => s + (m.recovery_score || 0), 0) / recentHalf.length;
      const olderAvg = olderHalf.reduce((s, m) => s + (m.recovery_score || 0), 0) / olderHalf.length;
      
      if (recentAvg > olderAvg + 5) energyTrend = "rising";
      else if (recentAvg < olderAvg - 5) energyTrend = "falling";
    }
  }
  
  return {
    completedTaskCount: completedCount,
    tasksWithTimeData,
    averageOverrunFactor,
    overrunFactorConfidence,
    averageCompletionTimeByComplexity: {},
    preferredWorkTimes: { morning: 0.7, afternoon: 1.0, evening: 0.8 },
    energyPatterns: energyLevel ? { currentLevel: energyLevel, trend: energyTrend } : null,
  };
}

function getDataState(patterns: UserTaskPatterns): "no_data" | "emerging" | "established" {
  if (patterns.tasksWithTimeData < 5) return "no_data";
  if (patterns.tasksWithTimeData < 20) return "emerging";
  return "established";
}

/**
 * Calculate time estimate with hybrid approach
 */
export function estimateTaskTime(
  task: Task,
  patterns: UserTaskPatterns,
  currentHour: number = new Date().getHours()
): TaskAnalysis["timeEstimate"] {
  const userEstimate = parseUserEstimate(task.content);
  const complexity = inferComplexity(task);
  const baseMinutes = BASE_TIME_ESTIMATES[complexity];
  const dataState = getDataState(patterns);
  
  // Time of day
  let timeOfDay: "morning" | "afternoon" | "evening";
  if (currentHour < 12) timeOfDay = "morning";
  else if (currentHour < 17) timeOfDay = "afternoon";
  else timeOfDay = "evening";
  
  const timeOfDayMultiplier = TIME_OF_DAY_FACTORS[timeOfDay];
  
  // Energy multiplier
  let energyMultiplier = 1.0;
  if (patterns.energyPatterns) {
    const energy = patterns.energyPatterns.currentLevel;
    if (energy < 4) energyMultiplier = 1.3;
    else if (energy < 6) energyMultiplier = 1.1;
    else if (energy > 8) energyMultiplier = 0.9;
  }
  
  // Calculate AI estimate (fallback)
  const aiEstimate = Math.round(baseMinutes * DEFAULT_ADHD_MULTIPLIER * timeOfDayMultiplier * energyMultiplier);
  
  const factors: string[] = [];
  let displayMinutes: number;
  let adjustedEstimate: number;
  let adjustmentFactor: number | null = null;
  let confidence: "none" | "low" | "medium" | "high";
  let source: "user_adjusted" | "user_raw" | "ai_guess";
  let explanation: string;
  
  if (userEstimate) {
    // User provided an estimate
    factors.push(`Your estimate: ${formatDuration(userEstimate)}`);
    
    if (dataState === "no_data") {
      // No historical data yet - show raw user estimate
      displayMinutes = userEstimate;
      adjustedEstimate = userEstimate;
      confidence = "low";
      source = "user_raw";
      explanation = "Showing your estimate. Complete more tasks to build your personal adjustment factor.";
    } else {
      // Apply personal adjustment factor
      adjustmentFactor = patterns.averageOverrunFactor;
      adjustedEstimate = Math.round(userEstimate * adjustmentFactor);
      displayMinutes = adjustedEstimate;
      
      const adjustmentPercent = Math.round((adjustmentFactor - 1) * 100);
      const direction = adjustmentPercent >= 0 ? "+" : "";
      
      factors.push(`Personal factor: ${direction}${adjustmentPercent}% (based on ${patterns.tasksWithTimeData} tasks)`);
      
      if (timeOfDayMultiplier !== 1.0) {
        factors.push(`${timeOfDay}: ×${timeOfDayMultiplier}`);
      }
      if (energyMultiplier !== 1.0) {
        factors.push(`Energy: ×${energyMultiplier.toFixed(1)}`);
      }
      
      confidence = patterns.overrunFactorConfidence;
      source = "user_adjusted";
      
      if (dataState === "emerging") {
        explanation = `Adjusted ${direction}${adjustmentPercent}% based on ${patterns.tasksWithTimeData} completed tasks.`;
      } else {
        explanation = `You typically take ${direction}${adjustmentPercent}% vs your estimates.`;
      }
    }
  } else {
    // No user estimate - use AI guess
    displayMinutes = aiEstimate;
    adjustedEstimate = aiEstimate;
    confidence = "none";
    source = "ai_guess";
    explanation = "Add [u.e Xm] to task details for personalized estimates.";
    
    factors.push(`AI guess: ${complexity} task (${baseMinutes}min base)`);
    factors.push(`ADHD buffer: ×${DEFAULT_ADHD_MULTIPLIER}`);
    if (timeOfDayMultiplier !== 1.0) {
      factors.push(`${timeOfDay}: ×${timeOfDayMultiplier}`);
    }
  }
  
  return {
    userEstimate,
    adjustedEstimate,
    aiEstimate,
    displayMinutes,
    adjustmentFactor,
    confidence,
    source,
    explanation,
    factors,
  };
}

/**
 * Suggest prioritization for a task
 */
export function suggestPrioritization(
  task: Task,
  allTasks: Task[],
  patterns: UserTaskPatterns,
  currentHour: number = new Date().getHours()
): TaskAnalysis["prioritization"] {
  const factors: string[] = [];
  let score = 50;
  
  // Due date urgency
  if (task.dueDate) {
    const hoursUntilDue = (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilDue < 0) {
      score += 40;
      factors.push("⚠️ Overdue");
    } else if (hoursUntilDue < 4) {
      score += 30;
      factors.push("Due very soon");
    } else if (hoursUntilDue < 24) {
      score += 20;
      factors.push("Due today");
    }
  }
  
  // Priority
  if (task.priority >= 5) {
    score += 15;
    factors.push("High priority");
  } else if (task.priority >= 3) {
    score += 10;
    factors.push("Medium priority");
  }
  
  // Complexity vs energy
  const complexity = inferComplexity(task);
  const energy = patterns.energyPatterns?.currentLevel || 5;
  
  if (complexity === "complex" || complexity === "major") {
    if (energy >= 7) {
      score += 10;
      factors.push("Complex task + high energy = good match");
    } else if (energy <= 4) {
      score -= 15;
      factors.push("Complex task + low energy = consider deferring");
    }
  } else if (complexity === "trivial" || complexity === "simple") {
    if (energy <= 4) {
      score += 5;
      factors.push("Simple task for low energy");
    }
  }
  
  // Time of day fit
  let suggestedTimeOfDay: "morning" | "afternoon" | "evening" | "anytime" = "anytime";
  
  if (complexity === "complex" || complexity === "major") {
    suggestedTimeOfDay = "afternoon";
    if (currentHour >= 13 && currentHour <= 16) {
      score += 5;
      factors.push("Prime time for deep work");
    }
  } else if (complexity === "trivial") {
    suggestedTimeOfDay = "morning";
    if (currentHour < 10 || currentHour > 17) {
      score += 3;
      factors.push("Good time for quick wins");
    }
  }
  
  // Calculate order
  const taskScores = allTasks.map(t => ({
    id: t.id,
    score: t.id === task.id ? score : calculateQuickScore(t),
  }));
  taskScores.sort((a, b) => b.score - a.score);
  const suggestedOrder = taskScores.findIndex(t => t.id === task.id) + 1;
  
  const dataState = getDataState(patterns);
  let explanation: string;
  
  switch (dataState) {
    case "no_data":
      explanation = "Suggested order based on due date and priority.";
      break;
    case "emerging":
      explanation = "Learning your patterns... Order based on energy + urgency.";
      break;
    case "established":
      explanation = "Optimized for your work patterns and current energy.";
      break;
  }
  
  return { suggestedOrder, suggestedTimeOfDay, explanation, factors };
}

function calculateQuickScore(task: Task): number {
  let score = 50;
  
  if (task.dueDate) {
    const hoursUntilDue = (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilDue < 0) score += 40;
    else if (hoursUntilDue < 24) score += 20;
  }
  
  if (task.priority >= 5) score += 15;
  else if (task.priority >= 3) score += 10;
  
  return score;
}

/**
 * Analyze multiple tasks at once
 */
export async function analyzeTasks(userId: string, tasks: Task[]): Promise<TaskAnalysis[]> {
  const patterns = await getUserTaskPatterns(userId);
  const dataState = getDataState(patterns);
  const currentHour = new Date().getHours();
  
  return tasks.map(task => ({
    taskId: task.id,
    timeEstimate: estimateTaskTime(task, patterns, currentHour),
    prioritization: suggestPrioritization(task, tasks, patterns, currentHour),
    dataState,
  }));
}

/**
 * Format minutes as human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
