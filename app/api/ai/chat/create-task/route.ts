import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId, conversationId, title, content } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    // Create a local task (not synced to TickTick yet)
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title,
        content: content || null,
        priority: 0,
        sync_status: "pending_push", // Will be pushed to TickTick on next sync
      })
      .select("id")
      .single();

    if (taskError) {
      console.error("Failed to create task:", taskError);
      return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }

    // Update the message to track it created a task
    if (messageId) {
      await supabase
        .from("ai_messages")
        .update({ created_task_id: task.id })
        .eq("id", messageId);
    }

    return NextResponse.json({ taskId: task.id });

  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
