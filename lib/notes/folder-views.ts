import { createClient } from "@/lib/supabase/client";
import { FolderView, ViewConfig, ViewType, DEFAULT_VIEW_CONFIG } from "./types";

/**
 * Migrate view config to include new columns/fields that were added after the view was created.
 * This ensures existing views get new features like created_at column.
 */
function migrateViewConfig(config: ViewConfig): ViewConfig {
  const defaultColumns = DEFAULT_VIEW_CONFIG.visibleColumns;
  const existingColumns = config.visibleColumns || [];

  // Add any new default columns that aren't in the existing config
  const newColumns = defaultColumns.filter(col => !existingColumns.includes(col));

  return {
    ...DEFAULT_VIEW_CONFIG,
    ...config,
    // Merge visible columns - add new default columns at the end
    visibleColumns: [...existingColumns, ...newColumns],
    // Ensure sortRules exists
    sortRules: config.sortRules || [{ field: config.sortField || "updated_at", direction: config.sortDirection || "desc" }],
  };
}

/**
 * Fetch all views for a folder
 */
export async function fetchFolderViews(folderId: string): Promise<FolderView[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("folder_views")
    .select("*")
    .eq("folder_id", folderId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching folder views:", error);
    return [];
  }

  // Migrate configs to include any new columns
  return (data || []).map(view => ({
    ...view,
    config: migrateViewConfig(view.config),
  }));
}

/**
 * Get the default view for a folder, or create one if none exists
 */
export async function getOrCreateDefaultView(
  folderId: string,
  userId: string
): Promise<FolderView | null> {
  const supabase = createClient();

  // First, try to get the default view
  const { data: existingView } = await supabase
    .from("folder_views")
    .select("*")
    .eq("folder_id", folderId)
    .eq("is_default", true)
    .single();

  if (existingView) {
    return {
      ...existingView,
      config: migrateViewConfig(existingView.config),
    };
  }

  // If no default, get any view for this folder
  const { data: anyView } = await supabase
    .from("folder_views")
    .select("*")
    .eq("folder_id", folderId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (anyView) {
    return {
      ...anyView,
      config: migrateViewConfig(anyView.config),
    };
  }

  // Create a default view
  const { data: newView, error } = await supabase
    .from("folder_views")
    .insert({
      user_id: userId,
      folder_id: folderId,
      name: "Default View",
      view_type: "database",
      config: DEFAULT_VIEW_CONFIG,
      is_default: true,
      sort_order: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating default view:", error);
    return null;
  }

  return newView;
}

/**
 * Create a new view for a folder
 */
export async function createFolderView(
  folderId: string,
  userId: string,
  name: string,
  viewType: ViewType = "database",
  config: ViewConfig = DEFAULT_VIEW_CONFIG
): Promise<FolderView | null> {
  const supabase = createClient();

  // Get the max sort_order for this folder
  const { data: maxOrderData } = await supabase
    .from("folder_views")
    .select("sort_order")
    .eq("folder_id", folderId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (maxOrderData?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("folder_views")
    .insert({
      user_id: userId,
      folder_id: folderId,
      name,
      view_type: viewType,
      config,
      is_default: false,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating folder view:", error);
    return null;
  }

  return data;
}

/**
 * Update a view's configuration
 */
export async function updateFolderView(
  viewId: string,
  updates: Partial<Pick<FolderView, "name" | "view_type" | "config" | "is_default">>
): Promise<FolderView | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("folder_views")
    .update(updates)
    .eq("id", viewId)
    .select()
    .single();

  if (error) {
    console.error("Error updating folder view:", error);
    return null;
  }

  return data;
}

/**
 * Update just the view config (for debounced saves)
 */
export async function updateViewConfig(
  viewId: string,
  config: ViewConfig
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("folder_views")
    .update({ config })
    .eq("id", viewId);

  if (error) {
    console.error("Error updating view config:", error);
    return false;
  }

  return true;
}

/**
 * Delete a view
 */
export async function deleteFolderView(viewId: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("folder_views")
    .delete()
    .eq("id", viewId);

  if (error) {
    console.error("Error deleting folder view:", error);
    return false;
  }

  return true;
}

/**
 * Set a view as the default for a folder
 */
export async function setDefaultView(
  viewId: string,
  folderId: string
): Promise<boolean> {
  const supabase = createClient();

  // First, unset any existing default
  await supabase
    .from("folder_views")
    .update({ is_default: false })
    .eq("folder_id", folderId);

  // Then set the new default
  const { error } = await supabase
    .from("folder_views")
    .update({ is_default: true })
    .eq("id", viewId);

  if (error) {
    console.error("Error setting default view:", error);
    return false;
  }

  return true;
}

/**
 * Rename a view
 */
export async function renameFolderView(
  viewId: string,
  name: string
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("folder_views")
    .update({ name })
    .eq("id", viewId);

  if (error) {
    console.error("Error renaming folder view:", error);
    return false;
  }

  return true;
}
