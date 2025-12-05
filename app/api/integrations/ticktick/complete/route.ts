import { createClient } from "@/lib/supabase/server";
import { TickTickClient } from "@/lib/ticktick/client";
import { NextRequest, NextResponse } from "next/server";

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

  // Get request body
  const body = await request.json();
  const { taskId, projectId } = body;

  if (!taskId || !projectId) {
    return NextResponse.json(
      { error: "taskId and projectId are required" },
      { status: 400 }
    );
  }

  // Get TickTick token
  const { data: tokenData } = await supabase
    .from("integration_tokens")
    .select("encrypted_access_token, encrypted_refresh_token")
    .eq("user_id", user.id)
    .eq("provider", "ticktick")
    .single();

  if (!tokenData) {
    return NextResponse.json(
      { error: "TickTick not connected" },
      { status: 400 }
    );
  }

  try {
    const client = TickTickClient.fromToken(
      tokenData.encrypted_access_token,
      tokenData.encrypted_refresh_token
    );

    await client.completeTask(projectId, taskId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to complete task:", error);
    return NextResponse.json(
      { error: "Failed to complete task" },
      { status: 500 }
    );
  }
}
