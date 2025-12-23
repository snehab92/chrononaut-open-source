/**
 * AI Agent Orchestrator
 *
 * Coordinates multi-step agentic workflows by:
 * 1. Parsing user goals
 * 2. Executing tools in sequence
 * 3. Feeding results back to the agent
 * 4. Continuing until completion
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { getAgent, type AgentType } from "./agents";
import { TOOLS, getToolDefinitions, executeTool, type ToolResult } from "./tools";

// =============================================================================
// TYPES
// =============================================================================

export interface AgentStep {
  thought: string;
  action?: string;
  actionInput?: Record<string, unknown>;
  toolResult?: ToolResult;
  response?: string;
}

export interface AgentExecution {
  goal: string;
  steps: AgentStep[];
  finalResponse: string;
  success: boolean;
  error?: string;
  tokensUsed: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const MAX_ITERATIONS = 10;
const MAX_TOKENS_PER_STEP = 2048;

// =============================================================================
// ORCHESTRATOR
// =============================================================================

/**
 * Execute a multi-step agent workflow
 *
 * @param userId - User ID executing the workflow
 * @param goal - The goal/task to accomplish
 * @param agentType - Which agent to use (default: research-assistant)
 * @param initialContext - Optional initial context
 * @returns Execution result with steps and final response
 */
export async function executeAgentWorkflow(
  userId: string,
  goal: string,
  agentType: AgentType = "research-assistant",
  initialContext?: string
): Promise<AgentExecution> {
  const agent = getAgent(agentType);
  const steps: AgentStep[] = [];
  let iteration = 0;
  let totalTokens = 0;

  // Build the system prompt with tool definitions
  const toolDescriptions = getToolDefinitions();

  const systemPrompt = `${agent.systemPrompt}

## Available Tools
You can use these tools to complete tasks. Think step-by-step and use tools as needed.

${toolDescriptions}

## Response Format
For each step, respond in this EXACT JSON format:
{
  "thought": "Your reasoning about what to do next",
  "action": "tool_name OR respond",
  "action_input": { /* tool parameters if action is a tool */ } OR "Your final response to the user if action is respond"
}

If action is "respond", the workflow is complete and action_input should be your final answer as a string.

## Rules
1. Always think before acting
2. Use tools when you need to read, write, or analyze data
3. When you have enough information, use action: "respond" to provide your final answer
4. Be concise but thorough
5. If a tool fails, try a different approach`;

  const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];

  // Initial user prompt
  const initialPrompt = `Goal: ${goal}${initialContext ? `\n\nContext:\n${initialContext}` : ""}

Please accomplish this goal using the available tools. Think step by step.`;

  conversationHistory.push({
    role: "user",
    content: initialPrompt,
  });

  // Main orchestration loop
  while (iteration < MAX_ITERATIONS) {
    iteration++;

    try {
      const { text, usage } = await generateText({
        model: anthropic(agent.model),
        system: systemPrompt,
        messages: conversationHistory,
        maxTokens: MAX_TOKENS_PER_STEP,
      });

      totalTokens += (usage?.totalTokens || 0);

      // Try to parse the response as JSON
      let parsed: {
        thought: string;
        action: string;
        action_input: Record<string, unknown> | string;
      };

      try {
        // Find JSON in the response (might be wrapped in markdown)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }
        parsed = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        // If we can't parse JSON, treat the whole response as a final answer
        steps.push({
          thought: "Providing direct response",
          response: text,
        });

        return {
          goal,
          steps,
          finalResponse: text,
          success: true,
          tokensUsed: totalTokens,
        };
      }

      const step: AgentStep = { thought: parsed.thought };

      // Check if this is the final response
      if (parsed.action === "respond") {
        step.response =
          typeof parsed.action_input === "string"
            ? parsed.action_input
            : JSON.stringify(parsed.action_input);

        steps.push(step);
        conversationHistory.push({ role: "assistant", content: text });

        return {
          goal,
          steps,
          finalResponse: step.response,
          success: true,
          tokensUsed: totalTokens,
        };
      }

      // Execute the tool
      step.action = parsed.action;
      step.actionInput =
        typeof parsed.action_input === "object"
          ? parsed.action_input
          : { input: parsed.action_input };

      const toolResult = await executeTool(
        parsed.action,
        step.actionInput,
        userId
      );

      step.toolResult = toolResult;
      steps.push(step);

      // Add to conversation history
      conversationHistory.push({ role: "assistant", content: text });
      conversationHistory.push({
        role: "user",
        content: `Tool Result (${parsed.action}):\n${
          toolResult.success
            ? toolResult.markdown || JSON.stringify(toolResult.data, null, 2)
            : `Error: ${toolResult.error}`
        }`,
      });
    } catch (error) {
      console.error(`Orchestrator error at iteration ${iteration}:`, error);

      return {
        goal,
        steps,
        finalResponse: `Workflow failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        tokensUsed: totalTokens,
      };
    }
  }

  // Max iterations reached
  return {
    goal,
    steps,
    finalResponse:
      "Workflow reached maximum iterations without completing. Here's what was accomplished: " +
      steps
        .map((s) => s.thought)
        .filter(Boolean)
        .join(" → "),
    success: false,
    error: "Max iterations exceeded",
    tokensUsed: totalTokens,
  };
}

/**
 * Execute a simple single-tool call (no orchestration)
 *
 * @param userId - User ID
 * @param toolName - Name of the tool to execute
 * @param params - Tool parameters
 * @returns Tool result
 */
export async function executeSingleTool(
  userId: string,
  toolName: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  return executeTool(toolName, params, userId);
}

/**
 * Get available tools for an agent
 */
export function getAvailableTools(): string[] {
  return Object.keys(TOOLS);
}
