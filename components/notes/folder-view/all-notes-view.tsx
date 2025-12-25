"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, FolderOpen, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Note,
  FolderType,
  FolderView as FolderViewType,
  ViewConfig,
  DEFAULT_VIEW_CONFIG,
} from "@/lib/notes/types";
import {
  fetchFolderViews,
  getOrCreateDefaultView,
  createFolderView,
  updateViewConfig,
  deleteFolderView,
  renameFolderView,
} from "@/lib/notes/folder-views";
import { createClient } from "@/lib/supabase/client";
import { ViewSelector } from "./view-selector";
import { ViewToolbar } from "./view-toolbar";
import { DatabaseView } from "./database-view";
import { GalleryView } from "./gallery-view";
import { KanbanView } from "./kanban-view";
import { FolderExportMenu } from "@/components/notes/folder-export-menu";
import { ImportDialog } from "@/components/notes/import-dialog";
import { ImportResult } from "@/lib/notes/import";

interface AllNotesViewProps {
  notes: Note[];
  userId: string;
  allLabels: string[];
  allFolders: FolderType[];
  onSelectNote: (note: Note) => void;
  onCreateNote: () => Promise<void>;
  onUpdateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  onDeleteNote?: (noteId: string) => Promise<void>;
  onCreateFolder: (name: string) => Promise<FolderType | null>;
  onImportNote?: (result: ImportResult) => Promise<void>;
}

