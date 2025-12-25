import { createClient } from "@supabase/supabase-js";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

/**
 * Runs the weekly review generation for all active users.
 * Creates an AI-generated "Week in Review" journal entry.
 */
export async function runWeeklyReview(): Promise<{
  processed: number;
  success: number;
  failed: number;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all users who have completed onboarding
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("onboarding_completed", true);

  const results: Array<{ userId: string; success: boolean; error?: string }> = [];

  for (const profile of profiles || []) {
    try {
      await generateWeeklyReview(supabase, profile.id);
      results.push({ userId: profile.id, success: true });

      // Delay between users
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error generating weekly review for ${profile.id}:`, error);
      results.push({
        userId: profile.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;

  return {
    processed: results.length,
    success: successCount,
    failed: results.length - successCount,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateWeeklyReview(
  supabase: any,
  userId: string
): Promise<void> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Gather week's data
  const [journalsRes, healthRes, tasksRes, timeBlocksRes] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("entry_date, mood_label, energy_rating")
      .eq("user_id", userId)
      .gte("entry_date", weekAgo.toISOString().split("T")[0]),
    supabase
      .from("health_metrics")
      .select("metric_date, recovery_score, sleep_hours")
      .eq("user_id", userId)
      .gte("metric_date", weekAgo.toISOString().split("T")[0]),
    supabase
      .from("tasks")
      .select("title, completed, completed_at, priority")
      .eq("user_id", userId)
      .gte("created_at", weekAgo.toISOString()),
    supabase
      .from("time_blocks")
      .select("focus_mode, planned_minutes, completed")
      .eq("user_id", userId)
      .gte("started_at", weekAgo.toISOString()),
  ]);

  const journals = (journalsRes.data || []) as Array<{
    entry_date: string;
    mood_label: string;
    energy_rating: number;
  }>;
  const health = (healthRes.data || []) as Array<{
    metric_date: string;
    recovery_score: number;
    sleep_hours: number;
  }>;
  const tasks = (tasksRes.data || []) as Array<{
    title: string;
    completed: boolean;
    completed_at: string | null;
    priority: number;
  }>;
  const timeBlocks = (timeBlocksRes.data || []) as Array<{
    focus_mode: string;
    planned_minutes: number;
    completed: boolean;
  }>;

  // Generate review with AI
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You are a therapist-informed Pattern Analyst trained in DBT and ACT.

Generate a "Week in Review" journal entry that:
1. Celebrates wins explicitly (ADHD brains need this!)
2. Identifies patterns without judgment
3. Notes energy-mood correlations
4. Applies DBT/ACT lens (values alignment, acceptance)
5. Suggests ONE area for intentional focus next week

Write in warm, supportive second-person ("You...").
Use markdown formatting.
Include a "Self-Compassion Check" section.
Keep it under 800 words.`,
    prompt: `Analyze this week's data:

Journals (${journals.length} entries):
${journals.map((j) => `- ${j.entry_date}: Mood=${j.mood_label}, Energy=${j.energy_rating}/10`).join("\n")}

Health Metrics:
${health.map((h) => `- ${h.metric_date}: Recovery=${h.recovery_score}%, Sleep=${h.sleep_hours}hrs`).join("\n")}

Tasks: ${tasks.filter((t) => t.completed).length}/${tasks.length} completed

Focus Sessions: ${timeBlocks.length} sessions, ${timeBlocks.reduce((s, t) => s + (t.planned_minutes || 0), 0)} minutes planned`,
    maxTokens: 1500,
  });

  // Save as journal entry
  await supabase.from("journal_entries").insert({
    user_id: userId,
    entry_date: new Date().toISOString().split("T")[0],
    encrypted_happened: text,
    tags: ["weekly-review", "ai-generated"],
    mood_label: "Calm",
    energy_rating: 5,
  });

  // Save as AI insight
  await supabase.from("ai_insights").insert({
    user_id: userId,
    insight_date: new Date().toISOString().split("T")[0],
    insight_type: "weekly_review",
    summary: text.slice(0, 500),
  });
}
