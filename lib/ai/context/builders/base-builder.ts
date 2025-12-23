/**
 * Base Context Builder for AI Agents
 *
 * Provides shared functionality for building context across all agents.
 * Each agent type extends this base class with specific configurations.
 */

import { createClient } from "@/lib/supabase/server";
import { getAgent, type AgentType } from "../../agents";
import { estimateTokens } from "../budget";
import { getCachedContextSummary, getComputedPatterns, memoryCache } from "../cache";
import {
  type AgentContextConfig,
  type BuiltContext,
  type Message,
  type StaticContext,
  type PersistentContext,
  type ConversationalContext,
  type LiveContext,
  type ReferenceContext,
  type AboutMeFile,
  type SavedMemory,
  type TaskSummary,
  type CalendarEventSummary,
  getContextConfig,
} from "../types";

// =============================================================================
// BASE CONTEXT BUILDER
// =============================================================================

export abstract class BaseContextBuilder {
  protected config: AgentContextConfig;
  protected agentType: AgentType;

  constructor(agentType: AgentType) {
    this.agentType = agentType;
    this.config = getContextConfig(agentType);
  }

  /**
   * Build complete context for an AI request
   *
   * @param userId - User ID to build context for
   * @param conversationId - Optional conversation ID for history
   * @param currentMessages - Current messages in the conversation
   * @param additionalContext - Optional additional context string
   * @returns Built context ready for API call
   */
  async buildContext(
    userId: string,
    conversationId?: string,
    currentMessages: Message[] = [],
    additionalContext?: string
  ): Promise<BuiltContext> {
    const layers: BuiltContext["layers"] = {
      static: await this.buildStaticLayer(userId),
    };

    // Build enabled layers in parallel
    const layerPromises: Promise<void>[] = [];

    if (this.config.layers.persistent.enabled) {
      layerPromises.push(
        this.buildPersistentLayer(userId).then((l) => {
          layers.persistent = l;
        })
      );
    }

    if (this.config.layers.conversational.enabled && conversationId) {
      layerPromises.push(
        this.buildConversationalLayer(userId, conversationId, currentMessages).then(
          (l) => {
            layers.conversational = l;
          }
        )
      );
    }

    if (this.config.layers.live.enabled) {
      layerPromises.push(
        this.buildLiveLayer(userId).then((l) => {
          layers.live = l;
        })
      );
    }

    if (this.config.layers.reference.enabled) {
      layerPromises.push(
        this.buildReferenceLayer(userId, currentMessages).then((l) => {
          layers.reference = l;
        })
      );
    }

    await Promise.all(layerPromises);

    // Format the complete prompt
    const formattedPrompt = this.formatPrompt(layers, additionalContext);
    const estimatedInputTokens = estimateTokens(formattedPrompt);

    // Determine complexity based on context richness
    const complexity = this.determineComplexity(layers, currentMessages.length);

    return {
      formattedPrompt,
      conversationalMessages: currentMessages,
      estimatedInputTokens,
      complexity,
      layers,
    };
  }

  // =============================================================================
  // LAYER BUILDERS
  // =============================================================================

  /**
   * Build static context layer (agent prompt + custom instructions)
   */
  protected async buildStaticLayer(userId: string): Promise<StaticContext> {
    const cacheKey = `static:${userId}:${this.agentType}`;
    const cached = memoryCache.get<StaticContext>(cacheKey);
    if (cached) return cached;

    const supabase = await createClient();
    const agent = getAgent(this.agentType);

    // Fetch custom instructions and core values in parallel
    const [instructionsResult, profileResult] = await Promise.all([
      supabase
        .from("agent_instructions")
        .select("instructions")
        .eq("user_id", userId)
        .eq("agent_type", this.agentType)
        .eq("is_active", true)
        .single(),
      supabase.from("profiles").select("core_values").eq("id", userId).single(),
    ]);

    const context: StaticContext = {
      systemPrompt: agent.systemPrompt,
      customInstructions: instructionsResult.data?.instructions || "",
      coreValues: profileResult.data?.core_values || [],
    };

    // Cache for 1 hour (static context changes rarely)
    memoryCache.set(cacheKey, context, 3600);

    return context;
  }

