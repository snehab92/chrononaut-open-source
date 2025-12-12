import { createClient } from "@/lib/supabase/server";
import { WhoopClient, refreshAccessToken } from "@/lib/whoop/client";
import { syncWhoopData } from "@/lib/whoop/sync";
import { NextResponse } from "next/server";

/**
 * POST /api/integrations/whoop/sync
 * 
 * Triggers a sync of Whoop health data
 */
export async function POST() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get Whoop tokens
  const { data: tokenData } = await supabase
    .from("integration_tokens")
    .select("encrypted_access_token, encrypted_refresh_token, expires_at")
    .eq("user_id", user.id)
    .eq("provider", "whoop")
    .single();

  if (!tokenData) {
    return NextResponse.json(
      { error: "Whoop not connected" },
      { status: 400 }
    );
  }

  try {
    let accessToken = tokenData.encrypted_access_token;
    
    // Check if token is expired and refresh if needed
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      if (!tokenData.encrypted_refresh_token) {
        return NextResponse.json(
          { error: "Token expired and no refresh token available" },
          { status: 401 }
        );
      }

      console.log('Refreshing expired Whoop token...');
      const newTokens = await refreshAccessToken(tokenData.encrypted_refresh_token);
      accessToken = newTokens.access_token;

      // Update stored tokens
      await supabase
        .from("integration_tokens")
        .update({
          encrypted_access_token: newTokens.access_token,
          encrypted_refresh_token: newTokens.refresh_token,
          expires_at: new Date(newTokens.expires_at).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("provider", "whoop");
    }

    const client = new WhoopClient(accessToken);
    const result = await syncWhoopData(user.id, client);

    return NextResponse.json({
      success: result.success,
      synced: {
        healthMetrics: result.healthMetrics,
        workouts: result.workouts,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error("Whoop sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/whoop/sync
 * 
 * Get sync status
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get latest health metrics
  const { data: metrics } = await supabase
    .from('health_metrics')
    .select('date, recovery_score, sleep_hours, strain_score')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(7);

  // Get workout counts
  const { data: workouts } = await supabase
    .from('workouts')
    .select('id, is_meditation')
    .eq('user_id', user.id)
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // Get last sync
  const { data: lastSync } = await supabase
    .from('sync_log')
    .select('completed_at, pulled_count')
    .eq('user_id', user.id)
    .eq('provider', 'whoop')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  const meditationCount = workouts?.filter(w => w.is_meditation).length || 0;
  const workoutCount = workouts?.filter(w => !w.is_meditation).length || 0;

  return NextResponse.json({
    recentMetrics: metrics || [],
    last7Days: {
      workouts: workoutCount,
      meditations: meditationCount,
    },
    lastSync: lastSync ? {
      completedAt: lastSync.completed_at,
      pulled: lastSync.pulled_count,
    } : null,
  });
}
