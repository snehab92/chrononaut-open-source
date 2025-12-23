/**
 * Context Architecture Types for AI Agents
 *
 * Defines the structure for context layers that provide agents with
 * appropriate information for their tasks.
 */

import type { AgentType } from "../agents";

// =============================================================================
// CORE CONTEXT INTERFACES
// =============================================================================

/**
 * Static context: Agent prompts + custom instructions (rarely changes)
 */
export interface StaticContext {
  systemPrompt: string;
  customInstructions: string;
  coreValues: string[];
}

/**
 * Persistent context: User files + saved memories (changes infrequently)
 */
export interface PersistentContext {
  aboutMeFiles: AboutMeFile[];
  savedMemories: SavedMemory[];
  assessmentHighlights: AssessmentHighlight[];
}

/**
 * Conversational context: Message history + summaries
 */
export interface ConversationalContext {
  currentMessages: Message[];
  conversationSummary?: string;
  relatedConversations?: ConversationReference[];
}

/**
 * Live context: Real-time data from integrations
 */
export interface LiveContext {
  // Health data (from Whoop)
  todayRecovery?: number;
  weeklyRecoveryTrend?: TrendDirection;
  sleepQuality?: string;
  sleepHours?: number;

  // Tasks (from TickTick)
  todaysTasks?: TaskSummary[];
  overdueTasks?: TaskSummary[];
  completedToday?: number;

  // Focus
  focusSessionActive?: FocusSessionInfo;
  focusMode?: string;

  // Calendar
  upcomingEvents?: CalendarEventSummary[];
  currentTimeBlock?: string;
  nextMeeting?: CalendarEventSummary;

  // Journal
  todayMood?: string;
  todayEnergy?: number;
  weeklyEnergyTrend?: TrendDirection;
  recentMoodLabels?: string[];
}

/**
 * Reference context: Notes and documents retrieved on-demand
 */
export interface ReferenceContext {
  relevantNotes: NoteSnippet[];
  linkedDocuments: DocumentReference[];
}

/**
 * Complete built context ready for API call
 */
export interface BuiltContext {
  formattedPrompt: string;
  conversationalMessages: Message[];
  estimatedInputTokens: number;
  complexity: "simple" | "moderate" | "complex";
  layers: {
    static: StaticContext;
    persistent?: PersistentContext;
    conversational?: ConversationalContext;
    live?: LiveContext;
    reference?: ReferenceContext;
  };
}

// =============================================================================
// CONFIGURATION INTERFACES
// =============================================================================

/**
 * Configuration for which context layers an agent uses
 */
export interface AgentContextConfig {
  agentType: AgentType;
  layers: {
    static: LayerConfig;
    persistent: LayerConfig & { sources?: PersistentSource[] };
    conversational: LayerConfig & { maxMessages?: number };
    live: LayerConfig & { sources?: LiveSource[] };
    reference: LayerConfig & { sources?: ReferenceSource[] };
  };
  totalBudget: number;
}

export interface LayerConfig {
  enabled: boolean;
  budgetTokens: number;
}

export type PersistentSource =
  | "about_me_files"
  | "saved_memories"
  | "assessments";

export type LiveSource =
  | "recovery_score"
  | "sleep_data"
  | "todays_tasks"
  | "overdue_tasks"
  | "upcoming_calendar"
  | "focus_session"
  | "journal_recent"
  | "mood_patterns"
  | "energy_patterns"
  | "health_trends"
  | "task_patterns";

export type ReferenceSource = "notes" | "folders" | "about_me_files";

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AboutMeFile {
  id: string;
  filename: string;
  category: string;
  description?: string;
  extractedContent?: string;
  agentAccess: AgentType[];
}

export interface SavedMemory {
  id: string;
  content: string;
  agentType: AgentType;
  importance: number;
  createdAt: Date;
}

export interface AssessmentHighlight {
  type: string;
  score: number;
  date: Date;
  summary?: string;
}

export interface ConversationReference {
  id: string;
  title: string;
  summary: string;
  lastMessageAt: Date;
}

export interface TaskSummary {
  id: string;
  title: string;
  priority: number;
  dueDate?: Date;
  overdue: boolean;
  estimatedMinutes?: number;
}

export interface FocusSessionInfo {
  mode: string;
  taskTitle?: string;
  startedAt: Date;
  plannedMinutes: number;
}

export interface CalendarEventSummary {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  attendeeCount?: number;
  meetingLink?: string;
}

export interface NoteSnippet {
  id: string;
  title: string;
  content: string;
  relevanceScore?: number;
  tags?: string[];
}

export interface DocumentReference {
  id: string;
  title: string;
  type: string;
  summary?: string;
}

export type TrendDirection = "up" | "down" | "stable";

// =============================================================================
// AGENT-SPECIFIC CONFIGURATIONS
// =============================================================================

/**
 * Pre-defined context configurations for each agent type
 */
export const AGENT_CONTEXT_CONFIGS: Record<AgentType, AgentContextConfig> = {
  "pattern-analyst": {
    agentType: "pattern-analyst",
    layers: {
      static: { enabled: true, budgetTokens: 800 },
      persistent: { enabled: true, budgetTokens: 500, sources: ["assessments"] },
      conversational: { enabled: false, budgetTokens: 0 }, // Background agent
      live: {
        enabled: true,
        budgetTokens: 1500,
        sources: [
          "journal_recent",
          "health_trends",
          "task_patterns",
          "mood_patterns",
          "energy_patterns",
        ],
      },
      reference: { enabled: false, budgetTokens: 0 },
    },
    totalBudget: 4000,
  },

  "research-assistant": {
    agentType: "research-assistant",
    layers: {
      static: { enabled: true, budgetTokens: 600 },
      persistent: {
        enabled: true,
        budgetTokens: 1000,
        sources: ["about_me_files"],
      },
      conversational: { enabled: true, budgetTokens: 2000, maxMessages: 6 },
      live: { enabled: false, budgetTokens: 0 },
      reference: {
        enabled: true,
        budgetTokens: 2000,
        sources: ["notes", "folders"],
      },
    },
    totalBudget: 6000,
  },

  "executive-coach": {
    agentType: "executive-coach",
    layers: {
      static: { enabled: true, budgetTokens: 800 },
      persistent: {
        enabled: true,
        budgetTokens: 800,
        sources: ["about_me_files", "saved_memories"],
      },
      conversational: { enabled: true, budgetTokens: 2000, maxMessages: 8 },
      live: {
        enabled: true,
        budgetTokens: 1200,
        sources: [
          "todays_tasks",
          "overdue_tasks",
          "upcoming_calendar",
          "focus_session",
          "recovery_score",
        ],
      },
      reference: { enabled: false, budgetTokens: 0 },
    },
    totalBudget: 5500,
  },

  therapist: {
    agentType: "therapist",
    layers: {
      static: { enabled: true, budgetTokens: 800 },
      persistent: {
        enabled: true,
        budgetTokens: 1000,
        sources: ["saved_memories", "assessments"],
      },
      conversational: { enabled: true, budgetTokens: 3000, maxMessages: 10 }, // Longer context
      live: {
        enabled: true,
        budgetTokens: 800,
        sources: ["journal_recent", "mood_patterns"],
      },
      reference: { enabled: false, budgetTokens: 0 },
    },
    totalBudget: 6000,
  },
};

/**
 * Get context configuration for an agent
 */
export function getContextConfig(agentType: AgentType): AgentContextConfig {
  return AGENT_CONTEXT_CONFIGS[agentType];
}