  /**
   * Build persistent context layer (about me files + saved memories)
   */
  protected async buildPersistentLayer(userId: string): Promise<PersistentContext> {
    const supabase = await createClient();
    const sources = this.config.layers.persistent.sources || [];

    const results: PersistentContext = {
      aboutMeFiles: [],
      savedMemories: [],
      assessmentHighlights: [],
    };

    const promises: Promise<void>[] = [];

    if (sources.includes("about_me_files")) {
      promises.push(
        (async () => {
          const { data } = await supabase
            .from("about_me_files")
            .select("id, filename, category, description, extracted_content, agent_access")
            .eq("user_id", userId)
            .contains("agent_access", [this.agentType]);
          results.aboutMeFiles = (data || []).map((f: Record<string, unknown>) => ({
            id: f.id as string,
            filename: f.filename as string,
            category: f.category as string,
            description: f.description as string | undefined,
            extractedContent: f.extracted_content as string | undefined,
            agentAccess: f.agent_access as AgentType[],
          }));
        })()
      );
    }

    if (sources.includes("saved_memories")) {
      promises.push(
        (async () => {
          const { data } = await supabase
            .from("ai_messages")
            .select("id, content, created_at")
            .eq("saved_to_memory", true)
            .order("created_at", { ascending: false })
            .limit(10);
          results.savedMemories = (data || []).map((m: Record<string, unknown>) => ({
            id: m.id as string,
            content: m.content as string,
            agentType: this.agentType,
            importance: 1,
            createdAt: new Date(m.created_at as string),
          }));
        })()
      );
    }

    if (sources.includes("assessments")) {
      promises.push(
        (async () => {
          const { data } = await supabase
            .from("strength_assessments")
            .select("strength_name, quadrant, rank_in_quadrant, assessment_date")
            .eq("user_id", userId)
            .order("assessment_date", { ascending: false })
            .limit(20);
          // Group by assessment date and summarize
          if (data && data.length > 0) {
            const latestDate = (data[0] as Record<string, unknown>).assessment_date;
            const latestAssessment = data.filter(
              (a: Record<string, unknown>) => a.assessment_date === latestDate
            );
            results.assessmentHighlights = [
              {
                type: "strengths",
                score: latestAssessment.length,
                date: new Date(latestDate as string),
                summary: `Top strengths: ${latestAssessment
                  .filter((a: Record<string, unknown>) => a.quadrant === "Realized" && (a.rank_in_quadrant as number) <= 3)
                  .map((a: Record<string, unknown>) => a.strength_name)
                  .slice(0, 3)
                  .join(", ")}`,
              },
            ];
          }
        })()
      );
    }

    await Promise.all(promises);

    return results;
  }

  /**
   * Build conversational context layer (message history + summaries)
   */
  protected async buildConversationalLayer(
    userId: string,
    conversationId: string,
    currentMessages: Message[]
  ): Promise<ConversationalContext> {
    const maxMessages = this.config.layers.conversational.maxMessages || 10;

    // If current messages are within limit, use them directly
    if (currentMessages.length <= maxMessages) {
      return {
        currentMessages,
        conversationSummary: undefined,
      };
    }

    // Otherwise, summarize older messages
    const recentMessages = currentMessages.slice(-maxMessages);
    const olderMessages = currentMessages.slice(0, -maxMessages);

    // Check for cached summary
    const periodEnd = new Date();
    const cached = await getCachedContextSummary(
      userId,
      `conversation:${conversationId}`,
      periodEnd
    );

    if (cached) {
      return {
        currentMessages: recentMessages,
        conversationSummary: cached.summaryContent,
      };
    }

    // Generate a simple summary (no AI call to save tokens)
    const summary = this.summarizeMessages(olderMessages);

    return {
      currentMessages: recentMessages,
      conversationSummary: summary,
    };
  }

