/**
 * Morning Insight Workflow
 *
 * Generates a personalized morning briefing based on:
 * - Overnight Whoop recovery data
 * - Today's calendar
 * - Pending tasks
 * - Recent patterns
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getComputedPatterns, setComputedPatterns } from "../context/cache";

// =============================================================================
// TYPES
// =============================================================================

export interface MorningInsight {
  summary: string;
  recommendations: string[];
  energyOptimalTasks: string[];
  focusTheme: string;
  recoveryScore?: number;
  meetingsToday: number;
  topPriorityTask?: string;
}

export interface MorningContext {
  health?: {
    recovery_score?: number;
    sleep_hours?: number;
    hrv_rmssd?: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    priority: number;
    due_date?: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    attendees?: string[];
  }>;
  recentJournals: Array<{
    entry_date: string;
    mood_label?: string;
    energy_rating?: number;
  }>;
  recentPatterns?: Record<string, unknown>;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Generate morning insight for a user
 *
 * @param userId - User ID to generate insight for
 * @returns Generated morning insight
 */
export async function generateMorningInsight(
  userId: string
): Promise<MorningInsight> {
  // Gather context
  const context = await gatherMorningContext(userId);

  // Check for cached patterns
  const cachedPatterns = await getComputedPatterns(userId, "daily_context");

  // Generate insight using AI
  const insight = await generateInsightWithAI(context, cachedPatterns?.patternData);

  // Store the insight
  await storeMorningInsight(userId, insight, context);

  return insight;
}

// =============================================================================
// CONTEXT GATHERING
// =============================================================================

async function gatherMorningContext(userId: string): Promise<MorningContext> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Fetch all data in parallel
  const [healthRes, tasksRes, eventsRes, journalsRes] = await Promise.all([
    // Today's health metrics (from Whoop)
    supabase
      .from("health_metrics")
      .select("recovery_score, sleep_hours, hrv_rmssd")
      .eq("user_id", userId)
      .eq("metric_date", today)
      .single(),

    // Pending tasks (sorted by priority)
    supabase
      .from("tasks")
      .select("id, title, priority, due_date")
      .eq("user_id", userId)
      .eq("completed", false)
      .order("priority", { ascending: false })
      .limit(15),

    // Today's calendar events
    supabase
      .from("calendar_events")
      .select("id, title, start_time, end_time, attendees")
      .eq("user_id", userId)
      .gte("start_time", new Date().toISOString())
      .lte("start_time", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      .order("start_time", { ascending: true }),

    // Recent journal entries (last 7 days)
    supabase
      .from("journal_entries")
      .select("entry_date, mood_label, energy_rating")
      .eq("user_id", userId)
      .gte("entry_date", weekAgo)
      .order("entry_date", { ascending: false }),
  ]);

  return {
    health: healthRes.data || undefined,
    tasks: tasksRes.data || [],
    events: eventsRes.data || [],
    recentJournals: journalsRes.data || [],
  };
}

// =============================================================================
// AI GENERATION
// =============================================================================

