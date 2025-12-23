import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeAgentWorkflow } from "@/lib/ai/orchestrator";
import { checkBudgetStatus, trackTokenUsage } from "@/lib/ai/context";

export const maxDuration = 60; // Allow up to 60s for multi-step workflows

/**
 * POST /api/ai/agents/research-assistant/execute
 *
 * Execute a multi-step research assistant workflow.
 *
 * Request body:
 * {
 *   goal: string,        // What you want to accomplish
 *   context?: string     // Optional additional context
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   steps: AgentStep[],
 *   finalResponse: string,
 *   tokensUsed: number
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check budget before processing
  const budgetAlert = await checkBudgetStatus(user.id);
  if (budgetAlert?.type === "exceeded") {
    return NextResponse.json(
      {
        error: "Monthly AI budget exceeded",
        alert: budgetAlert,
      },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { goal, context } = body;

  if (!goal || typeof goal !== "string") {
    return NextResponse.json(
      { error: "Goal is required and must be a string" },
      { status: 400 }
    );
  }

  try {
    const execution = await executeAgentWorkflow(
      user.id,
      goal,
      "research-assistant",
      context
    );

    // Track token usage
    await trackTokenUsage({
      userId: user.id,
      agentType: "research-assistant",
      taskType: "multi-step-workflow",
      model: "claude-sonnet-4-20250514",
      inputTokens: Math.floor(execution.tokensUsed * 0.7), // Approximate split
      outputTokens: Math.floor(execution.tokensUsed * 0.3),
      cached: false,
    });

    // Log execution for analytics
    await supabase.from("ai_insights").insert({
      user_id: user.id,
      insight_date: new Date().toISOString().split("T")[0],
      insight_type: "agent_execution",
      summary: execution.finalResponse.slice(0, 500),
      recommendations: execution.steps.map((s) => s.action).filter(Boolean),
    });

    return NextResponse.json({
      success: execution.success,
      steps: execution.steps,
      finalResponse: execution.finalResponse,
      tokensUsed: execution.tokensUsed,
      error: execution.error,
    });
  } catch (error) {
    console.error("Agent execution error:", error);
    return NextResponse.json(
      {
        error: "Execution failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
