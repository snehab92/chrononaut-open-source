import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateMorningInsight } from "@/lib/ai/workflows/morning-insight";

/**
 * GET /api/cron/morning-insight
 *
 * Cron job to generate morning insights for all active users.
 * Scheduled to run at 7 AM EST (12 PM UTC).
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
      .select("id")
      .eq("onboarding_completed", true);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json(
        { error: "Failed to fetch profiles" },
        { status: 500 }
      );
    }

    const results: Array<{ userId: string; success: boolean; error?: string }> = [];

    // Process each user (with rate limiting)
    for (const profile of profiles || []) {
      try {
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

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`Morning insight cron completed: ${successCount} success, ${failCount} failed`);

    return NextResponse.json({
      processed: results.length,
      success: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    console.error("Morning insight cron error:", error);
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}
