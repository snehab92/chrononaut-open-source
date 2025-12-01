import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateMorningInsight } from "@/lib/ai/workflows/morning-insight";
import { runWeeklyReview } from "@/lib/cron/weekly-review";
import { runValuesAlignment } from "@/lib/cron/values-alignment";

/**
 * GET /api/cron/daily
 *
 * Unified daily cron job that:
 * - Always: Generates morning insights for users where it's 3 AM local time
 * - Sundays: Also runs weekly review and values alignment
 *
 * Runs at 11 AM UTC (3 AM PST).
 * Requires CRON_SECRET for authentication.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const isSunday = now.getUTCDay() === 0;

  const results = {
    morningInsight: { processed: 0, success: 0, failed: 0, skipped: 0 },
    weeklyReview: null as { processed: number; success: number; failed: number } | null,
    valuesAlignment: null as { processed: number; success: number; failed: number } | null,
    isSunday,
  };

  try {
    // 1. Morning Insight (always run)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, timezone")
      .eq("onboarding_completed", true);

    for (const profile of profiles || []) {
      const userTimezone = profile.timezone || "America/Los_Angeles";

      try {
        // Get current hour in user's timezone
        const userLocalHour = new Date(
          now.toLocaleString("en-US", { timeZone: userTimezone })
        ).getHours();

        // Only generate if it's 3 AM in user's timezone
        if (userLocalHour !== 3) {
          results.morningInsight.skipped++;
          continue;
        }

        await generateMorningInsight(profile.id);
        results.morningInsight.success++;
        results.morningInsight.processed++;

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Morning insight error for ${profile.id}:`, error);
        results.morningInsight.failed++;
        results.morningInsight.processed++;
      }
    }

    // 2. Weekly jobs (Sundays only)
    if (isSunday) {
      console.log("Sunday detected - running weekly jobs...");

      try {
        results.weeklyReview = await runWeeklyReview();
      } catch (error) {
        console.error("Weekly review error:", error);
        results.weeklyReview = { processed: 0, success: 0, failed: 1 };
      }

      try {
        results.valuesAlignment = await runValuesAlignment();
      } catch (error) {
        console.error("Values alignment error:", error);
        results.valuesAlignment = { processed: 0, success: 0, failed: 1 };
      }
    }

    console.log("Daily cron completed:", JSON.stringify(results, null, 2));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Daily cron error:", error);
    return NextResponse.json(
      { error: "Cron job failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