async function generateInsightWithAI(
  context: MorningContext,
  cachedPatterns?: Record<string, unknown>
): Promise<MorningInsight> {
  const recoveryScore = context.health?.recovery_score;
  const sleepHours = context.health?.sleep_hours;
  const meetingsCount = context.events.length;
  const tasksCount = context.tasks.length;
  const topTask = context.tasks[0];

  // Calculate energy level from recent journals
  const recentEnergies = context.recentJournals
    .map((j) => j.energy_rating)
    .filter((e): e is number => e !== null && e !== undefined);
  const avgEnergy =
    recentEnergies.length > 0
      ? recentEnergies.reduce((a, b) => a + b, 0) / recentEnergies.length
      : 5;

  // Recent mood trends
  const recentMoods = context.recentJournals
    .map((j) => j.mood_label)
    .filter(Boolean)
    .slice(0, 5);

  const prompt = `Generate a personalized morning briefing for someone with ADHD.

## Current Data

**Recovery & Energy**
- Whoop Recovery Score: ${recoveryScore !== undefined ? `${recoveryScore}%` : "No data"}
- Sleep: ${sleepHours !== undefined ? `${sleepHours} hours` : "No data"}
- Recent Avg Energy: ${avgEnergy.toFixed(1)}/10
- Recent Moods: ${recentMoods.join(", ") || "No data"}

**Today's Schedule**
- Meetings: ${meetingsCount}
${context.events
  .slice(0, 5)
  .map((e) => `  - ${e.title} at ${new Date(e.start_time).toLocaleTimeString()}`)
  .join("\n")}

**Pending Tasks (${tasksCount} total)**
${context.tasks
  .slice(0, 5)
  .map((t) => `  - [P${t.priority}] ${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}`)
  .join("\n")}

${cachedPatterns ? `\n**Known Patterns**\n${JSON.stringify(cachedPatterns, null, 2)}` : ""}

## Instructions

Generate a brief, warm morning insight that:
1. Acknowledges energy level without judgment
2. Suggests 2-3 specific, actionable recommendations
3. Identifies 1-2 tasks that match current energy
4. Provides a focus theme for the day

Respond in JSON format:
{
  "summary": "2-3 sentence personalized briefing addressing energy and day ahead",
  "recommendations": ["specific action 1", "specific action 2", "specific action 3"],
  "energyOptimalTasks": ["task title that matches current energy"],
  "focusTheme": "1-3 word theme for the day"
}`;

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: `You are a supportive ADHD-aware productivity coach generating a morning briefing.
Be warm but concise. Celebrate what's working. Suggest realistic adjustments based on energy.
Always respond with valid JSON.`,
      prompt,
      maxTokens: 800,
    });

    // Parse the JSON response
    const parsed = JSON.parse(text);

    return {
      summary: parsed.summary,
      recommendations: parsed.recommendations || [],
      energyOptimalTasks: parsed.energyOptimalTasks || [],
      focusTheme: parsed.focusTheme || "Focus",
      recoveryScore,
      meetingsToday: meetingsCount,
      topPriorityTask: topTask?.title,
    };
  } catch (error) {
    console.error("Error generating morning insight:", error);

    // Fallback insight if AI fails
    return generateFallbackInsight(context);
  }
}

function generateFallbackInsight(context: MorningContext): MorningInsight {
  const recovery = context.health?.recovery_score;
  const topTask = context.tasks[0];

  let summary = "Good morning! ";
  if (recovery !== undefined) {
    if (recovery >= 67) {
      summary += `Your recovery is strong at ${recovery}%. Great day for challenging work.`;
    } else if (recovery >= 34) {
      summary += `Moderate recovery at ${recovery}%. Pace yourself today.`;
    } else {
      summary += `Recovery is low at ${recovery}%. Consider lighter tasks and extra breaks.`;
    }
  } else {
    summary += "No health data yet today. Check in with how you're feeling.";
  }

  return {
    summary,
    recommendations: [
      "Start with your most important task first",
      "Take a 5-minute break every 25 minutes",
      "Stay hydrated throughout the day",
    ],
    energyOptimalTasks: topTask ? [topTask.title] : [],
    focusTheme: "Steady Progress",
    recoveryScore: recovery,
    meetingsToday: context.events.length,
    topPriorityTask: topTask?.title,
  };
}

// =============================================================================
// STORAGE
// =============================================================================

async function storeMorningInsight(
  userId: string,
  insight: MorningInsight,
  context: MorningContext
): Promise<void> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Store in ai_insights table
  await supabase.from("ai_insights").upsert(
    {
      user_id: userId,
      insight_date: today,
      insight_type: "morning_insight",
      summary: insight.summary,
      recommendations: insight.recommendations,
      energy_score: insight.recoveryScore,
    },
    {
      onConflict: "user_id,insight_date,insight_type",
    }
  );

  // Also cache the computed context for the day
  await setComputedPatterns(
    userId,
    "daily_context",
    {
      insight,
      context: {
        recoveryScore: context.health?.recovery_score,
        meetingsCount: context.events.length,
        tasksCount: context.tasks.length,
        recentMoods: context.recentJournals.map((j) => j.mood_label).filter(Boolean),
      },
    },
    undefined,
    new Date()
  );
}

// =============================================================================
// API HELPERS
// =============================================================================

/**
 * Get the most recent morning insight for a user
 */
export async function getMorningInsight(
  userId: string
): Promise<MorningInsight | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("user_id", userId)
    .eq("insight_type", "morning_insight")
    .eq("insight_date", today)
    .single();

  if (!data) return null;

  return {
    summary: data.summary,
    recommendations: data.recommendations || [],
    energyOptimalTasks: [],
    focusTheme: "Focus",
    recoveryScore: data.energy_score,
    meetingsToday: 0,
  };
}

/**
 * Check if morning insight exists for today
 */
export async function hasTodayInsight(userId: string): Promise<boolean> {
  const insight = await getMorningInsight(userId);
  return insight !== null;
}
