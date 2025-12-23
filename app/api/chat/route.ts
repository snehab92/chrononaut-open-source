import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getAgent, type AgentType } from "@/lib/ai/agents";
import {
  selectModel,
  inferTaskType,
  getOptimizedPrompt,
  calculateCost,
  estimateTokens,
  type TaskType,
} from "@/lib/ai/model-selector";
import {
  getCachedResponse,
  setCacheResponse,
  createContextBuilder,
  trackTokenUsage,
  checkBudgetStatus,
} from "@/lib/ai/context";

export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createClient();

  // Verify auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check budget before processing
  const budgetAlert = await checkBudgetStatus(user.id);
  if (budgetAlert?.type === "exceeded") {
    return new Response(
      JSON.stringify({
        error: "Monthly AI budget exceeded",
        alert: budgetAlert,
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { messages, agentType, conversationId, context, taskType: explicitTaskType } =
    await req.json();

  const effectiveAgentType = (agentType as AgentType) || "executive-coach";
  const agent = getAgent(effectiveAgentType);

  // Infer task type if not explicitly provided
  const taskType: TaskType =
    explicitTaskType || inferTaskType(effectiveAgentType, context?.type, messages.length);

  // Get model config based on task type
  const modelConfig = selectModel(taskType, messages.length);

  // Check cache for cacheable task types
  if (modelConfig.cacheable && context) {
    const cached = await getCachedResponse(user.id, taskType, context);
    if (cached.cached && cached.response) {
      // Track cached response (0 tokens used)
      trackTokenUsage({
        userId: user.id,
        agentType: effectiveAgentType,
        taskType,
        model: modelConfig.model,
        inputTokens: 0,
        outputTokens: 0,
        cached: true,
        conversationId,
      });

      return new Response(cached.response, {
        headers: { "X-Cache": "HIT", "Content-Type": "text/plain" },
      });
    }
  }

  // Build context using agent-specific builder
  const contextBuilder = createContextBuilder(effectiveAgentType);
  const builtContext = await contextBuilder.buildContext(
    user.id,
    conversationId,
    messages,
    typeof context === "string" ? context : context?.data
  );

  // Get optimized prompt (compressed for Haiku)
  const systemPrompt = getOptimizedPrompt(
    effectiveAgentType,
    modelConfig.model,
    builtContext.formattedPrompt
  );

  // Stream the response
  try {
    const result = await streamText({
      model: anthropic(modelConfig.model),
      system: systemPrompt,
      messages: builtContext.conversationalMessages,
      maxTokens: modelConfig.maxOutputTokens,
    });

    // Estimate input tokens for tracking
    const inputTokens = builtContext.estimatedInputTokens;

    // Track usage and cache (fire and forget)
    result.text.then(async (text) => {
      const outputTokens = estimateTokens(text);

      // Track token usage
      await trackTokenUsage({
        userId: user.id,
        agentType: effectiveAgentType,
        taskType,
        model: modelConfig.model,
        inputTokens,
        outputTokens,
        cached: false,
        conversationId,
      });

      // Cache if cacheable
      if (modelConfig.cacheable && context) {
        await setCacheResponse(
          user.id,
          taskType,
          context,
          text,
          modelConfig.model,
          inputTokens,
          outputTokens
        );
      }
    });

    // Save conversation to database (fire and forget)
    if (conversationId) {
      saveMessage(supabase, user.id, conversationId, messages, effectiveAgentType, modelConfig.model);
    }

    // Include budget warning in headers if applicable
    const headers: Record<string, string> = {
      "X-Cache": "MISS",
      "X-Model": modelConfig.model,
    };

    if (budgetAlert) {
      headers["X-Budget-Warning"] = budgetAlert.type;
    }

    return result.toTextStreamResponse({ headers });
  } catch (error) {
    console.error("AI Error:", error);
    return new Response(JSON.stringify({ error: "AI request failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Helper to save messages (non-blocking)
async function saveMessage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
  agentType: string,
  model: string
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
    } else {
      // Update last_message_at
      await supabase
        .from("ai_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    // Save the latest user message
    const lastUserMessage = messages
      .filter((m: { role: string }) => m.role === "user")
      .pop();
    if (lastUserMessage) {
      await supabase.from("ai_messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: lastUserMessage.content,
        model: model,
      });
    }
  } catch (error) {
    console.error("Error saving message:", error);
  }
}
