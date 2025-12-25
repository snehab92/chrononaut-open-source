/**
 * Quick Add Parser for TickTick Tasks
 *
 * Parses shorthand syntax in task titles:
 * - !high, !med, !low (or !1, !2, !3) for priority
 * - #listname for project/list
 * - ^sectionname for section
 * - Natural language dates: today, tomorrow, monday, next week, etc.
 *
 * Example: "Buy groceries !high #personal ^shopping tomorrow"
 * Result: { title: "Buy groceries", priority: 5, list: "personal", section: "shopping", dueDate: <tomorrow> }
 */

export interface ParsedTask {
  title: string;
  priority?: number; // TickTick format: 0=none, 1=low, 3=medium, 5=high
  listName?: string;
  sectionName?: string;
  dueDate?: string; // ISO date string
}

// Priority patterns
const PRIORITY_PATTERNS: Record<string, number> = {
  "!high": 5,
  "!h": 5,
  "!3": 5,
  "!med": 3,
  "!medium": 3,
  "!m": 3,
  "!2": 3,
  "!low": 1,
  "!l": 1,
  "!1": 1,
  "!none": 0,
  "!0": 0,
};

// Day name to offset (0 = Sunday)
const DAY_NAMES: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/**
 * Parse a quick-add string into structured task data
 */
export function parseQuickAdd(input: string): ParsedTask {
  let text = input.trim();
  const result: ParsedTask = { title: "" };

  // Extract priority (!high, !med, !low, !1, !2, !3)
  const priorityMatch = text.match(/\s*!(high|h|med|medium|m|low|l|none|[0-3])\b/i);
  if (priorityMatch) {
    const key = priorityMatch[0].trim().toLowerCase();
    result.priority = PRIORITY_PATTERNS[key] ?? 0;
    text = text.replace(priorityMatch[0], " ");
  }

  // Extract list name (#listname)
  const listMatch = text.match(/\s*#(\S+)/);
  if (listMatch) {
    result.listName = listMatch[1].toLowerCase();
    text = text.replace(listMatch[0], " ");
  }

  // Extract section name (^sectionname)
  const sectionMatch = text.match(/\s*\^(\S+)/);
  if (sectionMatch) {
    result.sectionName = sectionMatch[1].toLowerCase();
    text = text.replace(sectionMatch[0], " ");
  }

  // Extract date (natural language)
  const dateResult = extractDate(text);
  if (dateResult.date) {
    result.dueDate = formatDateForTickTick(dateResult.date);
    text = dateResult.remainingText;
  }

  // Clean up remaining text as title
  result.title = text.replace(/\s+/g, " ").trim();

  return result;
}

/**
 * Extract natural language date from text
 */
function extractDate(text: string): { date: Date | null; remainingText: string } {
  const lowerText = text.toLowerCase();
  const now = new Date();
  let date: Date | null = null;
  let matchedPattern = "";

  // Today
  if (/\btoday\b/.test(lowerText)) {
    date = new Date(now);
    matchedPattern = "today";
  }
  // Tomorrow
  else if (/\btomorrow\b|\btmrw\b|\btmr\b/.test(lowerText)) {
    date = new Date(now);
    date.setDate(date.getDate() + 1);
    matchedPattern = lowerText.match(/\btomorrow\b|\btmrw\b|\btmr\b/)?.[0] || "";
  }
  // Day after tomorrow
  else if (/\bday after tomorrow\b/.test(lowerText)) {
    date = new Date(now);
    date.setDate(date.getDate() + 2);
    matchedPattern = "day after tomorrow";
  }
  // Next week (next Monday)
  else if (/\bnext week\b/.test(lowerText)) {
    date = getNextDayOfWeek(now, 1); // Next Monday
    date.setDate(date.getDate() + 7); // Actually next week's Monday
    matchedPattern = "next week";
  }
  // This weekend (Saturday)
  else if (/\bthis weekend\b|\bweekend\b/.test(lowerText)) {
    date = getNextDayOfWeek(now, 6); // Saturday
    matchedPattern = lowerText.match(/\bthis weekend\b|\bweekend\b/)?.[0] || "";
  }
  // Next [day] (e.g., "next monday")
  else {
    const nextDayMatch = lowerText.match(
      /\bnext\s+(sunday|sun|monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat)\b/
    );
    if (nextDayMatch) {
      const dayName = nextDayMatch[1].toLowerCase();
      const targetDay = DAY_NAMES[dayName];
      if (targetDay !== undefined) {
        date = getNextDayOfWeek(now, targetDay);
        date.setDate(date.getDate() + 7); // Next week's occurrence
        matchedPattern = nextDayMatch[0];
      }
    }
  }

  // Day name without "next" (e.g., "monday" = this or next monday)
  if (!date) {
    const dayMatch = lowerText.match(
      /\b(sunday|sun|monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat)\b/
    );
    if (dayMatch) {
      const dayName = dayMatch[1].toLowerCase();
      const targetDay = DAY_NAMES[dayName];
      if (targetDay !== undefined) {
        date = getNextDayOfWeek(now, targetDay);
        matchedPattern = dayMatch[0];
      }
    }
  }

  // In X days (e.g., "in 3 days")
  if (!date) {
    const inDaysMatch = lowerText.match(/\bin\s+(\d+)\s+days?\b/);
    if (inDaysMatch) {
      const days = parseInt(inDaysMatch[1], 10);
      date = new Date(now);
      date.setDate(date.getDate() + days);
      matchedPattern = inDaysMatch[0];
    }
  }

  // Remove the matched pattern from text
  let remainingText = text;
  if (matchedPattern) {
    const regex = new RegExp(`\\s*\\b${escapeRegex(matchedPattern)}\\b\\s*`, "i");
    remainingText = text.replace(regex, " ");
  }

  return { date, remainingText };
}

/**
 * Get the next occurrence of a day of the week
 */
function getNextDayOfWeek(from: Date, targetDay: number): Date {
  const result = new Date(from);
  const currentDay = result.getDay();
  let daysToAdd = targetDay - currentDay;

  if (daysToAdd <= 0) {
    daysToAdd += 7; // Move to next week if today or past
  }

  result.setDate(result.getDate() + daysToAdd);
  return result;
}

/**
 * Format date for TickTick API (all-day format)
 * Returns ISO date string in local timezone to avoid UTC conversion issues
 */
function formatDateForTickTick(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  // Use local time representation without UTC offset to prevent timezone shifts
  return `${year}-${month}-${day}T12:00:00`;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Get display text for parsed result (for preview)
 */
export function getParsePreview(parsed: ParsedTask): string {
  const parts: string[] = [];

  if (parsed.priority !== undefined && parsed.priority > 0) {
    const priorityNames: Record<number, string> = { 5: "High", 3: "Medium", 1: "Low" };
    parts.push(`Priority: ${priorityNames[parsed.priority] || "None"}`);
  }

  if (parsed.listName) {
    parts.push(`List: #${parsed.listName}`);
  }

  if (parsed.sectionName) {
    parts.push(`Section: ^${parsed.sectionName}`);
  }

  if (parsed.dueDate) {
    const date = new Date(parsed.dueDate);
    parts.push(`Due: ${date.toLocaleDateString()}`);
  }

  return parts.join(" | ");
}
