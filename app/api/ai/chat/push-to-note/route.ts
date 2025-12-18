import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId, conversationId, content, title } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    // Create a new note with the AI insight
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title: title || `AI Insight - ${new Date().toLocaleDateString()}`,
        content,
        note_type: "quick capture",
        tags: ["ai-insight"],
      })
      .select("id")
      .single();

    if (noteError) {
      console.error("Failed to create note:", noteError);
      return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
    }

    // Update the message to track it was pushed to a note
    if (messageId) {
      await supabase
        .from("ai_messages")
        .update({ pushed_to_note_id: note.id })
        .eq("id", messageId);
    }

    return NextResponse.json({ noteId: note.id });

  } catch (error) {
    console.error("Push to note error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
