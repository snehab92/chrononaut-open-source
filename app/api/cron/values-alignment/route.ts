import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

/**
 * GET /api/cron/values-alignment
 *
 * Cron job to recalculate Living Aligned scores for all users weekly.
 * Analyzes pattern data (notes, journals, tasks) against stored values.
 * Scheduled to run at 3 AM EST on Sundays (8 AM UTC).
 *
 * Requires CRON_SECRET for authentication.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role for cron jobs
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get all users with values alignment assessments
    const { data: valuesResults } = await supabase
      .from("values_alignment_results")
      .select("user_id, value_1, value_2, value_3, early_warning_signs, living_aligned_score")
      .not("value_1", "is", null);

    if (!valuesResults || valuesResults.length === 0) {
      return NextResponse.json({ message: "No users with values assessments" });
    }

    const results: Array<{ userId: string; success: boolean; score?: number; error?: string }> = [];
    const anthropic = new Anthropic();

    for (const userValues of valuesResults) {
      try {
        const score = await computeAlignmentForUser(
          supabase,
          anthropic,
          userValues
        );

        if (score !== null) {
          // Determine trend
          const previousScore = userValues.living_aligned_score;
          let trend: "up" | "down" | "stable" = "stable";
          if (previousScore !== null && previousScore !== undefined) {
            if (score > previousScore + 5) trend = "up";
            else if (score < previousScore - 5) trend = "down";
          }

          // Update the values_alignment_results table
          await supabase
            .from("values_alignment_results")
            .update({
              living_aligned_score: score,
              living_aligned_trend: trend,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userValues.user_id);

          results.push({ userId: userValues.user_id, success: true, score });
        } else {
          results.push({ userId: userValues.user_id, success: false, error: "Insufficient data" });
        }

        // Delay between users to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error computing alignment for ${userValues.user_id}:`, error);
        results.push({
          userId: userValues.user_id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      processed: results.length,
      success: successCount,
      failed: results.length - successCount,
      details: results,
    });
  } catch (error) {
    console.error("Values alignment cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}

interface UserValues {
  user_id: string;
  value_1: string;
  value_2: string | null;
  value_3: string | null;
  early_warning_signs: string[] | null;
  living_aligned_score: number | null;
}

async function computeAlignmentForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  anthropic: Anthropic,
  userValues: UserValues
): Promise<number | null> {
  const userId = userValues.user_id;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Gather data from multiple sources
  const [journalsRes, tasksRes, notesRes, aiInsightsRes, timeBlocksRes] = await Promise.all([
    // Journal entries
    supabase
      .from("journal_entries")
      .select("entry_date, mood_label, energy_rating, tags")
      .eq("user_id", userId)
      .gte("entry_date", sevenDaysAgo.toISOString().split("T")[0])
      .order("entry_date", { ascending: false }),

    // Tasks (completed status shows productivity/commitment)
    supabase
      .from("tasks")
      .select("title, completed, priority, tags")
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgo.toISOString()),

    // Notes (content focus areas)
    supabase
      .from("notes")
      .select("title, updated_at, folder_id, tags")
      .eq("user_id", userId)
      .gte("updated_at", sevenDaysAgo.toISOString())
      .limit(20),

    // AI insights for detected patterns
    supabase
      .from("ai_insights")
      .select("insight_date, summary, patterns_detected")
      .eq("user_id", userId)
      .gte("insight_date", sevenDaysAgo.toISOString().split("T")[0])
      .limit(10),

    // Time blocks (what they're actually spending time on)
    supabase
      .from("time_blocks")
      .select("focus_mode, planned_minutes, completed")
      .eq("user_id", userId)
      .gte("started_at", sevenDaysAgo.toISOString()),
  ]);

  const journals = journalsRes.data || [];
  const tasks = tasksRes.data || [];
  const notes = notesRes.data || [];
  const aiInsights = aiInsightsRes.data || [];
  const timeBlocks = timeBlocksRes.data || [];

  // Need some minimum data to analyze
  const totalDataPoints = journals.length + tasks.length + notes.length;
  if (totalDataPoints < 3) {
    return null;
  }

  // Build analysis context
  const values = [userValues.value_1, userValues.value_2, userValues.value_3].filter(Boolean);
  const warningsigns = userValues.early_warning_signs || [];

  let context = `## Core Values to Measure Against\n`;
  values.forEach((v, i) => {
    context += `${i + 1}. ${v}\n`;
  });

  if (warningsigns.length > 0) {
    context += `\n## Early Warning Signs of Misalignment\n`;
    warningsigns.forEach((s) => {
      context += `- ${s}\n`;
    });
  }

  // Add behavioral data
  context += `\n## This Week's Behavioral Data\n\n`;

  // Journal summary
  if (journals.length > 0) {
    const moodCounts: Record<string, number> = {};
    let totalEnergy = 0;
    let energyCount = 0;

    journals.forEach((j: { mood_label?: string; energy_rating?: number }) => {
      if (j.mood_label) {
        moodCounts[j.mood_label] = (moodCounts[j.mood_label] || 0) + 1;
      }
      if (j.energy_rating) {
        totalEnergy += j.energy_rating;
        energyCount++;
      }
    });

    context += `### Journal Entries (${journals.length})\n`;
    context += `Mood distribution: ${Object.entries(moodCounts).map(([m, c]) => `${m}(${c})`).join(", ")}\n`;
    if (energyCount > 0) {
      context += `Average energy: ${(totalEnergy / energyCount).toFixed(1)}/10\n`;
    }
    context += "\n";
  }

  // Task summary
  if (tasks.length > 0) {
    const completed = tasks.filter((t: { completed?: boolean }) => t.completed).length;
    const highPriority = tasks.filter((t: { priority?: number; completed?: boolean }) => t.priority === 1 && t.completed).length;
    context += `### Tasks\n`;
    context += `${completed}/${tasks.length} tasks completed\n`;
    context += `${highPriority} high-priority tasks completed\n\n`;
  }

  // Notes activity
  if (notes.length > 0) {
    context += `### Notes Activity\n`;
    context += `${notes.length} notes created/updated\n`;
    const titles = notes.slice(0, 5).map((n: { title?: string }) => n.title).filter(Boolean);
    if (titles.length > 0) {
      context += `Topics: ${titles.join(", ")}\n`;
    }
    context += "\n";
  }

  // Focus time
  if (timeBlocks.length > 0) {
    const totalMinutes = timeBlocks.reduce((s: number, t: { planned_minutes?: number }) => s + (t.planned_minutes || 0), 0);
    const completedBlocks = timeBlocks.filter((t: { completed?: boolean }) => t.completed).length;
    context += `### Focus Sessions\n`;
    context += `${timeBlocks.length} sessions, ${totalMinutes} minutes planned\n`;
    context += `${completedBlocks} sessions completed\n\n`;
  }

  // Pattern insights
  if (aiInsights.length > 0) {
    const patterns = aiInsights.flatMap((i: { patterns_detected?: string[] }) => i.patterns_detected || []).filter(Boolean);
    if (patterns.length > 0) {
      context += `### Detected Patterns\n`;
      context += patterns.slice(0, 5).map((p: string) => `- ${p}`).join("\n");
      context += "\n";
    }
  }

  // Use AI to score alignment
  const prompt = `You are analyzing whether a user's weekly activities align with their stated core values.

${context}

Based on this week's data, estimate how aligned their behavior is with their core values.

Return ONLY a JSON object:
{
  "score": <number 0-100>,
  "reasoning": "<one sentence explaining the score>"
}

Scoring guide:
- 85-100: Strong evidence of values-aligned living
- 70-84: Generally aligned with minor drift
- 55-69: Mixed signals, some misalignment
- 40-54: Notable misalignment patterns
- 0-39: Significant disconnect from values

If data is limited, score conservatively around 65-75.
Be kind but honest.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return null;
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const result = JSON.parse(jsonMatch[0]);
    return Math.min(100, Math.max(0, result.score || 70));
  } catch (error) {
    console.error("AI alignment scoring failed:", error);
    return null;
  }
}
