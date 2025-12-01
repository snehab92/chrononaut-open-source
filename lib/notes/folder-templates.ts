import { createClient } from "@/lib/supabase/client";
import { FolderTemplate, NoteType } from "./types";

/**
 * Get the active template for a folder
 */
export async function getFolderTemplate(
  folderId: string
): Promise<FolderTemplate | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("folder_templates")
    .select("*")
    .eq("folder_id", folderId)
    .eq("is_active", true)
    .single();

  if (error) {
    // No template found is not an error
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching folder template:", error);
    return null;
  }

  return data;
}

/**
 * Get all templates for a folder (including inactive)
 */
export async function getAllFolderTemplates(
  folderId: string
): Promise<FolderTemplate[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("folder_templates")
    .select("*")
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching folder templates:", error);
    return [];
  }

  return data || [];
}

/**
 * Create or update a folder template
 */
export async function saveFolderTemplate(
  folderId: string,
  userId: string,
  template: {
    name: string;
    default_content?: string | null;
    default_note_type?: NoteType;
    default_label?: string | null;
    ai_prompt?: string | null;
  }
): Promise<FolderTemplate | null> {
  const supabase = createClient();

  // Check if there's already a template for this folder
  const { data: existing } = await supabase
    .from("folder_templates")
    .select("id")
    .eq("folder_id", folderId)
    .eq("is_active", true)
    .single();

  if (existing) {
    // Update existing template
    const { data, error } = await supabase
      .from("folder_templates")
      .update({
        name: template.name,
        default_content: template.default_content ?? null,
        default_note_type: template.default_note_type ?? "document",
        default_label: template.default_label ?? null,
        ai_prompt: template.ai_prompt ?? null,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating folder template:", error);
      return null;
    }

    return data;
  } else {
    // Create new template
    const { data, error } = await supabase
      .from("folder_templates")
      .insert({
        user_id: userId,
        folder_id: folderId,
        name: template.name,
        default_content: template.default_content ?? null,
        default_note_type: template.default_note_type ?? "document",
        default_label: template.default_label ?? null,
        ai_prompt: template.ai_prompt ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating folder template:", error);
      return null;
    }

    return data;
  }
}

/**
 * Delete a folder template
 */
export async function deleteFolderTemplate(
  templateId: string
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("folder_templates")
    .delete()
    .eq("id", templateId);

  if (error) {
    console.error("Error deleting folder template:", error);
    return false;
  }

  return true;
}

/**
 * Deactivate a template (soft delete - keeps the data but doesn't apply to new notes)
 */
export async function deactivateFolderTemplate(
  templateId: string
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("folder_templates")
    .update({ is_active: false })
    .eq("id", templateId);

  if (error) {
    console.error("Error deactivating folder template:", error);
    return false;
  }

  return true;
}

/**
 * Activate a template (and deactivate any other active template for the same folder)
 */
export async function activateFolderTemplate(
  templateId: string,
  folderId: string
): Promise<boolean> {
  const supabase = createClient();

  // Deactivate all other templates for this folder
  await supabase
    .from("folder_templates")
    .update({ is_active: false })
    .eq("folder_id", folderId);

  // Activate the selected template
  const { error } = await supabase
    .from("folder_templates")
    .update({ is_active: true })
    .eq("id", templateId);

  if (error) {
    console.error("Error activating folder template:", error);
    return false;
  }

  return true;
}