  /**
   * Build live context layer (real-time data from integrations)
   */
  protected async buildLiveLayer(userId: string): Promise<LiveContext> {
    const supabase = await createClient();
    const sources = this.config.layers.live.sources || [];
    const context: LiveContext = {};

    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const promises: Promise<void>[] = [];

    // Health data
    if (sources.includes("recovery_score") || sources.includes("health_trends")) {
      promises.push(
        (async () => {
          const { data } = await supabase
            .from("health_metrics")
            .select("recovery_score, sleep_hours, metric_date")
            .eq("user_id", userId)
            .gte("metric_date", weekAgo)
            .order("metric_date", { ascending: false });
          if (data && data.length > 0) {
            const d0 = data[0] as Record<string, unknown>;
            context.todayRecovery = d0.recovery_score as number;
            context.sleepHours = d0.sleep_hours as number;

            // Calculate trend
            if (data.length >= 3) {
              const recent = data.slice(0, 3).map((d: Record<string, unknown>) => (d.recovery_score as number) || 0);
              const older = data.slice(-3).map((d: Record<string, unknown>) => (d.recovery_score as number) || 0);
              const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
              const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
              context.weeklyRecoveryTrend =
                recentAvg > olderAvg + 5 ? "up" : recentAvg < olderAvg - 5 ? "down" : "stable";
            }
          }
        })()
      );
    }

    // Tasks
    if (sources.includes("todays_tasks") || sources.includes("overdue_tasks")) {
      promises.push(
        (async () => {
          const { data } = await supabase
            .from("tasks")
            .select("id, title, priority, due_date, completed, estimated_minutes")
            .eq("user_id", userId)
            .eq("completed", false)
            .order("priority", { ascending: false })
            .limit(20);
          if (data) {
            const tasks = data.map((t: Record<string, unknown>) => ({
              id: t.id as string,
              title: t.title as string,
              priority: t.priority as number,
              dueDate: t.due_date ? new Date(t.due_date as string) : undefined,
              overdue: t.due_date ? new Date(t.due_date as string) < new Date() : false,
              estimatedMinutes: t.estimated_minutes as number | undefined,
            }));

            if (sources.includes("todays_tasks")) {
              context.todaysTasks = tasks
                .filter((t) => !t.overdue)
                .slice(0, 10) as TaskSummary[];
            }
            if (sources.includes("overdue_tasks")) {
              context.overdueTasks = tasks.filter((t) => t.overdue) as TaskSummary[];
            }
          }
        })()
      );
    }

    // Calendar
    if (sources.includes("upcoming_calendar")) {
      promises.push(
        (async () => {
          const { data } = await supabase
            .from("calendar_events")
            .select("id, title, start_time, end_time, attendees, meeting_link")
            .eq("user_id", userId)
            .gte("start_time", new Date().toISOString())
            .order("start_time", { ascending: true })
            .limit(5);
          if (data) {
            context.upcomingEvents = data.map((e: Record<string, unknown>) => ({
              id: e.id as string,
              title: e.title as string,
              startTime: new Date(e.start_time as string),
              endTime: new Date(e.end_time as string),
              attendeeCount: (e.attendees as string[] | null)?.length,
              meetingLink: e.meeting_link as string | undefined,
            }));
            if (data.length > 0) {
              context.nextMeeting = context.upcomingEvents[0];
            }
          }
        })()
      );
    }

    // Focus session
    if (sources.includes("focus_session")) {
      promises.push(
        (async () => {
          const { data } = await supabase
            .from("time_blocks")
            .select("focus_mode, started_at, planned_minutes, task_id")
            .eq("user_id", userId)
            .eq("completed", false)
            .gt("started_at", new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
            .order("started_at", { ascending: false })
            .limit(1);
          if (data && data.length > 0) {
            const d0 = data[0] as Record<string, unknown>;
            context.focusSessionActive = {
              mode: d0.focus_mode as string,
              startedAt: new Date(d0.started_at as string),
              plannedMinutes: d0.planned_minutes as number,
            };
            context.focusMode = d0.focus_mode as string;
          }
        })()
      );
    }

    // Journal
    if (sources.includes("journal_recent") || sources.includes("mood_patterns")) {
      promises.push(
        (async () => {
          const { data } = await supabase
            .from("journal_entries")
            .select("entry_date, mood_label, energy_rating")
            .eq("user_id", userId)
            .gte("entry_date", weekAgo)
            .order("entry_date", { ascending: false });
          if (data && data.length > 0) {
            const d0 = data[0] as Record<string, unknown>;
            context.todayMood = d0.mood_label as string;
            context.todayEnergy = d0.energy_rating as number;
            context.recentMoodLabels = data.map((d: Record<string, unknown>) => d.mood_label as string).filter(Boolean);

            // Calculate energy trend
            if (data.length >= 3) {
              const energies = data.map((d: Record<string, unknown>) => (d.energy_rating as number) || 5);
              const recentAvg = energies.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
              const olderAvg =
                energies.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, energies.length);
              context.weeklyEnergyTrend =
                recentAvg > olderAvg + 1 ? "up" : recentAvg < olderAvg - 1 ? "down" : "stable";
            }
          }
        })()
      );
    }

    await Promise.all(promises);

    return context;
  }

