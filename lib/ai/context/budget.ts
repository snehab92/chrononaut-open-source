/**
 * Token Budget Management for AI Agents
 *
 * Handles token counting, budget tracking, usage recording,
 * and cost calculations for staying within the $30/month budget.
 */

import { createClient } from "@/lib/supabase/server";
import { ModelId, MODEL_PRICING, calculateCost } from "../model-selector";
import type { AgentType } from "../agents";

// =============================================================================
// BUDGET CONSTANTS
// =============================================================================

export const MONTHLY_BUDGET_USD = 30.0;

export const BUDGET_THRESHOLDS = {
  warning: 0.7, // 70% of budget
  critical: 0.9, // 90% of budget
  exceeded: 1.0, // 100% of budget
};

/**
 * Per-agent daily token budgets (to prevent runaway costs)
 */
export const AGENT_DAILY_BUDGETS: Record<AgentType, number> = {
  "pattern-analyst": 50000,
  "research-assistant": 80000,
  "executive-coach": 100000,
  therapist: 40000,
};

// =============================================================================
// TOKEN ESTIMATION
// =============================================================================

/**
 * Estimate tokens from text
 * Approximation: ~4 characters per token for English text
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string | null | undefined): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens for a message array
 *
 * @param messages - Array of messages
 * @returns Total estimated tokens
 */
export function estimateMessagesTokens(
  messages: Array<{ role: string; content: string }>
): number {
  return messages.reduce((total, msg) => {
    // Add overhead for role prefix
    return total + estimateTokens(msg.content) + 4;
  }, 0);
}

/**
 * Estimate tokens for a context object
 *
 * @param context - Any object to estimate tokens for
 * @returns Estimated token count
 */
export function estimateContextTokens(context: unknown): number {
  const serialized = JSON.stringify(context);
  return estimateTokens(serialized);
}

// =============================================================================
// USAGE TRACKING
// =============================================================================

export interface UsageRecord {
  userId: string;
  agentType: AgentType;
  taskType: string;
  model: ModelId;
  inputTokens: number;
  outputTokens: number;
  cached: boolean;
  conversationId?: string;
}

/**
 * Record token usage for a request
 * Updates both detailed log and daily aggregates
 *
 * @param record - Usage record to save
 */
export async function trackTokenUsage(record: UsageRecord): Promise<void> {
  const supabase = await createClient();

  const cost = calculateCost(record.model, record.inputTokens, record.outputTokens);

  // Insert detailed usage record
  const { error: usageError } = await supabase.from("token_usage").insert({
    user_id: record.userId,
    agent_type: record.agentType,
    task_type: record.taskType,
    model_used: record.model,
    conversation_id: record.conversationId,
    input_tokens: record.inputTokens,
    output_tokens: record.outputTokens,
    cached_response: record.cached,
    input_cost_usd: cost.inputCost,
    output_cost_usd: cost.outputCost,
    total_cost_usd: cost.totalCost,
  });

  if (usageError) {
    console.error("Failed to track token usage:", usageError);
  }

  // Update daily aggregates via stored procedure
  const today = new Date().toISOString().split("T")[0];
  const { error: dailyError } = await supabase.rpc("update_daily_usage", {
    p_user_id: record.userId,
    p_date: today,
    p_agent_type: record.agentType,
    p_input_tokens: record.inputTokens,
    p_output_tokens: record.outputTokens,
    p_cost: cost.totalCost,
    p_cached: record.cached,
  });

  if (dailyError) {
    console.error("Failed to update daily usage:", dailyError);
  }
}

// =============================================================================
// USAGE QUERIES
// =============================================================================

export interface UsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  cacheHits: number;
  totalRequests: number;
  cacheHitRate: number;
  byAgent: Record<AgentType, number>;
  daysRemaining: number;
  projectedMonthlySpend: number;
}

/**
 * Get usage summary for current month
 *
 * @param userId - User ID to get usage for
 * @returns Usage summary
 */
export async function getMonthlyUsage(userId: string): Promise<UsageSummary> {
  const supabase = await createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("token_usage_daily")
    .select("*")
    .eq("user_id", userId)
    .gte("usage_date", startOfMonth.toISOString().split("T")[0]);

  if (error) {
    console.error("Failed to get monthly usage:", error);
    return getEmptyUsageSummary();
  }

  // Aggregate the data
  const summary = (data || []).reduce(
    (acc, day) => {
      acc.totalInputTokens += day.total_input_tokens || 0;
      acc.totalOutputTokens += day.total_output_tokens || 0;
      acc.totalCost += parseFloat(day.total_cost_usd) || 0;
      acc.cacheHits += day.cache_hits || 0;
      acc.totalRequests += day.total_requests || 0;

      // Agent breakdown
      acc.byAgent["pattern-analyst"] +=
        (day.pattern_analyst_input_tokens || 0) +
        (day.pattern_analyst_output_tokens || 0);
      acc.byAgent["research-assistant"] +=
        (day.research_assistant_input_tokens || 0) +
        (day.research_assistant_output_tokens || 0);
      acc.byAgent["executive-coach"] +=
        (day.executive_coach_input_tokens || 0) +
        (day.executive_coach_output_tokens || 0);
      acc.byAgent["therapist"] +=
        (day.therapist_input_tokens || 0) + (day.therapist_output_tokens || 0);

      return acc;
    },
    {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      cacheHits: 0,
      totalRequests: 0,
      byAgent: {
        "pattern-analyst": 0,
        "research-assistant": 0,
        "executive-coach": 0,
        therapist: 0,
      },
    } as Omit<UsageSummary, "cacheHitRate" | "daysRemaining" | "projectedMonthlySpend">
  );

  // Calculate derived metrics
  const cacheHitRate =
    summary.totalRequests > 0
      ? (summary.cacheHits / summary.totalRequests) * 100
      : 0;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  const dailyAverage = dayOfMonth > 0 ? summary.totalCost / dayOfMonth : 0;
  const projectedMonthlySpend = dailyAverage * daysInMonth;

  return {
    ...summary,
    cacheHitRate,
    daysRemaining,
    projectedMonthlySpend,
  };
}

