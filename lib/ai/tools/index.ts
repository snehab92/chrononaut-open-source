/**
 * AI Agent Tools Registry
 *
 * Defines the tools available to AI agents for multi-step workflows.
 * Tools enable agents to read/write notes, search, analyze patterns, etc.
 */

import { createClient } from "@/lib/supabase/server";

// =============================================================================
// TOOL TYPES
// =============================================================================

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "array";
  description: string;
  enum?: string[];
  items?: { type: string };
  required?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required: string[];
  };
  execute: (params: Record<string, unknown>, userId: string) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  markdown?: string; // Human-readable output
}

// =============================================================================
// TOOL: READ NOTES
// =============================================================================

export const readNotes: ToolDefinition = {
  name: "read_notes",
  description:
    "Read one or more notes by ID or title. Returns note content in markdown format.",
  parameters: {
    type: "object",
    properties: {
      note_ids: {
        type: "array",
        items: { type: "string" },
        description: "Array of note UUIDs to read",
      },
      titles: {
        type: "array",
        items: { type: "string" },
        description: "Array of note titles to search for (fuzzy match)",
      },
      include_metadata: {
        type: "boolean",
        description: "Include created_at, tags, folder info",
      },
    },
    required: [],
  },
  execute: async (params, userId) => {
    const supabase = await createClient();
    let query = supabase.from("notes").select("*").eq("user_id", userId);

    const noteIds = params.note_ids as string[] | undefined;
    const titles = params.titles as string[] | undefined;

    if (noteIds && noteIds.length > 0) {
      query = query.in("id", noteIds);
    } else if (titles && titles.length > 0) {
      const orConditions = titles.map((t) => `title.ilike.%${t}%`).join(",");
      query = query.or(orConditions);
    } else {
      return { success: false, error: "Must provide note_ids or titles" };
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const markdown = (data || [])
      .map((n) => `## ${n.title}\n${n.content || "(empty)"}`)
      .join("\n\n---\n\n");

    return {
      success: true,
      data: data,
      markdown: markdown || "No notes found",
    };
  },
};

// =============================================================================
// TOOL: READ FOLDER
// =============================================================================

export const readFolder: ToolDefinition = {
  name: "read_folder",
  description:
    "Read all notes in a folder. Returns folder structure and note contents.",
  parameters: {
    type: "object",
    properties: {
      folder_id: {
        type: "string",
        description: "UUID of folder to read",
      },
      folder_name: {
        type: "string",
        description: "Name of folder to find and read",
      },
      summary_only: {
        type: "boolean",
        description: "Return only titles and first 200 chars of each note",
      },
    },
    required: [],
  },
  execute: async (params, userId) => {
    const supabase = await createClient();

    // Find folder
    let folderId = params.folder_id as string | undefined;
    if (!folderId && params.folder_name) {
      const { data: folder } = await supabase
        .from("folders")
        .select("id")
        .eq("user_id", userId)
        .ilike("name", `%${params.folder_name}%`)
        .single();
      folderId = folder?.id;
    }

    if (!folderId) {
      return { success: false, error: "Folder not found" };
    }

    // Get notes in folder
    const { data: notes, error } = await supabase
      .from("notes")
      .select("id, title, content, created_at, tags")
      .eq("folder_id", folderId)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    const summaryOnly = params.summary_only as boolean;
    const formatted = (notes || []).map((n) => ({
      ...n,
      content: summaryOnly ? (n.content?.slice(0, 200) || "") + "..." : n.content,
    }));

    const markdown = formatted
      .map((n) =>
        summaryOnly ? `- **${n.title}**: ${n.content}` : `## ${n.title}\n${n.content}`
      )
      .join("\n\n");

    return {
      success: true,
      data: formatted,
      markdown: markdown || "No notes in folder",
    };
  },
};

// =============================================================================
// TOOL: WRITE NOTE
// =============================================================================

export const writeNote: ToolDefinition = {
  name: "write_note",
  description: "Create a new note or update an existing one.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Note title",
      },
      content: {
        type: "string",
        description: "Note content in markdown format",
      },
      folder_name: {
        type: "string",
        description: "Folder to save note in (creates if doesn't exist)",
      },
      folder_id: {
        type: "string",
        description: "Folder UUID to save note in",
      },
      note_id: {
        type: "string",
        description: "If provided, updates existing note instead of creating",
      },
      append: {
        type: "boolean",
        description: "If updating, append content instead of replace",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Tags to apply to note",
      },
    },
    required: ["title", "content"],
  },
  execute: async (params, userId) => {
    const supabase = await createClient();

    // Resolve folder
    let folderId = params.folder_id as string | undefined;
    if (!folderId && params.folder_name) {
      const { data: existing } = await supabase
        .from("folders")
        .select("id")
        .eq("user_id", userId)
        .eq("name", params.folder_name as string)
        .single();

      if (existing) {
        folderId = existing.id;
      } else {
        const { data: newFolder } = await supabase
          .from("folders")
          .insert({ user_id: userId, name: params.folder_name as string })
          .select()
          .single();
        folderId = newFolder?.id;
      }
    }

    const noteId = params.note_id as string | undefined;

    if (noteId) {
      // Update existing
      let content = params.content as string;
      if (params.append) {
        const { data: existing } = await supabase
          .from("notes")
          .select("content")
          .eq("id", noteId)
          .single();
        content = (existing?.content || "") + "\n\n" + content;
      }

      const { data, error } = await supabase
        .from("notes")
        .update({
          title: params.title as string,
          content,
          folder_id: folderId,
          tags: params.tags as string[],
        })
        .eq("id", noteId)
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      return {
        success: true,
        data,
        markdown: `Updated note: **${params.title}**`,
      };
    } else {
      // Create new
      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: userId,
          title: params.title as string,
          content: params.content as string,
          folder_id: folderId,
          tags: (params.tags as string[]) || ["ai-generated"],
          note_type: "document",
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      return {
        success: true,
        data,
        markdown: `Created note: **${params.title}** ${params.folder_name ? `in ${params.folder_name}` : ""}`,
      };
    }
  },
};

