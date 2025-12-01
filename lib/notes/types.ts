// Folder Views and Templates Type Definitions

export type NoteType = "meeting" | "document" | "quick capture";

export interface Note {
  id: string;
  title: string;
  content: string | null;
  note_type: NoteType;
  tags: string[];
  folder_id: string | null;
  is_starred: boolean;
  photo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FolderType {
  id: string;
  name: string;
  parent_id: string | null;
  folder_type: "notebook" | "ai_conversations";
}

// View Types
export type ViewType = "database" | "kanban" | "gallery";

export type SortField = "title" | "note_type" | "updated_at" | "created_at" | "is_starred";
export type SortDirection = "asc" | "desc";
export type FilterOperator = "eq" | "neq" | "contains" | "is_empty" | "is_not_empty";

export interface FilterRule {
  field: "note_type" | "is_starred" | "tags";
  operator: FilterOperator;
  value: string | boolean | null;
}

export interface SortRule {
  field: SortField;
  direction: SortDirection;
}

export type GroupByField = "tags" | "note_type" | "is_starred" | null;

export interface ViewConfig {
  sortField: SortField; // Primary sort (legacy support)
  sortDirection: SortDirection; // Primary sort direction (legacy support)
  sortRules: SortRule[]; // Multi-sort support
  groupByField: GroupByField;
  filters: FilterRule[];
  visibleColumns: string[];
  columnWidths?: Record<string, number>; // Column width in pixels
}

export interface FolderView {
  id: string;
  user_id: string;
  folder_id: string;
  name: string;
  view_type: ViewType;
  config: ViewConfig;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FolderTemplate {
  id: string;
  user_id: string;
  folder_id: string;
  name: string;
  default_content: string | null;
  default_note_type: NoteType;
  default_label: string | null;
  ai_prompt: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Default view configuration
export const DEFAULT_VIEW_CONFIG: ViewConfig = {
  sortField: "updated_at",
  sortDirection: "desc",
  sortRules: [{ field: "updated_at", direction: "desc" }],
  groupByField: null,
  filters: [],
  visibleColumns: ["title", "content_preview", "note_type", "tags", "folder", "is_starred", "created_at", "updated_at", "actions"],
  columnWidths: {},
};

// Column definitions for database view
export interface ColumnDef {
  id: string;
  label: string;
  sortable: boolean;
  defaultWidth: number; // Width in pixels
  minWidth: number;
  maxWidth: number;
}

export const DATABASE_COLUMNS: ColumnDef[] = [
  { id: "title", label: "Title", sortable: true, defaultWidth: 200, minWidth: 120, maxWidth: 400 },
  { id: "content_preview", label: "Preview", sortable: false, defaultWidth: 200, minWidth: 100, maxWidth: 400 },
  { id: "note_type", label: "Type", sortable: true, defaultWidth: 100, minWidth: 80, maxWidth: 150 },
  { id: "tags", label: "Label", sortable: false, defaultWidth: 120, minWidth: 80, maxWidth: 200 },
  { id: "folder", label: "Folder", sortable: false, defaultWidth: 120, minWidth: 80, maxWidth: 200 },
  { id: "is_starred", label: "Starred", sortable: true, defaultWidth: 70, minWidth: 60, maxWidth: 100 },
  { id: "created_at", label: "Created", sortable: true, defaultWidth: 100, minWidth: 80, maxWidth: 150 },
  { id: "updated_at", label: "Updated", sortable: true, defaultWidth: 100, minWidth: 80, maxWidth: 150 },
  { id: "actions", label: "", sortable: false, defaultWidth: 50, minWidth: 40, maxWidth: 60 },
];

// Re-export label colors from shared module for backward compatibility
export { LABEL_COLORS, getLabelColor, getLabelClasses } from "@/lib/shared/label-colors";
export type { LabelColorScheme } from "@/lib/shared/label-colors";

// Note type display helpers
export const NOTE_TYPE_ICONS: Record<NoteType, string> = {
  meeting: "📅",
  document: "📄",
  "quick capture": "⚡",
};

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  meeting: "📅 Meeting",
  document: "📄 Document",
  "quick capture": "⚡ Quick Capture",
};

export const NOTE_TYPES: NoteType[] = ["meeting", "document", "quick capture"];
