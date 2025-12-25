import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateMorningInsight } from "@/lib/ai/workflows/morning-insight";

/**
 * GET /api/cron/morning-insight
 *
 * Cron job to generate morning insights for all active users.
 * Runs every hour and only processes users for whom it's 3 AM local time.
 * User's timezone is stored in their profile (defaults to America/New_York).
 *
 * Requires CRON_SECRET for authentication.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role for cron jobs (no user auth)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get all users who have completed onboarding
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, timezone")
      .eq("onboarding_completed", true);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json(
        { error: "Failed to fetch profiles" },
        { status: 500 }
      );
    }

    const results: Array<{ userId: string; success: boolean; skipped?: boolean; error?: string }> = [];
    const now = new Date();

    // Process each user - only if it's 3 AM in their timezone
    for (const profile of profiles || []) {
      const userTimezone = profile.timezone || "America/New_York";

      try {
        // Get current hour in user's timezone
        const userLocalHour = new Date(now.toLocaleString("en-US", { timeZone: userTimezone })).getHours();

        // Only generate if it's 3 AM in user's timezone
        if (userLocalHour !== 3) {
          results.push({ userId: profile.id, success: true, skipped: true });
          continue;
        }

        await generateMorningInsight(profile.id);
        results.push({ userId: profile.id, success: true });

        // Small delay between users to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error generating insight for ${profile.id}:`, error);
        results.push({
          userId: profile.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const processedCount = results.filter((r) => !r.skipped).length;
    const successCount = results.filter((r) => r.success && !r.skipped).length;
    const failCount = results.filter((r) => !r.success).length;
    const skippedCount = results.filter((r) => r.skipped).length;

    console.log(`Morning insight cron completed: ${successCount} success, ${failCount} failed, ${skippedCount} skipped (not 3 AM)`);

    return NextResponse.json({
      totalUsers: results.length,
      processed: processedCount,
      success: successCount,
      failed: failCount,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error("Morning insight cron error:", error);
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}