// =============================================================================
// TOOL: SEARCH NOTES
// =============================================================================

export const searchNotes: ToolDefinition = {
  name: "search_notes",
  description:
    "Search notes by content, tags, or date range. Returns matching notes.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Text to search for in title and content",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Filter by tags (AND logic)",
      },
      note_type: {
        type: "string",
        enum: ["meeting", "document", "assessment", "quick_capture"],
        description: "Filter by note type",
      },
      date_from: {
        type: "string",
        description: "ISO date string for start of date range",
      },
      date_to: {
        type: "string",
        description: "ISO date string for end of date range",
      },
      folder_name: {
        type: "string",
        description: "Limit search to specific folder",
      },
      limit: {
        type: "number",
        description: "Max results to return (default 20)",
      },
    },
    required: [],
  },
  execute: async (params, userId) => {
    const supabase = await createClient();
    let query = supabase
      .from("notes")
      .select("id, title, content, tags, created_at, folder_id")
      .eq("user_id", userId);

    if (params.query) {
      query = query.or(
        `title.ilike.%${params.query}%,content.ilike.%${params.query}%`
      );
    }
    if (params.tags && (params.tags as string[]).length > 0) {
      query = query.contains("tags", params.tags as string[]);
    }
    if (params.note_type) {
      query = query.eq("note_type", params.note_type as string);
    }
    if (params.date_from) {
      query = query.gte("created_at", params.date_from as string);
    }
    if (params.date_to) {
      query = query.lte("created_at", params.date_to as string);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit((params.limit as number) || 20);

    if (error) return { success: false, error: error.message };

    const markdown = (data || [])
      .map(
        (n) =>
          `- **${n.title}** (${new Date(n.created_at).toLocaleDateString()})`
      )
      .join("\n");

    return {
      success: true,
      data,
      markdown: markdown || "No notes found",
    };
  },
};

// =============================================================================
// TOOL: ANALYZE PATTERNS
// =============================================================================