function getEmptyUsageSummary(): UsageSummary {
  return {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    cacheHits: 0,
    totalRequests: 0,
    cacheHitRate: 0,
    byAgent: {
      "pattern-analyst": 0,
      "research-assistant": 0,
      "executive-coach": 0,
      therapist: 0,
    },
    daysRemaining: 30,
    projectedMonthlySpend: 0,
  };
}

// =============================================================================
// BUDGET ALERTS
// =============================================================================

export interface BudgetAlert {
  type: "warning" | "critical" | "exceeded";
  message: string;
  currentUsage: number;
  budget: number;
  percentUsed: number;
}

/**
 * Check budget status and return alert if needed
 *
 * @param userId - User ID to check
 * @returns Budget alert if thresholds are exceeded, null otherwise
 */
export async function checkBudgetStatus(
  userId: string
): Promise<BudgetAlert | null> {
  const usage = await getMonthlyUsage(userId);
  const percentUsed = usage.totalCost / MONTHLY_BUDGET_USD;

  if (percentUsed >= BUDGET_THRESHOLDS.exceeded) {
    return {
      type: "exceeded",
      message: "Monthly AI budget exceeded. AI features may be limited.",
      currentUsage: usage.totalCost,
      budget: MONTHLY_BUDGET_USD,
      percentUsed: percentUsed * 100,
    };
  }

  if (percentUsed >= BUDGET_THRESHOLDS.critical) {
    return {
      type: "critical",
      message: `Warning: ${Math.round(percentUsed * 100)}% of monthly AI budget used.`,
      currentUsage: usage.totalCost,
      budget: MONTHLY_BUDGET_USD,
      percentUsed: percentUsed * 100,
    };
  }

  if (percentUsed >= BUDGET_THRESHOLDS.warning) {
    return {
      type: "warning",
      message: `${Math.round(percentUsed * 100)}% of monthly AI budget used.`,
      currentUsage: usage.totalCost,
      budget: MONTHLY_BUDGET_USD,
      percentUsed: percentUsed * 100,
    };
  }

  return null;
}

/**
 * Check if user has exceeded budget
 *
 * @param userId - User ID to check
 * @returns true if budget exceeded
 */
export async function isBudgetExceeded(userId: string): Promise<boolean> {
  const alert = await checkBudgetStatus(userId);
  return alert?.type === "exceeded";
}

// =============================================================================
// CONTEXT PRUNING
// =============================================================================

export interface ContextItem {
  type: "current_task" | "recent_messages" | "patterns" | "history" | "reference";
  content: string;
  priority: number;
}

/**
 * Priority order for context pruning
 * Lower number = higher priority (keep first)
 */
const CONTEXT_PRIORITY: Record<ContextItem["type"], number> = {
  current_task: 1,
  recent_messages: 2,
  patterns: 3,
  history: 4,
  reference: 5,
};

/**
 * Prune context to fit within token budget
 * Keeps highest priority items first
 *
 * @param items - Context items to prune
 * @param maxTokens - Maximum tokens allowed
 * @returns Pruned context items
 */
export function pruneContext(
  items: ContextItem[],
  maxTokens: number
): ContextItem[] {
  // Sort by priority (lower number = higher priority)
  const sorted = [...items].sort(
    (a, b) => CONTEXT_PRIORITY[a.type] - CONTEXT_PRIORITY[b.type]
  );

  const result: ContextItem[] = [];
  let totalTokens = 0;

  for (const item of sorted) {
    const itemTokens = estimateTokens(item.content);

    if (totalTokens + itemTokens <= maxTokens) {
      result.push(item);
      totalTokens += itemTokens;
    } else {
      // Try to truncate if it's a low-priority item
      const remainingBudget = maxTokens - totalTokens;
      if (remainingBudget > 100) {
        // Worth including a truncated version
        const truncatedChars = remainingBudget * 4; // Reverse of token estimation
        result.push({
          ...item,
          content: item.content.slice(0, truncatedChars) + "...",
        });
        break;
      }
    }
  }

  return result;
}

/**
 * Format context items into a string for the prompt
 *
 * @param items - Context items to format
 * @returns Formatted context string
 */
export function formatContext(items: ContextItem[]): string {
  return items.map((item) => `## ${item.type}\n${item.content}`).join("\n\n");
}
