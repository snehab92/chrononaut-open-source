import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/integrations/ticktick/tasks/local
 * 
 * Get tasks from local Supabase database (not TickTick API).
 * Used by dashboard for fast, local-first task display.
 * 
 * Query params:
 * - filter: 'today' | 'week' (default: 'week')
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filter = request.nextUrl.searchParams.get('filter') || 'week';

  // Check if TickTick is connected
  const { data: tokenData } = await supabase
    .from("integration_tokens")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", "ticktick")
    .single();

  if (!tokenData) {
    return NextResponse.json({ connected: false, tasks: [] });
  }

  // Calculate date boundaries
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let endDate: Date;
  if (filter === 'today') {
    endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 1);
  } else {
    endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 7);
  }

  // Fetch tasks from local database
  // Include: not completed, due before end date OR overdue
  const { data: tasks, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('completed', false)
    .or(`due_date.is.null,due_date.lt.${endDate.toISOString()}`)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: false });

  if (fetchError) {
    console.error('Failed to fetch local tasks:', fetchError);
    return NextResponse.json(
      { error: "Failed to fetch tasks", connected: true, tasks: [] },
      { status: 500 }
    );
  }

  // Transform to match expected format
  const formattedTasks = (tasks || []).map(task => ({
    id: task.id,
    ticktick_id: task.ticktick_id,
    title: task.title,
    content: task.content,
    projectId: task.ticktick_list_id,
    priority: task.priority,
    dueDate: task.due_date,
    isCompleted: task.completed,
    syncStatus: task.sync_status,
    estimatedMinutes: task.estimated_minutes,
    actualMinutes: task.actual_minutes,
  }));

  // Get last sync info
  const { data: lastSync } = await supabase
    .from('sync_log')
    .select('completed_at')
    .eq('user_id', user.id)
    .eq('provider', 'ticktick')
    .eq('success', true)
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    connected: true,
    tasks: formattedTasks,
    lastSyncedAt: lastSync?.completed_at || null,
    filter,
  });
}
