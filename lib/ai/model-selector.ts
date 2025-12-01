/**
 * Model Selection Strategy for AI Agents
 *
 * Uses Haiku for simple, high-frequency tasks (cost-effective)
 * Uses Sonnet for complex reasoning tasks (higher quality)
 *
 * Estimated monthly cost with this strategy: $6-8 (well under $30 budget)
 *
 * MODEL RESILIENCE: All model IDs are centralized here.
 * When Anthropic sunsets a model, update ONLY the two constants below.
 * Override via env vars: ANTHROPIC_SONNET_MODEL, ANTHROPIC_HAIKU_MODEL
 */

// ─── Single source of truth for model IDs ────────────────────────────────
// Update these when models are deprecated/sunsetted
export const SONNET_MODEL = (process.env.ANTHROPIC_SONNET_MODEL || "claude-sonnet-4-20250514") as ModelId;
export const HAIKU_MODEL = (process.env.ANTHROPIC_HAIKU_MODEL || "claude-3-haiku-20240307") as ModelId;

export type TaskType =
  | "mood-inference"
  | "task-time-estimate"
  | "quick-start"
  | "simple-chat"
  | "energy-classification"
  | "daily-insight"
  | "weekly-review"
  | "research-synthesis"
  | "meeting-prep"
  | "therapy-reflection"
  | "coaching-session"
  | "pattern-analysis"
  | "multi-step-workflow";

export type ModelId = string;

export type TaskComplexity = "simple" | "moderate" | "complex";

export interface ModelConfig {
  taskType: TaskType;
  complexity: TaskComplexity;
  model: ModelId;
  maxInputTokens: number;
  maxOutputTokens: number;
  cacheable: boolean;
  cacheTtlMinutes: number;
}

/**
 * Pricing per 1M tokens (December 2025)
 */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  [SONNET_MODEL]: { input: 3.0, output: 15.0 },
  [HAIKU_MODEL]: { input: 0.25, output: 1.25 },
};

/**
 * Task-to-model mapping with token budgets
 */
export const MODEL_CONFIGS: Record<TaskType, ModelConfig> = {
  // =============================================================================
  // HAIKU TASKS (simple, high-frequency, cost-effective)
  // =============================================================================

  "mood-inference": {
    taskType: "mood-inference",
    complexity: "simple",
    model: HAIKU_MODEL,
    maxInputTokens: 1500,
    maxOutputTokens: 100,
    cacheable: true,
    cacheTtlMinutes: 1440, // 24 hours
  },

  "task-time-estimate": {
    taskType: "task-time-estimate",
    complexity: "simple",
    model: HAIKU_MODEL,
    maxInputTokens: 800,
    maxOutputTokens: 200,
    cacheable: true,
    cacheTtlMinutes: 720, // 12 hours
  },

  "quick-start": {
    taskType: "quick-start",
    complexity: "simple",
    model: HAIKU_MODEL,
    maxInputTokens: 600,
    maxOutputTokens: 400,
    cacheable: false, // Context-dependent
    cacheTtlMinutes: 0,
  },

  "simple-chat": {
    taskType: "simple-chat",
    complexity: "simple",
    model: HAIKU_MODEL,
    maxInputTokens: 1000,
    maxOutputTokens: 600,
    cacheable: false,
    cacheTtlMinutes: 0,
  },

  "energy-classification": {
    taskType: "energy-classification",
    complexity: "simple",
    model: HAIKU_MODEL,
    maxInputTokens: 1000,
    maxOutputTokens: 100,
    cacheable: true,
    cacheTtlMinutes: 360, // 6 hours
  },

  // =============================================================================
  // SONNET TASKS (complex reasoning required)
  // =============================================================================

  "daily-insight": {
    taskType: "daily-insight",
    complexity: "moderate",
    model: SONNET_MODEL,
    maxInputTokens: 4000,
    maxOutputTokens: 1000,
    cacheable: true,
    cacheTtlMinutes: 1440, // 24 hours
  },

  "weekly-review": {
    taskType: "weekly-review",
    complexity: "complex",
    model: SONNET_MODEL,
    maxInputTokens: 8000,
    maxOutputTokens: 3000,
    cacheable: true,
    cacheTtlMinutes: 10080, // 7 days
  },

  "research-synthesis": {
    taskType: "research-synthesis",
    complexity: "complex",
    model: SONNET_MODEL,
    maxInputTokens: 6000,
    maxOutputTokens: 2500,
    cacheable: false,
    cacheTtlMinutes: 0,
  },

  "meeting-prep": {
    taskType: "meeting-prep",
    complexity: "complex",
    model: SONNET_MODEL,
    maxInputTokens: 4000,
    maxOutputTokens: 2000,
    cacheable: false,
    cacheTtlMinutes: 0,
  },

  "therapy-reflection": {
    taskType: "therapy-reflection",
    complexity: "complex",
    model: SONNET_MODEL,
    maxInputTokens: 3000,
    maxOutputTokens: 1500,
    cacheable: false,
    cacheTtlMinutes: 0,
  },

  "coaching-session": {
    taskType: "coaching-session",
    complexity: "complex",
    model: SONNET_MODEL,
    maxInputTokens: 3000,
    maxOutputTokens: 1200,
    cacheable: false,
    cacheTtlMinutes: 0,
  },

  "pattern-analysis": {
    taskType: "pattern-analysis",
    complexity: "moderate",
    model: SONNET_MODEL,
    maxInputTokens: 5000,
    maxOutputTokens: 1500,
    cacheable: true,
    cacheTtlMinutes: 1440, // 24 hours
  },

  "multi-step-workflow": {
    taskType: "multi-step-workflow",
    complexity: "complex",
    model: SONNET_MODEL,
    maxInputTokens: 6000,
    maxOutputTokens: 2000,
    cacheable: false,
    cacheTtlMinutes: 0,
  },
};