export function AllNotesView({
  notes,
  userId,
  allLabels,
  allFolders,
  onSelectNote,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onCreateFolder,
  onImportNote,
}: AllNotesViewProps) {
  const [views, setViews] = useState<FolderViewType[]>([]);
  const [activeView, setActiveView] = useState<FolderViewType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const supabase = createClient();

  // For all notes, we store views with a special folder_id
  useEffect(() => {
    async function loadViews() {
      setIsLoading(true);

      // Create or get the special all notes folder for storing views
      let allNotesFolderId: string;

      const { data: existingFolder } = await supabase
        .from("folders")
        .select("id")
        .eq("user_id", userId)
        .eq("name", "__all_notes_views__")
        .eq("folder_type", "notebook")
        .single();

      if (existingFolder) {
        allNotesFolderId = existingFolder.id;
      } else {
        const { data: newFolder } = await supabase
          .from("folders")
          .insert({
            user_id: userId,
            name: "__all_notes_views__",
            folder_type: "notebook",
          })
          .select()
          .single();

        if (newFolder) {
          allNotesFolderId = newFolder.id;
        } else {
          setIsLoading(false);
          return;
        }
      }

      // Get views for all notes
      const folderViews = await fetchFolderViews(allNotesFolderId);
      setViews(folderViews);

      // Get or create default view
      const defaultView = await getOrCreateDefaultView(allNotesFolderId, userId);
      if (defaultView) {
        setActiveView(defaultView);
        if (!folderViews.find((v) => v.id === defaultView.id)) {
          setViews([defaultView, ...folderViews]);
        }
      }

      setIsLoading(false);
    }

    loadViews();
  }, [userId, supabase]);

  const handleConfigChange = useCallback(
    (newConfig: ViewConfig) => {
      if (!activeView) return;

      setActiveView((prev) =>
        prev ? { ...prev, config: newConfig } : null
      );
      setViews((prev) =>
        prev.map((v) =>
          v.id === activeView.id ? { ...v, config: newConfig } : v
        )
      );

      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      const timeout = setTimeout(() => {
        updateViewConfig(activeView.id, newConfig);
      }, 500);
      setSaveTimeout(timeout);
    },
    [activeView, saveTimeout]
  );

  const handleCreateView = useCallback(async () => {
    if (!activeView) return;

    const newView = await createFolderView(
      activeView.folder_id,
      userId,
      `View ${views.length + 1}`,
      "database",
      DEFAULT_VIEW_CONFIG
    );
    if (newView) {
      setViews((prev) => [...prev, newView]);
      setActiveView(newView);
    }
  }, [activeView, userId, views.length]);

  const handleDeleteView = useCallback(
    async (viewId: string) => {
      const success = await deleteFolderView(viewId);
      if (success) {
        setViews((prev) => prev.filter((v) => v.id !== viewId));
        if (activeView?.id === viewId) {
          const remaining = views.filter((v) => v.id !== viewId);
          if (remaining.length > 0) {
            setActiveView(remaining[0]);
          }
        }
      }
    },
    [activeView, views]
  );

  const handleRenameView = useCallback(
    async (viewId: string, name: string) => {
      const success = await renameFolderView(viewId, name);
      if (success) {
        setViews((prev) =>
          prev.map((v) => (v.id === viewId ? { ...v, name } : v))
        );
        if (activeView?.id === viewId) {
          setActiveView((prev) => (prev ? { ...prev, name } : null));
        }
      }
    },
    [activeView]
  );

  const handleViewTypeChange = useCallback(
    (viewType: "database" | "kanban" | "gallery") => {
      if (!activeView) return;
      const newConfig = {
        ...activeView.config,
        groupByField: viewType === "kanban" ? "tags" as const : null,
      };
      handleConfigChange(newConfig);
      setActiveView((prev) =>
        prev ? { ...prev, view_type: viewType, config: newConfig } : null
      );
      setViews((prev) =>
        prev.map((v) =>
          v.id === activeView.id
            ? { ...v, view_type: viewType, config: newConfig }
            : v
        )
      );
      updateViewConfig(activeView.id, newConfig);
    },
    [activeView, handleConfigChange]
  );

  // Apply filters and sorting
  const getFilteredAndSortedNotes = useCallback(() => {
    if (!activeView) return notes;

    let result = [...notes];
    const config = activeView.config;

    // Apply filters
    config.filters.forEach((filter) => {
      switch (filter.field) {
        case "is_starred":
          if (filter.operator === "eq") {
            result = result.filter((n) => n.is_starred === filter.value);
          }
          break;
        case "note_type":
          if (filter.operator === "eq") {
            result = result.filter((n) => n.note_type === filter.value);
          }
          break;
        case "tags":
          if (filter.operator === "contains" && typeof filter.value === "string") {
            result = result.filter((n) => n.tags.includes(filter.value as string));
          } else if (filter.operator === "is_empty") {
            result = result.filter((n) => n.tags.length === 0);
          } else if (filter.operator === "is_not_empty") {
            result = result.filter((n) => n.tags.length > 0);
          }
          break;
      }
    });

    // Apply multi-sort
    const sortRules = config.sortRules || [{ field: config.sortField, direction: config.sortDirection }];

    result.sort((a, b) => {
      for (const rule of sortRules) {
        let comparison = 0;
        switch (rule.field) {
          case "title":
            comparison = a.title.localeCompare(b.title);
            break;
          case "updated_at":
            comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
            break;
          case "created_at":
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
          case "note_type":
            comparison = a.note_type.localeCompare(b.note_type);
            break;
          case "is_starred":
            comparison = (a.is_starred ? 1 : 0) - (b.is_starred ? 1 : 0);
            break;
        }
        if (comparison !== 0) {
          return rule.direction === "desc" ? -comparison : comparison;
        }
      }
      return 0;
    });

    // Starred notes always first
    result.sort((a, b) => (b.is_starred ? 1 : 0) - (a.is_starred ? 1 : 0));

    return result;
  }, [notes, activeView]);

  const filteredNotes = getFilteredAndSortedNotes();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-[#8B9A8F]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8DCC4]">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-[#5C7A6B]" />
          <h1 className="text-lg font-semibold text-[#1E3D32]">All Notes</h1>
          <span className="text-sm text-[#8B9A8F]">
            {filteredNotes.length} note{filteredNotes.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <FolderExportMenu
            notes={filteredNotes.map(n => ({
              id: n.id,
              title: n.title,
              content: n.content,
              note_type: n.note_type,
              tags: n.tags,
              created_at: n.created_at,
            }))}
            folderName="All Notes"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowImportDialog(true)}
            className="gap-1.5 text-[#5C7A6B] hover:text-[#1E3D32] hover:bg-[#F5F0E6]"
          >
            <Upload className="w-4 h-4" />
            <span className="text-xs font-medium">Import</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateNote}
            className="gap-1.5 text-[#5C7A6B] hover:text-[#1E3D32] hover:bg-[#F5F0E6]"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-medium">New Note</span>
          </Button>
        </div>
      </div>

      {/* View Selector and Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#E8DCC4] bg-[#FAF8F5]">
        <ViewSelector
          views={views}
          activeViewId={activeView?.id || null}
          onSelectView={(viewId) => {
            const view = views.find((v) => v.id === viewId);
            if (view) setActiveView(view);
          }}
          onCreateView={handleCreateView}
          onDeleteView={handleDeleteView}
          onRenameView={handleRenameView}
        />
        {activeView && (
          <ViewToolbar
            viewType={activeView.view_type}
            config={activeView.config}
            allLabels={allLabels}
            onViewTypeChange={handleViewTypeChange}
            onConfigChange={handleConfigChange}
          />
        )}
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-auto">
        {activeView?.view_type === "database" && (
          <DatabaseView
            notes={filteredNotes}
            config={activeView.config}
            allLabels={allLabels}
            folders={allFolders}
            onConfigChange={handleConfigChange}
            onSelectNote={onSelectNote}
            onUpdateNote={onUpdateNote}
            onDeleteNote={onDeleteNote}
            onCreateFolder={onCreateFolder}
          />
        )}
        {activeView?.view_type === "gallery" && (
          <GalleryView
            notes={filteredNotes}
            onSelectNote={onSelectNote}
          />
        )}
        {activeView?.view_type === "kanban" && (
          <KanbanView
            notes={filteredNotes}
            allLabels={allLabels}
            onSelectNote={onSelectNote}
            onUpdateNote={onUpdateNote}
          />
        )}
        {filteredNotes.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-[#8B9A8F]">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-sm">No notes yet</p>
            <p className="text-xs mt-1">Create your first note to get started</p>
          </div>
        )}
      </div>

      {/* Import Dialog */}
      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        mode="new"
        title="Import to All Notes"
        onImport={async (result: ImportResult) => {
          if (onImportNote) {
            await onImportNote(result);
          } else {
            // Fallback: create note
            await onCreateNote();
          }
        }}
      />
    </div>
  );
}
