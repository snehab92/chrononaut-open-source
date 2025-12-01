/**
 * AI Response Caching Layer
 *
 * Caches AI responses to reduce API costs for repetitive or similar requests.
 * Uses database-backed caching with TTL and automatic cleanup.
 */

import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { getCacheTtl, isCacheable, type TaskType } from "../model-selector";

// =============================================================================
// CACHE KEY GENERATION
// =============================================================================

/**
 * Generate a hash from context for cache key generation
 *
 * @param context - The context to hash (string or object)
 * @returns First 32 characters of SHA256 hash
 */
export function hashContext(context: string | object): string {
  const data = typeof context === "string" ? context : JSON.stringify(context);
  return createHash("sha256").update(data).digest("hex").substring(0, 32);
}

/**
 * Generate a complete cache key
 *
 * @param taskType - The type of task
 * @param contextHash - The hashed context
 * @param dateKey - Date string for cache segmentation
 * @returns Complete cache key
 */
export function generateCacheKey(
  taskType: string,
  contextHash: string,
  dateKey: string
): string {
  return `${taskType}:${contextHash}:${dateKey}`;
}

// =============================================================================
// CACHE OPERATIONS
// =============================================================================

export interface CachedResponse {
  cached: boolean;
  response?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Get a cached response if available and not expired
 *
 * @param userId - User ID
 * @param taskType - Task type for cache lookup
 * @param context - The context that was used for the request
 * @returns Cached response if found, otherwise { cached: false }
 */
export async function getCachedResponse(
  userId: string,
  taskType: TaskType,
  context: string | object
): Promise<CachedResponse> {
  // Check if task type is cacheable
  if (!isCacheable(taskType)) {
    return { cached: false };
  }

  const supabase = await createClient();
  const contextHash = hashContext(context);
  const dateKey = new Date().toISOString().split("T")[0];
  const cacheKey = generateCacheKey(taskType, contextHash, dateKey);

  const { data, error } = await supabase
    .from("ai_response_cache")
    .select("*")
    .eq("user_id", userId)
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) {
    return { cached: false };
  }

  // Update hit count and last accessed (fire and forget)
  supabase
    .from("ai_response_cache")
    .update({
      hit_count: data.hit_count + 1,
      last_accessed: new Date().toISOString(),
    })
    .eq("id", data.id)
    .then(() => {});

  return {
    cached: true,
    response: data.response_content,
    model: data.model_used,
    inputTokens: data.input_tokens,
    outputTokens: data.output_tokens,
  };
}

/**
 * Store a response in the cache
 *
 * @param userId - User ID
 * @param taskType - Task type for cache lookup
 * @param context - The context that was used for the request
 * @param response - The response to cache
 * @param modelUsed - The model that generated the response
 * @param inputTokens - Number of input tokens used
 * @param outputTokens - Number of output tokens used
 */
export async function setCacheResponse(
  userId: string,
  taskType: TaskType,
  context: string | object,
  response: string,
  modelUsed: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  // Check if task type is cacheable
  const ttlMinutes = getCacheTtl(taskType);
  if (ttlMinutes === 0) {
    return;
  }

  const supabase = await createClient();
  const contextHash = hashContext(context);
  const dateKey = new Date().toISOString().split("T")[0];
  const cacheKey = generateCacheKey(taskType, contextHash, dateKey);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const { error } = await supabase.from("ai_response_cache").upsert(
    {
      user_id: userId,
      cache_key: cacheKey,
      task_type: taskType,
      context_hash: contextHash,
      response_content: response,
      model_used: modelUsed,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      expires_at: expiresAt.toISOString(),
      hit_count: 0,
      last_accessed: new Date().toISOString(),
    },
    {
      onConflict: "user_id,cache_key",
    }
  );

  if (error) {
    console.error("Failed to cache response:", error);
  }
}

/**
 * Invalidate cache entries matching a pattern
 *
 * @param userId - User ID
 * @param taskType - Optional task type to invalidate (all if not provided)
 */
export async function invalidateCache(
  userId: string,
  taskType?: TaskType
): Promise<void> {
  const supabase = await createClient();

  let query = supabase.from("ai_response_cache").delete().eq("user_id", userId);

  if (taskType) {
    query = query.eq("task_type", taskType);
  }

  const { error } = await query;

  if (error) {
    console.error("Failed to invalidate cache:", error);
  }
}