  /**
   * Build reference context layer (notes and documents)
   */
  protected async buildReferenceLayer(
    userId: string,
    messages: Message[]
  ): Promise<ReferenceContext> {
    // Extract keywords from recent messages for relevance
    const keywords = this.extractKeywords(messages);

    const supabase = await createClient();
    const sources = this.config.layers.reference.sources || [];
    const context: ReferenceContext = {
      relevantNotes: [],
      linkedDocuments: [],
    };

    if (sources.includes("notes") && keywords.length > 0) {
      // Search notes by keywords
      const keywordQuery = keywords.map((k) => `title.ilike.%${k}%`).join(",");
      const { data } = await supabase
        .from("notes")
        .select("id, title, content, tags")
        .eq("user_id", userId)
        .or(keywordQuery)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) {
        context.relevantNotes = data.map((n) => ({
          id: n.id,
          title: n.title,
          content: n.content?.slice(0, 500) || "",
          tags: n.tags,
        }));
      }
    }

    return context;
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Format the complete prompt from all layers
   */
  protected formatPrompt(
    layers: BuiltContext["layers"],
    additionalContext?: string
  ): string {
    let prompt = layers.static.systemPrompt;

    // Add custom instructions
    if (layers.static.customInstructions) {
      prompt += `\n\n## Custom Instructions\n${layers.static.customInstructions}`;
    }

    // Add core values
    if (layers.static.coreValues.length > 0) {
      prompt += `\n\n## User's Core Values\n${layers.static.coreValues.join(", ")}`;
    }

    // Add persistent context
    if (layers.persistent) {
      if (layers.persistent.savedMemories.length > 0) {
        prompt += `\n\n## Remembered Context\n`;
        prompt += layers.persistent.savedMemories
          .map((m) => `- ${m.content}`)
          .join("\n");
      }

      if (layers.persistent.assessmentHighlights.length > 0) {
        prompt += `\n\n## User Assessments\n`;
        prompt += layers.persistent.assessmentHighlights
          .map((a) => `- ${a.type}: ${a.summary}`)
          .join("\n");
      }
    }

    // Add live context
    if (layers.live) {
      prompt += `\n\n## Current Context`;

      if (layers.live.todayRecovery !== undefined) {
        prompt += `\n- Recovery Score: ${layers.live.todayRecovery}%`;
      }
      if (layers.live.todayEnergy !== undefined) {
        prompt += `\n- Energy Level: ${layers.live.todayEnergy}/10`;
      }
      if (layers.live.todayMood) {
        prompt += `\n- Current Mood: ${layers.live.todayMood}`;
      }
      if (layers.live.focusMode) {
        prompt += `\n- Focus Mode: ${layers.live.focusMode}`;
      }
      if (layers.live.todaysTasks && layers.live.todaysTasks.length > 0) {
        prompt += `\n- Pending Tasks: ${layers.live.todaysTasks.length}`;
        prompt += `\n  Top: ${layers.live.todaysTasks
          .slice(0, 3)
          .map((t) => t.title)
          .join(", ")}`;
      }
      if (layers.live.overdueTasks && layers.live.overdueTasks.length > 0) {
        prompt += `\n- Overdue Tasks: ${layers.live.overdueTasks.length}`;
      }
      if (layers.live.nextMeeting) {
        const meetingTime = layers.live.nextMeeting.startTime;
        prompt += `\n- Next Meeting: ${layers.live.nextMeeting.title} at ${meetingTime.toLocaleTimeString()}`;
      }
    }

    // Add conversation summary
    if (layers.conversational?.conversationSummary) {
      prompt += `\n\n## Earlier in This Conversation\n${layers.conversational.conversationSummary}`;
    }

    // Add reference context
    if (layers.reference && layers.reference.relevantNotes.length > 0) {
      prompt += `\n\n## Relevant Notes\n`;
      prompt += layers.reference.relevantNotes
        .map((n) => `### ${n.title}\n${n.content}`)
        .join("\n\n");
    }

    // Add additional context if provided
    if (additionalContext) {
      prompt += `\n\n## Additional Context\n${additionalContext}`;
    }

    return prompt;
  }