export const analyzePatterns: ToolDefinition = {
  name: "analyze_patterns",
  description:
    "Analyze user patterns across journal entries, health data, and tasks. Returns insights.",
  parameters: {
    type: "object",
    properties: {
      time_range: {
        type: "string",
        enum: ["today", "week", "month", "quarter"],
        description: "Time range for analysis",
      },
      focus_areas: {
        type: "array",
        items: { type: "string" },
        description:
          "Specific areas to analyze: mood, energy, productivity, sleep, values_alignment",
      },
    },
    required: ["time_range"],
  },
  execute: async (params, userId) => {
    const supabase = await createClient();
    const now = new Date();
    let startDate: Date;

    switch (params.time_range) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "quarter":
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    const startDateStr = startDate.toISOString();

    // Fetch data in parallel
    const [journalsRes, healthRes, tasksRes] = await Promise.all([
      supabase
        .from("journal_entries")
        .select("entry_date, mood_label, energy_rating")
        .eq("user_id", userId)
        .gte("entry_date", startDateStr.split("T")[0]),
      supabase
        .from("health_metrics")
        .select("metric_date, recovery_score, sleep_hours, strain_score")
        .eq("user_id", userId)
        .gte("metric_date", startDateStr.split("T")[0]),
      supabase
        .from("tasks")
        .select("title, completed, completed_at, priority")
        .eq("user_id", userId)
        .gte("created_at", startDateStr),
    ]);

    const journals = journalsRes.data || [];
    const health = healthRes.data || [];
    const tasks = tasksRes.data || [];

    // Calculate summary metrics
    const avgEnergy =
      journals.length > 0
        ? journals.reduce((s, j) => s + (j.energy_rating || 5), 0) / journals.length
        : 0;
    const avgRecovery =
      health.length > 0
        ? health.reduce((s, h) => s + (h.recovery_score || 50), 0) / health.length
        : 0;
    const avgSleep =
      health.length > 0
        ? health.reduce((s, h) => s + (h.sleep_hours || 7), 0) / health.length
        : 0;
    const completedTasks = tasks.filter((t) => t.completed).length;

    // Mood distribution
    const moodCounts: Record<string, number> = {};
    journals.forEach((j) => {
      if (j.mood_label) {
        moodCounts[j.mood_label] = (moodCounts[j.mood_label] || 0) + 1;
      }
    });

    const topMoods = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([mood]) => mood);

    const summary = {
      period: params.time_range,
      journal_entries: journals.length,
      avg_energy: avgEnergy.toFixed(1),
      avg_recovery: avgRecovery.toFixed(0) + "%",
      avg_sleep: avgSleep.toFixed(1) + " hrs",
      tasks_completed: completedTasks,
      tasks_total: tasks.length,
      completion_rate:
        tasks.length > 0
          ? ((completedTasks / tasks.length) * 100).toFixed(0) + "%"
          : "N/A",
      top_moods: topMoods,
    };

    const markdown = `## Pattern Analysis (${params.time_range})

**Energy & Recovery**
- Avg Energy: ${summary.avg_energy}/10
- Avg Recovery: ${summary.avg_recovery}
- Avg Sleep: ${summary.avg_sleep}

**Productivity**
- Tasks Completed: ${summary.tasks_completed}/${summary.tasks_total} (${summary.completion_rate})

**Mood Patterns**
- Top moods: ${topMoods.join(", ") || "No data"}
- Journal entries: ${summary.journal_entries}`;

    return {
      success: true,
      data: summary,
      markdown,
    };
  },
};

// =============================================================================
// TOOL: GET CONTEXT
// =============================================================================