/**
 * Message count thresholds for escalation from Haiku to Sonnet
 */
const ESCALATION_THRESHOLDS = {
  "simple-chat": 4, // Upgrade to Sonnet after 4 messages (indicates complex conversation)
};

/**
 * Select the appropriate model configuration for a task
 *
 * @param taskType - The type of task being performed
 * @param messageCount - Optional message count for escalation logic
 * @returns Model configuration including model ID and token limits
 */
export function selectModel(
  taskType: TaskType,
  messageCount?: number
): ModelConfig {
  const baseConfig = MODEL_CONFIGS[taskType] || MODEL_CONFIGS["simple-chat"];

  // Check for escalation based on message count
  if (messageCount !== undefined) {
    const threshold =
      ESCALATION_THRESHOLDS[taskType as keyof typeof ESCALATION_THRESHOLDS];

    if (threshold && messageCount > threshold) {
      // Escalate to Sonnet for longer conversations
      return {
        ...baseConfig,
        model: SONNET_MODEL,
        complexity: "moderate",
        maxInputTokens: 3000, // Increase budget for complex conversation
        maxOutputTokens: 1200,
      };
    }
  }

  return baseConfig;
}

/**
 * Infer task type from agent type and context
 *
 * @param agentType - The agent handling the request
 * @param contextType - The context/screen where the request originated
 * @param messageCount - Number of messages in conversation
 * @returns Inferred task type
 */
export function inferTaskType(
  agentType: string,
  contextType?: string,
  messageCount?: number
): TaskType {
  // Pattern Analyst tasks
  if (agentType === "pattern-analyst") {
    if (contextType === "weekly-review") return "weekly-review";
    if (contextType === "daily-insight") return "daily-insight";
    return "pattern-analysis";
  }

  // Therapist tasks
  if (agentType === "therapist") {
    return "therapy-reflection";
  }

  // Research Assistant tasks
  if (agentType === "research-assistant") {
    if (contextType === "multi-step") return "multi-step-workflow";
    if (contextType === "synthesis") return "research-synthesis";
    // Default to simple chat for basic queries
    return messageCount && messageCount > 4 ? "research-synthesis" : "simple-chat";
  }

  // Executive Coach tasks
  if (agentType === "executive-coach") {
    if (contextType === "meeting") return "meeting-prep";
    if (contextType === "focus" || contextType === "quick-start") return "quick-start";
    // Default to coaching session for ongoing conversations
    return messageCount && messageCount > 2 ? "coaching-session" : "simple-chat";
  }

  // Default
  return "simple-chat";
}

/**
 * Calculate the cost of a request
 *
 * @param model - The model used
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in USD
 */
export function calculateCost(
  model: ModelId,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = MODEL_PRICING[model];

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return { inputCost, outputCost, totalCost };
}

/**
 * Estimate tokens from text (rough approximation: ~4 chars per token for English)
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Check if a task type is cacheable
 *
 * @param taskType - The task type to check
 * @returns Whether the task type supports caching
 */
export function isCacheable(taskType: TaskType): boolean {
  return MODEL_CONFIGS[taskType]?.cacheable ?? false;
}

/**
 * Get cache TTL for a task type
 *
 * @param taskType - The task type
 * @returns Cache TTL in minutes, or 0 if not cacheable
 */
export function getCacheTtl(taskType: TaskType): number {
  return MODEL_CONFIGS[taskType]?.cacheTtlMinutes ?? 0;
}

/**
 * Compressed system prompts for Haiku (reduced token usage)
 * These are ~40% shorter than full prompts but retain core instructions
 */
export const COMPRESSED_PROMPTS = {
  "executive-coach": `Exec coach, 25+ yrs exp. Direct+warm, no fluff.
PRINCIPLES: scaffolding>willpower, done>perfect, energy>time.
TASKS: Break down, add time buffer, ID blockers, suggest accountability.
MEETINGS: Clarify role/goals, ID stress points, prep 3 points, exit strategy.
Concise, actionable. One question at a time.`,

  "research-assistant": `Fast research assistant. Lead with answer, then context.
Bullets for scanning. Cite sources. "I don't know" when uncertain.
Summarize: main point first, 3-5 key points, action items, deadlines.`,

  therapist: `DBT/ACT therapist. Reflect before advise.
DBT: TIPP, ACCEPTS, Wise Mind. ACT: defusion, values, committed action.
Warm but concise. One reflection at a time. Normalize the struggle.`,

  "pattern-analyst": `Pattern analysis engine. Analyze mood, energy, productivity patterns.
Output structured JSON with: mood_label, energy_level, themes, insights.
Objective, data-driven. Surface patterns without judgment.`,
};

/**
 * Get the appropriate system prompt based on model
 *
 * @param agentType - The agent type
 * @param model - The model being used
 * @param fullPrompt - The full system prompt
 * @returns The appropriate prompt (compressed for Haiku, full for Sonnet)
 */
export function getOptimizedPrompt(
  agentType: string,
  model: ModelId,
  fullPrompt: string
): string {
  // Use compressed prompts for Haiku to save tokens
  if (model === HAIKU_MODEL) {
    const compressed =
      COMPRESSED_PROMPTS[agentType as keyof typeof COMPRESSED_PROMPTS];
    if (compressed) {
      return compressed;
    }
  }

  return fullPrompt;
}
