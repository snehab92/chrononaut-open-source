import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getAgent, AgentType } from "@/lib/ai/agents";

export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createClient();
  
  // Verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, agentType, conversationId, context } = await req.json();

  // Get agent config
  const agent = getAgent(agentType as AgentType || "executive-coach");

  // Build system prompt with optional context
  let systemPrompt = agent.systemPrompt;
  
  if (context) {
    systemPrompt += `\n\n## Current Context\n${context}`;
  }

  // Stream the response
  try {
    const result = await streamText({
      model: anthropic(agent.model),
      system: systemPrompt,
      messages,
    });

    // Save conversation to database (fire and forget)
    if (conversationId) {
      saveMessage(supabase, user.id, conversationId, messages, agentType);
    }

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("AI Error:", error);
    return new Response(JSON.stringify({ error: "AI request failed" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Helper to save messages (non-blocking)
async function saveMessage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
  agentType: string
) {
  try {
    // Get or create conversation
    const { data: conversation } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .single();

    if (!conversation) {
      // Create new conversation
      await supabase.from("ai_conversations").insert({
        id: conversationId,
        user_id: userId,
        agent_type: agentType,
        title: messages[0]?.content?.slice(0, 50) || "New conversation",
      });
    }

    // Save the latest user message
    const lastUserMessage = messages.filter((m: { role: string }) => m.role === "user").pop();
    if (lastUserMessage) {
      await supabase.from("ai_messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: lastUserMessage.content,
      });
    }
  } catch (error) {
    console.error("Error saving message:", error);
  }
}
