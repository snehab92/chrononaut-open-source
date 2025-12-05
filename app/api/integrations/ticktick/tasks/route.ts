import { createClient } from "@/lib/supabase/server";
import { TickTickClient } from "@/lib/ticktick/client";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get TickTick token
  const { data: tokenData } = await supabase
    .from("integration_tokens")
    .select("encrypted_access_token, encrypted_refresh_token")
    .eq("user_id", user.id)
    .eq("provider", "ticktick")
    .single();

  if (!tokenData) {
    return NextResponse.json({ connected: false, tasks: [] });
  }

  try {
    const client = TickTickClient.fromToken(
      tokenData.encrypted_access_token,
      tokenData.encrypted_refresh_token // inboxId
    );

    const allData = await client.getAllTasks();
    
    // Get today's date boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Filter for today's tasks (due today or overdue, not completed)
    const todaysTasks = allData.syncTaskBean.update
      .filter((task: any) => {
        // Skip completed tasks
        if (task.status === 2) return false;
        
        // Include if no due date but in inbox (might be "today" tasks)
        if (!task.dueDate) return false;
        
        const dueDate = new Date(task.dueDate);
        // Due today or overdue
        return dueDate < tomorrow;
      })
      .map((task: any) => ({
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        priority: task.priority || 0,
        dueDate: task.dueDate,
        isCompleted: task.status === 2,
      }))
      // Sort by priority (high first), then by due date
      .sort((a: any, b: any) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

    return NextResponse.json({
      connected: true,
      tasks: todaysTasks,
    });
  } catch (error) {
    console.error("Failed to fetch TickTick tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks", connected: true, tasks: [] },
      { status: 500 }
    );
  }
}
