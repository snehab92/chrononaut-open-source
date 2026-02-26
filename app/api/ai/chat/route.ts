import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

// Executive Coach system prompt (from PRD)
const EXECUTIVE_COACH_PROMPT = `You are an executive coach with 25+ years experience. You deeply understand executive function challenges and productivity optimization.

Trained in: DBT, ACT, mindfulness, corporate leadership dynamics.

Style:
- Direct and warm—no fluff
- Celebrate wins explicitly
- One small step at a time
- Reference user patterns when relevant
- Never shame; always curious
- Reframe "failures" as data

You help with:
- Focus and task prioritization
- Emotional regulation
- Meeting preparation and social navigation
- Reflection and pattern recognition
- Breaking down overwhelming tasks

Keep responses concise but supportive. Ask clarifying questions when helpful.`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, conversationId, context, history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Get or create conversation
    let convId = conversationId;
    
    if (!convId) {
      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: user.id,
          title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
          context_type: context?.type || "general",
          context_id: context?.id || null,
          agent_type: "executive_coach",
        })
        .select("id")
        .single();

      if (convError) {
        console.error("Failed to create conversation:", convError);
        return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
      }
      
      convId = newConv.id;
    }

    // Save user message
    const { data: userMsg, error: userMsgError } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: convId,
        role: "user",
        content: message,
      })
      .select("id")
      .single();

    if (userMsgError) {
      console.error("Failed to save user message:", userMsgError);
    }

    // Build context for Claude
    let contextInfo = "";
    if (context) {
      switch (context.type) {
        case "focus":
          contextInfo = `\n\nContext: User is in a focus session${context.title ? ` working on "${context.title}"` : ""}.`;
          break;
        case "journal":
          contextInfo = "\n\nContext: User is reflecting on their journal/day.";
          break;
        case "meeting":
          contextInfo = `\n\nContext: User is preparing for${context.title ? ` "${context.title}"` : " a meeting"}.`;
          break;
        case "task":
          contextInfo = `\n\nContext: User needs help with${context.title ? ` the task "${context.title}"` : " a task"}.`;
          break;
      }
    }

    // Format message history
    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...history.slice(-10), // Keep last 10 messages for context
      { role: "user" as const, content: message },
    ];

    // Call Claude using Vercel AI SDK
    const { text, usage } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: EXECUTIVE_COACH_PROMPT + contextInfo,
      messages,
      maxTokens: 1024,
    });

    // Save assistant message
    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: convId,
        role: "assistant",
        content: text,
        tokens_used: usage?.totalTokens,
        model: "claude-sonnet-4-20250514",
      })
      .select("id")
      .single();

    if (assistantMsgError) {
      console.error("Failed to save assistant message:", assistantMsgError);
    }

    // Update conversation timestamp
    await supabase
      .from("ai_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", convId);

    return NextResponse.json({
      content: text,
      conversationId: convId,
      messageId: assistantMsg?.id,
    });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
