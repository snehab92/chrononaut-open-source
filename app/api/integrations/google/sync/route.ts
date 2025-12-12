import { createClient } from "@/lib/supabase/server";
import { GoogleCalendarClient, refreshAccessToken } from "@/lib/google/calendar";
import { pullEventsFromGoogle, SyncTrigger } from "@/lib/google/sync";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/integrations/google/sync
 * 
 * Triggers a sync of Google Calendar events
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trigger = (request.nextUrl.searchParams.get('trigger') || 'manual') as SyncTrigger;

  // Get Google tokens
  const { data: tokenData } = await supabase
    .from("integration_tokens")
    .select("encrypted_access_token, encrypted_refresh_token, expires_at")
    .eq("user_id", user.id)
    .eq("provider", "google_calendar")
    .single();

  if (!tokenData) {
    return NextResponse.json(
      { error: "Google Calendar not connected" },
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

      console.log('Refreshing expired Google token...');
      const newTokens = await refreshAccessToken(tokenData.encrypted_refresh_token);
      accessToken = newTokens.access_token;

      // Update stored tokens
      await supabase
        .from("integration_tokens")
        .update({
          encrypted_access_token: newTokens.access_token,
          expires_at: newTokens.expires_at ? new Date(newTokens.expires_at).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("provider", "google_calendar");
    }

    const client = new GoogleCalendarClient(accessToken, tokenData.encrypted_refresh_token);
    const result = await pullEventsFromGoogle(user.id, client, trigger);

    return NextResponse.json({
      success: result.success,
      synced: {
        pulled: result.pulled,
        updated: result.updated,
        deleted: result.deleted,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error("Google Calendar sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/google/sync
 * 
 * Get sync status
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get event counts
  const { data: events, error: countError } = await supabase
    .from('calendar_events')
    .select('id, status')
    .eq('user_id', user.id);

  if (countError) {
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
  }

  const counts = {
    total: events?.length || 0,
    confirmed: events?.filter(e => e.status === 'confirmed').length || 0,
    cancelled: events?.filter(e => e.status === 'cancelled').length || 0,
  };

  // Get last sync
  const { data: lastSync } = await supabase
    .from('sync_log')
    .select('completed_at, pulled_count')
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    status: counts,
    lastSync: lastSync ? {
      completedAt: lastSync.completed_at,
      pulled: lastSync.pulled_count,
    } : null,
  });
}
