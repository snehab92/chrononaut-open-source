import { createClient } from "@/lib/supabase/server";
import { TickTickClient } from "@/lib/ticktick/client";
import { syncTasks, pullTasksFromTickTick, TriggerType } from "@/lib/ticktick/sync";
import { NextRequest, NextResponse } from "next/server";
import { getIntegrationToken } from "@/lib/integrations/get-token";

/**
 * POST /api/integrations/ticktick/sync
 * 
 * Triggers a full bidirectional sync between TickTick and local database.
 * 
 * Query params:
 * - direction: 'pull' | 'push' | 'both' (default: 'both')
 * - trigger: 'manual' | 'scheduled' | 'page_focus' | 'user_action' | 'initial_connect'
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get params
  const direction = request.nextUrl.searchParams.get('direction') || 'both';
  const trigger = (request.nextUrl.searchParams.get('trigger') || 'manual') as TriggerType;

  // Get and decrypt TickTick token
  const tokenData = await getIntegrationToken(user.id, "ticktick");

  if (!tokenData) {
    return NextResponse.json(
      { error: "TickTick not connected" },
      { status: 400 }
    );
  }

  try {
    // Use decrypted tokens
    const client = TickTickClient.fromToken(
      tokenData.access_token,
      tokenData.refresh_token || ""
    );

    let result;

    if (direction === 'pull') {
      result = await pullTasksFromTickTick(user.id, client, trigger);
    } else {
      // 'both' or 'push' - do full sync
      result = await syncTasks(user.id, client, trigger);
    }

    // Log sync result for debugging
    console.log('Sync result:', {
      userId: user.id,
      direction,
      trigger,
      ...result,
    });

    return NextResponse.json({
      success: result.success,
      synced: {
        pulled: result.pulled,
        pushed: result.pushed,
        conflicts: result.conflicts,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error("Sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/ticktick/sync
 * 
 * Get sync status for the current user
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get task sync status counts
  const { data: statusCounts, error: countError } = await supabase
    .from('tasks')
    .select('sync_status')
    .eq('user_id', user.id)
    .not('ticktick_id', 'is', null);

  if (countError) {
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }

  // Count by status
  const counts = {
    synced: 0,
    pending_push: 0,
    pending_pull: 0,
    conflict: 0,
    error: 0,
    total: statusCounts?.length || 0,
  };

  statusCounts?.forEach((task: { sync_status: string }) => {
    const status = task.sync_status as keyof typeof counts;
    if (status in counts && status !== 'total') {
      counts[status]++;
    }
  });

  // Get last sync time from tasks (fallback if sync_log doesn't exist yet)
  const { data: lastSynced } = await supabase
    .from('tasks')
    .select('last_synced_at')
    .eq('user_id', user.id)
    .not('last_synced_at', 'is', null)
    .order('last_synced_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    status: counts,
    lastSyncedAt: lastSynced?.last_synced_at || null,
    hasPendingChanges: counts.pending_push > 0 || counts.pending_pull > 0,
  });
}
