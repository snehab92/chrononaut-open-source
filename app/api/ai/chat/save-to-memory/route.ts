import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId, conversationId } = await request.json();

    if (!messageId) {
      return NextResponse.json({ error: "Message ID required" }, { status: 400 });
    }

    // Mark message as saved to memory
    // In the future, this could extract key insights and store them
    // in an ai_memories table for retrieval in future conversations
    const { error } = await supabase
      .from("ai_messages")
      .update({ saved_to_memory: true })
      .eq("id", messageId);

    if (error) {
      console.error("Failed to save to memory:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    // TODO: In the future, extract insights and store in ai_memories table
    // This would enable the AI to reference past conversations

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Save to memory error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