  /**
   * Determine task complexity based on context
   */
  protected determineComplexity(
    layers: BuiltContext["layers"],
    messageCount: number
  ): "simple" | "moderate" | "complex" {
    let complexityScore = 0;

    // Message count increases complexity
    if (messageCount > 6) complexityScore += 2;
    else if (messageCount > 3) complexityScore += 1;

    // Reference context increases complexity
    if (layers.reference && layers.reference.relevantNotes.length > 0) {
      complexityScore += 1;
    }

    // Many tasks or meetings increases complexity
    if (layers.live) {
      if ((layers.live.todaysTasks?.length || 0) > 5) complexityScore += 1;
      if ((layers.live.upcomingEvents?.length || 0) > 3) complexityScore += 1;
    }

    if (complexityScore >= 3) return "complex";
    if (complexityScore >= 1) return "moderate";
    return "simple";
  }

  /**
   * Extract keywords from messages for reference search
   */
  protected extractKeywords(messages: Message[]): string[] {
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "can",
      "i",
      "you",
      "we",
      "they",
      "it",
      "this",
      "that",
      "what",
      "which",
      "who",
      "when",
      "where",
      "why",
      "how",
      "my",
      "your",
      "their",
      "me",
      "to",
      "for",
      "of",
      "on",
      "in",
      "at",
      "by",
      "with",
      "from",
      "and",
      "or",
      "but",
      "not",
      "help",
      "please",
      "want",
      "need",
      "about",
    ]);

    const allText = messages.map((m) => m.content).join(" ");
    const words = allText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    // Get unique words, prioritize by frequency
    const wordCount = new Map<string, number>();
    words.forEach((w) => wordCount.set(w, (wordCount.get(w) || 0) + 1));

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Create a simple summary of messages without AI
   */
  protected summarizeMessages(messages: Message[]): string {
    const userMessages = messages.filter((m) => m.role === "user");
    const assistantMessages = messages.filter((m) => m.role === "assistant");

    const topics = this.extractKeywords(messages);

    return `Previous conversation (${messages.length} messages) discussed: ${topics.join(", ")}. User asked ${userMessages.length} questions, assistant provided ${assistantMessages.length} responses.`;
  }
}

// =============================================================================
// AGENT-SPECIFIC BUILDERS (extend base class)
// =============================================================================

export class PatternAnalystBuilder extends BaseContextBuilder {
  constructor() {
    super("pattern-analyst");
  }
}

export class ResearchAssistantBuilder extends BaseContextBuilder {
  constructor() {
    super("research-assistant");
  }
}

export class ExecutiveCoachBuilder extends BaseContextBuilder {
  constructor() {
    super("executive-coach");
  }
}

export class TherapistBuilder extends BaseContextBuilder {
  constructor() {
    super("therapist");
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a context builder for the specified agent type
 */
export function createContextBuilder(agentType: AgentType): BaseContextBuilder {
  switch (agentType) {
    case "pattern-analyst":
      return new PatternAnalystBuilder();
    case "research-assistant":
      return new ResearchAssistantBuilder();
    case "executive-coach":
      return new ExecutiveCoachBuilder();
    case "therapist":
      return new TherapistBuilder();
    default:
      return new ExecutiveCoachBuilder();
  }
}
