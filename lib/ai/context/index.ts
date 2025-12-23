/**
 * AI Context Architecture
 *
 * Exports all context-related utilities for building agent context.
 */

// Types
export * from "./types";

// Budget management
export {
  MONTHLY_BUDGET_USD,
  BUDGET_THRESHOLDS,
  AGENT_DAILY_BUDGETS,
  estimateTokens,
  estimateMessagesTokens,
  estimateContextTokens,
  trackTokenUsage,
  getMonthlyUsage,
  checkBudgetStatus,
  isBudgetExceeded,
  pruneContext,
  formatContext,
  type UsageRecord,
  type UsageSummary,
  type BudgetAlert,
  type ContextItem,
} from "./budget";

// Caching
export {
  hashContext,
  generateCacheKey,
  getCachedResponse,
  setCacheResponse,
  invalidateCache,
  getCachedContextSummary,
  setCachedContextSummary,
  getComputedPatterns,
  setComputedPatterns,
  memoryCache,
  type CachedResponse,
  type ContextSummaryCache,
  type ComputedPattern,
} from "./cache";

// Builders
export {
  BaseContextBuilder,
  PatternAnalystBuilder,
  ResearchAssistantBuilder,
  ExecutiveCoachBuilder,
  TherapistBuilder,
  createContextBuilder,
} from "./builders/base-builder";