export const getContext: ToolDefinition = {
  name: "get_context",
  description:
    "Get comprehensive user context including calendar, health, pending tasks, and recent patterns.",
  parameters: {
    type: "object",
    properties: {
      date: {
        type: "string",
        description: "Date to get context for (ISO format, defaults to today)",
      },
      include: {
        type: "array",
        items: { type: "string" },
        description:
          "Data sources to include: calendar, health, tasks, journal, patterns, all",
      },
    },
    required: [],
  },
  execute: async (params, userId) => {
    const supabase = await createClient();
    const targetDate = params.date
      ? new Date(params.date as string)
      : new Date();
    const dateStr = targetDate.toISOString().split("T")[0];

    const include = (params.include as string[]) || ["all"];
    const includeAll = include.includes("all");

    const results: Record<string, unknown> = {};
    const promises: Promise<void>[] = [];

    if (includeAll || include.includes("health")) {
      promises.push(
        (async () => {
          const { data } = await supabase
            .from("health_metrics")
            .select("*")
            .eq("user_id", userId)
            .eq("metric_date", dateStr)
            .single();
          results.health = data;
        })()
      );
    }

    if (includeAll || include.includes("tasks")) {
      promises.push(
        (async () => {
          const { data } = await supabase
            .from("tasks")
            .select("id, title, priority, due_date, completed")
            .eq("user_id", userId)
            .eq("completed", false)
            .order("priority", { ascending: false })
            .limit(10);
          results.tasks = data;
        })()
      );
    }

    if (includeAll || include.includes("calendar")) {
      promises.push(
        (async () => {
          const { data } = await supabase
            .from("calendar_events")
            .select("id, title, start_time, end_time, attendees")
            .eq("user_id", userId)
            .gte("start_time", targetDate.toISOString())
            .order("start_time", { ascending: true })
            .limit(5);
          results.calendar = data;
        })()
      );
    }

    if (includeAll || include.includes("journal")) {
      promises.push(
        (async () => {
          const { data } = await supabase
            .from("journal_entries")
            .select("entry_date, mood_label, energy_rating")
            .eq("user_id", userId)
            .order("entry_date", { ascending: false })
            .limit(3);
          results.recent_journals = data;
        })()
      );
    }

    await Promise.all(promises);

    // Format markdown
    let markdown = `## Context for ${dateStr}\n`;

    if (results.health) {
      const h = results.health as { recovery_score?: number; sleep_hours?: number };
      markdown += `\n**Health**\n- Recovery: ${h.recovery_score || "N/A"}%\n- Sleep: ${h.sleep_hours || "N/A"} hrs\n`;
    }

    if (results.tasks) {
      const tasks = results.tasks as Array<{ title: string; priority: number }>;
      markdown += `\n**Tasks (${tasks.length} pending)**\n`;
      tasks.slice(0, 5).forEach((t) => {
        markdown += `- ${t.title} (P${t.priority})\n`;
      });
    }

    if (results.calendar) {
      const events = results.calendar as Array<{ title: string; start_time: string }>;
      markdown += `\n**Upcoming (${events.length} events)**\n`;
      events.forEach((e) => {
        markdown += `- ${e.title} at ${new Date(e.start_time).toLocaleTimeString()}\n`;
      });
    }

    return {
      success: true,
      data: results,
      markdown,
    };
  },
};

// =============================================================================
// TOOL: CREATE TASK
// =============================================================================

export const createTask: ToolDefinition = {
  name: "create_task",
  description: "Create a new task.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Task title",
      },
      content: {
        type: "string",
        description: "Task description",
      },
      due_date: {
        type: "string",
        description: "Due date in ISO format",
      },
      priority: {
        type: "number",
        description: "Priority 0-5 (5 highest)",
      },
    },
    required: ["title"],
  },
  execute: async (params, userId) => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        title: params.title as string,
        content: (params.content as string) || "",
        due_date: params.due_date as string | null,
        priority: (params.priority as number) || 0,
        sync_status: "pending_push",
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data,
      markdown: `Created task: **${params.title}**${params.due_date ? ` due ${new Date(params.due_date as string).toLocaleDateString()}` : ""}`,
    };
  },
};

// =============================================================================
// TOOL REGISTRY
// =============================================================================

export const TOOLS: Record<string, ToolDefinition> = {
  read_notes: readNotes,
  read_folder: readFolder,
  write_note: writeNote,
  search_notes: searchNotes,
  analyze_patterns: analyzePatterns,
  get_context: getContext,
  create_task: createTask,
};

/**
 * Get a tool by name
 */
export function getTool(name: string): ToolDefinition | undefined {
  return TOOLS[name];
}

/**
 * Get all tool definitions for the orchestrator
 */
export function getToolDefinitions(): string {
  return Object.entries(TOOLS)
    .map(
      ([name, tool]) => `
### ${name}
${tool.description}
Parameters: ${JSON.stringify(tool.parameters.properties, null, 2)}
Required: ${tool.parameters.required.join(", ") || "none"}
`
    )
    .join("\n");
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  name: string,
  params: Record<string, unknown>,
  userId: string
): Promise<ToolResult> {
  const tool = getTool(name);
  if (!tool) {
    return { success: false, error: `Unknown tool: ${name}` };
  }

  try {
    return await tool.execute(params, userId);
  } catch (error) {
    console.error(`Tool ${name} execution failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Tool execution failed",
    };
  }
}