// =============================================================================
// CONTEXT SUMMARY CACHING
// =============================================================================

export interface ContextSummaryCache {
  id: string;
  summaryContent: string;
  sourceDataHash: string;
  expiresAt: Date;
}

/**
 * Get a cached context summary
 *
 * @param userId - User ID
 * @param contextType - Type of context (e.g., 'journal_week', 'health_week')
 * @param periodEnd - End date of the period
 * @returns Cached summary if found and valid, null otherwise
 */
export async function getCachedContextSummary(
  userId: string,
  contextType: string,
  periodEnd: Date
): Promise<ContextSummaryCache | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("context_summaries")
    .select("*")
    .eq("user_id", userId)
    .eq("context_type", contextType)
    .eq("period_end", periodEnd.toISOString().split("T")[0])
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    summaryContent: data.summary_content,
    sourceDataHash: data.source_data_hash,
    expiresAt: new Date(data.expires_at),
  };
}

/**
 * Store a context summary in the cache
 *
 * @param userId - User ID
 * @param contextType - Type of context
 * @param periodStart - Start date of the period
 * @param periodEnd - End date of the period
 * @param summaryContent - The summary content
 * @param sourceDataHash - Hash of the source data (for invalidation)
 * @param ttlMinutes - Time to live in minutes
 */
export async function setCachedContextSummary(
  userId: string,
  contextType: string,
  periodStart: Date,
  periodEnd: Date,
  summaryContent: string,
  sourceDataHash: string,
  ttlMinutes: number
): Promise<void> {
  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const { error } = await supabase.from("context_summaries").upsert(
    {
      user_id: userId,
      context_type: contextType,
      period_start: periodStart.toISOString().split("T")[0],
      period_end: periodEnd.toISOString().split("T")[0],
      summary_content: summaryContent,
      source_data_hash: sourceDataHash,
      expires_at: expiresAt.toISOString(),
    },
    {
      onConflict: "user_id,context_type,period_start,period_end",
    }
  );

  if (error) {
    console.error("Failed to cache context summary:", error);
  }
}

// =============================================================================
// COMPUTED PATTERNS CACHING
// =============================================================================

export interface ComputedPattern {
  patternType: string;
  patternData: Record<string, unknown>;
  computationDate: Date;
}

/**
 * Get pre-computed patterns for a user
 *
 * @param userId - User ID
 * @param patternType - Type of pattern (e.g., 'energy_forecast', 'mood_trends')
 * @param date - Date to get patterns for (defaults to today)
 * @returns Computed patterns if found, null otherwise
 */
export async function getComputedPatterns(
  userId: string,
  patternType: string,
  date?: Date
): Promise<ComputedPattern | null> {
  const supabase = await createClient();
  const targetDate = (date || new Date()).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("computed_patterns")
    .select("*")
    .eq("user_id", userId)
    .eq("pattern_type", patternType)
    .eq("computation_date", targetDate)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    patternType: data.pattern_type,
    patternData: data.pattern_data,
    computationDate: new Date(data.computation_date),
  };
}

/**
 * Store computed patterns
 *
 * @param userId - User ID
 * @param patternType - Type of pattern
 * @param patternData - The computed pattern data
 * @param sourceDataHash - Hash of source data (for invalidation)
 * @param date - Date for the computation (defaults to today)
 */
export async function setComputedPatterns(
  userId: string,
  patternType: string,
  patternData: Record<string, unknown>,
  sourceDataHash?: string,
  date?: Date
): Promise<void> {
  const supabase = await createClient();
  const computationDate = (date || new Date()).toISOString().split("T")[0];

  const { error } = await supabase.from("computed_patterns").upsert(
    {
      user_id: userId,
      pattern_type: patternType,
      computation_date: computationDate,
      pattern_data: patternData,
      source_data_hash: sourceDataHash,
    },
    {
      onConflict: "user_id,pattern_type,computation_date",
    }
  );

  if (error) {
    console.error("Failed to store computed patterns:", error);
  }
}

// =============================================================================
// IN-MEMORY CACHE (for short-lived data within a request)
// =============================================================================

/**
 * Simple in-memory cache for data that doesn't need persistence
 * Useful for caching within a single request lifecycle
 */
class InMemoryCache {
  private cache: Map<string, { data: unknown; expiresAt: number }> = new Map();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cleanup expired entries
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance for request-scoped caching
export const memoryCache = new InMemoryCache();
