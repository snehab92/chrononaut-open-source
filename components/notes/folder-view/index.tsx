"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FolderExportMenu } from "@/components/notes/folder-export-menu";
import { ImportDialog } from "@/components/notes/import-dialog";
import { ImportResult } from "@/lib/notes/import";
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
import { getFolderTemplate } from "@/lib/notes/folder-templates";
import { ViewSelector } from "./view-selector";
import { ViewToolbar } from "./view-toolbar";
import { DatabaseView } from "./database-view";
import { GalleryView } from "./gallery-view";
import { KanbanView } from "./kanban-view";
import { TemplateDialog } from "./template-dialog";
import { NewNoteButton } from "./new-note-button";

// Re-export UnfiledView and AllNotesView for use from this module
export { UnfiledView } from "./unfiled-view";
export { AllNotesView } from "./all-notes-view";

interface FolderViewProps {
  folder: FolderType;
  notes: Note[];
  userId: string;
  allLabels: string[];
  allFolders: FolderType[];
  onSelectNote: (note: Note) => void;
  onCreateNote: (folderId: string) => Promise<void>;
  onUpdateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  onDeleteNote?: (noteId: string) => Promise<void>;
  onCreateFolder: (name: string) => Promise<FolderType | null>;
  onImportNote?: (folderId: string, result: ImportResult) => Promise<void>;
}

export function FolderView({
  folder,
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
}: FolderViewProps) {
  const [views, setViews] = useState<FolderViewType[]>([]);
  const [activeView, setActiveView] = useState<FolderViewType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Debounce timer for config saves
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load views for this folder
  useEffect(() => {
    async function loadViews() {
      setIsLoading(true);

      // Get all views for this folder
      const folderViews = await fetchFolderViews(folder.id);
      setViews(folderViews);

      // Get or create default view
      const defaultView = await getOrCreateDefaultView(folder.id, userId);
      if (defaultView) {
        setActiveView(defaultView);
        // If this was a new view, add it to the list
        if (!folderViews.find((v) => v.id === defaultView.id)) {
          setViews([defaultView, ...folderViews]);
        }
      }

      setIsLoading(false);
    }

    loadViews();
  }, [folder.id, userId]);

  // Handle view config change with debounced save
  const handleConfigChange = useCallback(
    (newConfig: ViewConfig) => {
      if (!activeView) return;

      // Update local state immediately
      setActiveView((prev) =>
        prev ? { ...prev, config: newConfig } : null
      );
      setViews((prev) =>
        prev.map((v) =>
          v.id === activeView.id ? { ...v, config: newConfig } : v
        )
      );

      // Debounce the save
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

  // Create a new view
  const handleCreateView = useCallback(async () => {
    const newView = await createFolderView(
      folder.id,
      userId,
      `View ${views.length + 1}`,
      "database",
      DEFAULT_VIEW_CONFIG
    );
    if (newView) {
      setViews((prev) => [...prev, newView]);
      setActiveView(newView);
    }
  }, [folder.id, userId, views.length]);

  // Delete a view
  const handleDeleteView = useCallback(
    async (viewId: string) => {
      const success = await deleteFolderView(viewId);
      if (success) {
        setViews((prev) => prev.filter((v) => v.id !== viewId));
        // If we deleted the active view, switch to another
        if (activeView?.id === viewId) {
          const remaining = views.filter((v) => v.id !== viewId);
          if (remaining.length > 0) {
            setActiveView(remaining[0]);
          } else {
            // Create a new default view
            const newView = await getOrCreateDefaultView(folder.id, userId);
            if (newView) {
              setActiveView(newView);
              setViews([newView]);
            }
          }
        }
      }
    },
    [activeView, views, folder.id, userId]
  );

  // Rename a view
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

  // Handle view type change
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
      // Save view type immediately
      updateViewConfig(activeView.id, newConfig);
    },
    [activeView, handleConfigChange]
  );

  // Apply filters and sorting to notes
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

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (config.sortField) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "updated_at":
          comparison =
            new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case "created_at":
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "note_type":
          comparison = a.note_type.localeCompare(b.note_type);
          break;
        case "is_starred":
          comparison = (a.is_starred ? 1 : 0) - (b.is_starred ? 1 : 0);
          break;
      }
      return config.sortDirection === "desc" ? -comparison : comparison;
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
          <h1 className="text-lg font-semibold text-[#1E3D32]">{folder.name}</h1>
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
            folderName={folder.name}
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
          <NewNoteButton
            folderId={folder.id}
            onCreateNote={async (templateId) => {
              if (templateId) {
                // Get template and apply its defaults
                const template = await getFolderTemplate(folder.id);
                // onCreateNote will apply template defaults via folder.id
              }
              await onCreateNote(folder.id);
            }}
          />
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
            folderId={folder.id}
            onManageTemplates={() => setShowTemplateDialog(true)}
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
            <div className="text-4xl mb-3">📁</div>
            <p className="text-sm">No notes in this folder</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCreateNote(folder.id)}
              className="mt-2 text-[#1E3D32]"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create your first note
            </Button>
          </div>
        )}
      </div>

      {/* Template Dialog */}
      <TemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        folderId={folder.id}
        userId={userId}
        allLabels={allLabels}
      />

      {/* Import Dialog */}
      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        mode="new"
        title={`Import into ${folder.name}`}
        onImport={async (result: ImportResult) => {
          if (onImportNote) {
            await onImportNote(folder.id, result);
          } else {
            // Fallback: create note then update it manually
            await onCreateNote(folder.id);
          }
        }}
      />
    </div>
  );
}
