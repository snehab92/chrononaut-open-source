"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import {
  Search, FileText, Plus, Folder, X, ChevronDown, ChevronUp,
  Star, Tag, FolderOpen, Pencil, Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MeetingEventBadge } from "@/components/notes/meeting-event-badge";

const RichEditor = dynamic(() => import("@/components/rich-editor").then(mod => mod.RichEditor), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center text-[#8B9A8F]">Loading editor...</div>
});

interface Note {
  id: string;
  title: string;
  content: string | null;
  note_type: string;
  tags: string[];
  folder_id: string | null;
  folder_name?: string;
  is_starred?: boolean;
  created_at: string;
  updated_at: string;
  calendar_event_id?: string | null;
}

interface FolderType {
  id: string;
  name: string;
  folder_type: string;
}

// Label colors
const LABEL_COLORS = [
  { bg: "bg-red-100", text: "text-red-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-yellow-100", text: "text-yellow-700" },
  { bg: "bg-lime-100", text: "text-lime-700" },
  { bg: "bg-green-100", text: "text-green-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
];

const NOTE_TYPES = ["meeting", "document", "quick capture"] as const;
type NoteType = typeof NOTE_TYPES[number];

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  meeting: "📅 Meeting",
  document: "📄 Document",
  "quick capture": "⚡ Quick Capture",
};

function getLabelColor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

// Tab state for each open note
interface TabNote {
  note: Note;
  localTitle: string;
  localContent: string;
  hasUnsavedChanges: boolean;
  editorKey: number;
}

interface FocusNoteEditorProps {
  initialNoteId?: string;
  onNoteCreated?: (noteId: string) => void;
}

export function FocusNoteEditor({ initialNoteId, onNoteCreated }: FocusNoteEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(false);

  // Multi-tab state
  const [openTabs, setOpenTabs] = useState<TabNote[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Get active tab
  const activeTab = openTabs.find(t => t.note.id === activeTabId);
  const selectedNote = activeTab?.note || null;
  const localTitle = activeTab?.localTitle || "";
  const localContent = activeTab?.localContent || "";
  const hasUnsavedChanges = activeTab?.hasUnsavedChanges || false;

  const [isSaving, setIsSaving] = useState(false);

  const [folders, setFolders] = useState<FolderType[]>([]);
  const [allLabels, setAllLabels] = useState<string[]>([]);

  // Empty note handling
  const [showSaveDeleteDialog, setShowSaveDeleteDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<"switch" | "close" | null>(null);
  const [pendingNote, setPendingNote] = useState<Note | null>(null);

  // Edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [showLabelPopover, setShowLabelPopover] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  // Fetch folders and all labels on mount
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch folders
      const { data: foldersData } = await supabase
        .from("folders")
        .select("id, name, folder_type")
        .eq("user_id", user.id)
        .eq("folder_type", "notebook");

      if (foldersData) {
        setFolders(foldersData);
      }

      // Fetch all unique labels from notes
      const { data: notesData } = await supabase
        .from("notes")
        .select("tags")
        .eq("user_id", user.id);

      if (notesData) {
        const labels = new Set<string>();
        notesData.forEach(n => {
          (n.tags || []).forEach((t: string) => labels.add(t));
        });
        setAllLabels(Array.from(labels).sort());
      }
    }
    fetchData();
  }, [supabase]);

  // Load initial note if provided
  useEffect(() => {
    if (initialNoteId) {
      loadNote(initialNoteId);
    }
  }, [initialNoteId]);

  // Search notes
  const searchNotes = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const searchTerm = `%${query}%`;

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      const enrichedNotes = data.map(note => {
        const folder = folders.find(f => f.id === note.folder_id);
        return {
          ...note,
          folder_name: folder?.name || "Unfiled",
        };
      });
      setSearchResults(enrichedNotes);
    }
    setIsSearching(false);
  }, [supabase, folders]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (showDropdown) {
        searchNotes(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, showDropdown, searchNotes]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load a note by ID
  const loadNote = async (noteId: string) => {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .single();

    if (!error && data) {
      const folder = folders.find(f => f.id === data.folder_id);
      const note = { ...data, folder_name: folder?.name || "Unfiled" };
      addNoteToTabs(note, true);
    }
  };

  // Check if note is empty (blank content and default title)
  const isNoteEmpty = (title: string, content: string) => {
    const strippedContent = content.replace(/<[^>]*>/g, '').trim();
    const isDefaultTitle = title === "Focus Note" || title === "Untitled" || !title.trim();
    return isDefaultTitle && !strippedContent;
  };

  // Delete a note permanently
  const deleteNote = async (noteId: string) => {
    await supabase.from("notes").delete().eq("id", noteId);
    closeTab(noteId);
  };

  // Handle adding a note from search - adds to tabs (can have multiple open)
  const handleNoteSwitch = (note: Note | null) => {
    if (note) {
      // Add to tabs (don't close current)
      addNoteToTabs(note, true);
    } else {
      // Close current tab
      clearNote();
    }
  };

  // Cleanup function to delete empty note (for dialog compatibility)
  const deleteEmptyNote = async () => {
    if (selectedNote) {
      await deleteNote(selectedNote.id);
    }
    setShowSaveDeleteDialog(false);
    setPendingNote(null);
    setPendingAction(null);
  };

  const keepEmptyNote = () => {
    setShowSaveDeleteDialog(false);
    setPendingNote(null);
    setPendingAction(null);
  };

  // Add note to tabs or switch to it if already open
  const addNoteToTabs = (note: Note, makeActive: boolean = true) => {
    const existingTab = openTabs.find(t => t.note.id === note.id);
    if (existingTab) {
      // Already open, just switch to it
      if (makeActive) {
        setActiveTabId(note.id);
      }
    } else {
      // Add new tab
      const newTab: TabNote = {
        note,
        localTitle: note.title,
        localContent: note.content || "",
        hasUnsavedChanges: false,
        editorKey: Date.now(),
      };
      setOpenTabs(prev => [...prev, newTab]);
      if (makeActive) {
        setActiveTabId(note.id);
      }
    }
    setSearchQuery("");
    setShowDropdown(false);
    setIsSearchCollapsed(true);
  };

  // Select a note from search (replaces current note or adds to tabs)
  const selectNote = (note: Note) => {
    addNoteToTabs(note, true);
  };

  // Close a tab (without deleting the note)
  const closeTab = (noteId: string) => {
    setOpenTabs(prev => prev.filter(t => t.note.id !== noteId));

    // If closing active tab, switch to another tab
    if (activeTabId === noteId) {
      const remainingTabs = openTabs.filter(t => t.note.id !== noteId);
      if (remainingTabs.length > 0) {
        setActiveTabId(remainingTabs[remainingTabs.length - 1].note.id);
      } else {
        setActiveTabId(null);
        setIsSearchCollapsed(false);
      }
    }
  };

  // Clear current note (close active tab)
  const clearNote = () => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  };

  // Create new note
  const createNewNote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title: "Focus Note",
        content: "",
        note_type: "document",
        folder_id: null,
        tags: [],
      })
      .select()
      .single();

    if (!error && data) {
      const note = { ...data, folder_name: "Unfiled" };
      addNoteToTabs(note, true);
      setIsEditingTitle(true);
      onNoteCreated?.(note.id);

      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  };

  // Helper to update a tab's state
  const updateTab = (noteId: string, updates: Partial<TabNote>) => {
    setOpenTabs(prev => prev.map(tab =>
      tab.note.id === noteId ? { ...tab, ...updates } : tab
    ));
  };

  // Helper to update a tab's note data
  const updateTabNote = (noteId: string, noteUpdates: Partial<Note>) => {
    setOpenTabs(prev => prev.map(tab =>
      tab.note.id === noteId ? { ...tab, note: { ...tab.note, ...noteUpdates } } : tab
    ));
  };

  // Auto-save logic
  const debouncedSave = useCallback(async (noteId: string, title: string, content: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Mark as having unsaved changes
    updateTab(noteId, { hasUnsavedChanges: true });

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);

      const { error } = await supabase
        .from("notes")
        .update({
          title,
          content,
          updated_at: new Date().toISOString()
        })
        .eq("id", noteId);

      if (!error) {
        updateTab(noteId, { hasUnsavedChanges: false });
        updateTabNote(noteId, { title, content });
      }
      setIsSaving(false);
    }, 1000);
  }, [supabase]);

  // Update title
  const handleTitleChange = (newTitle: string) => {
    if (!activeTabId) return;
    updateTab(activeTabId, { localTitle: newTitle });
    debouncedSave(activeTabId, newTitle, localContent);
  };

  // Update content
  const handleContentChange = (newContent: string) => {
    if (!activeTabId) return;
    updateTab(activeTabId, { localContent: newContent });
    debouncedSave(activeTabId, localTitle, newContent);
  };

  // Toggle starred
  const toggleStarred = async () => {
    if (!selectedNote) return;

    const newStarred = !selectedNote.is_starred;

    await supabase
      .from("notes")
      .update({ is_starred: newStarred })
      .eq("id", selectedNote.id);

    updateTabNote(selectedNote.id, { is_starred: newStarred });
  };

  // Update folder
  const updateFolder = async (folderId: string | null) => {
    if (!selectedNote) return;

    await supabase
      .from("notes")
      .update({ folder_id: folderId })
      .eq("id", selectedNote.id);

    const folder = folders.find(f => f.id === folderId);
    updateTabNote(selectedNote.id, {
      folder_id: folderId,
      folder_name: folder?.name || "Unfiled"
    });
  };

  // Update note type
  const updateNoteType = async (noteType: string) => {
    if (!selectedNote) return;

    await supabase
      .from("notes")
      .update({ note_type: noteType })
      .eq("id", selectedNote.id);

    updateTabNote(selectedNote.id, { note_type: noteType });
  };

  // Add label
  const addLabel = async (label: string) => {
    if (!selectedNote || !label.trim()) return;

    const newTags = [...(selectedNote.tags || [])];
    if (!newTags.includes(label.trim())) {
      newTags.push(label.trim());

      await supabase
        .from("notes")
        .update({ tags: newTags })
        .eq("id", selectedNote.id);

      updateTabNote(selectedNote.id, { tags: newTags });

      // Add to all labels if new
      if (!allLabels.includes(label.trim())) {
        setAllLabels([...allLabels, label.trim()].sort());
      }
    }

    setLabelInput("");
    setShowLabelPopover(false);
  };

  // Remove label
  const removeLabel = async (label: string) => {
    if (!selectedNote) return;

    const newTags = (selectedNote.tags || []).filter(t => t !== label);

    await supabase
      .from("notes")
      .update({ tags: newTags })
      .eq("id", selectedNote.id);

    updateTabNote(selectedNote.id, { tags: newTags });
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric" 
    });
  };

  // Strip HTML for preview
  const stripHtml = (html: string): string => {
    return html.replace(/<[^>]*>/g, '');
  };

  // Filtered labels for dropdown
  const filteredLabels = allLabels.filter(l => 
    l.toLowerCase().includes(labelInput.toLowerCase()) &&
    !(selectedNote?.tags || []).includes(l)
  );

  return (
    <>
      <Card className="flex-1 border-[#E8DCC4] flex flex-col min-h-0">
        <CardHeader
          className="pb-2 cursor-pointer flex-shrink-0 py-3"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#5C7A6B]" />
              <CardTitle className="text-sm">Notes</CardTitle>
              {isSaving && <span className="text-xs text-[#8B9A8F]">Saving...</span>}
              {hasUnsavedChanges && !isSaving && <span className="text-xs text-amber-600">Unsaved</span>}
            </div>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#8B9A8F]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#8B9A8F]" />
            )}
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
            {/* Note Picker / Search - collapsible when note selected */}
            {(!isSearchCollapsed || !selectedNote) && (
              <div className="relative mb-3" ref={dropdownRef}>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9A8F]" />
                    <Input
                      placeholder="Search notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setShowDropdown(true)}
                      className="pl-9 bg-[#F5F0E6] border-[#E8DCC4] h-9 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={createNewNote}
                    className="bg-[#2D5A47] hover:bg-[#1E3D32] text-white h-9"
                    title="New note"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Search Results Dropdown */}
                {showDropdown && (searchQuery || searchResults.length > 0) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E8DCC4] rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 text-center text-sm text-[#8B9A8F]">
                        Searching...
                      </div>
                    ) : searchResults.length === 0 && searchQuery ? (
                      <div className="p-4">
                        <p className="text-sm text-[#8B9A8F] mb-2">No notes found</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={createNewNote}
                          className="w-full border-[#E8DCC4]"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create new note
                        </Button>
                      </div>
                    ) : (
                      <div className="py-1">
                        {searchResults.map((note) => {
                          const label = note.tags?.[0];
                          const labelColor = label ? getLabelColor(label) : null;
                          
                          return (
                            <div
                              key={note.id}
                              onClick={() => handleNoteSwitch(note)}
                              className="px-3 py-2.5 hover:bg-[#F5F0E6] cursor-pointer border-b border-[#E8DCC4] last:border-b-0"
                            >
                              {/* Line 1: Title */}
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-[#1E3D32] truncate flex-1">
                                  {note.title || "Untitled"}
                                </span>
                              </div>
                              
                              {/* Line 2: Folder + Date + Label (anchored together) */}
                              <div className="flex items-center gap-2 text-xs text-[#8B9A8F]">
                                <Folder className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate max-w-24">{note.folder_name}</span>
                                <span>•</span>
                                <span className="whitespace-nowrap">{formatDate(note.updated_at)}</span>
                                {label && labelColor && (
                                  <>
                                    <span>•</span>
                                    <span className={cn(
                                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap",
                                      labelColor.bg, labelColor.text
                                    )}>
                                      {label}
                                    </span>
                                  </>
                                )}
                              </div>
                              
                              {/* Preview snippet */}
                              {note.content && (
                                <p className="text-xs text-[#8B9A8F] mt-1 line-clamp-1">
                                  {stripHtml(note.content).slice(0, 80)}...
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Note Toolbar - shows when note selected */}
            {selectedNote && (
              <div
                className="flex items-center gap-2 mb-2 pb-2 border-b border-[#E8DCC4]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Expand search button */}
                {isSearchCollapsed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSearchCollapsed(false)}
                    className="h-7 w-7 p-0"
                    title="Search notes"
                  >
                    <Search className="w-3.5 h-3.5 text-[#8B9A8F]" />
                  </Button>
                )}
                
                {/* New note button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={createNewNote}
                  className="h-7 w-7 p-0"
                  title="New note"
                >
                  <Plus className="w-3.5 h-3.5 text-[#8B9A8F]" />
                </Button>

                {/* Editable Title + Label (left side) */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isEditingTitle ? (
                    <Input
                      ref={titleInputRef}
                      value={localTitle}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      onBlur={() => setIsEditingTitle(false)}
                      onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
                      className="h-7 text-sm font-medium flex-1 bg-transparent border-[#E8DCC4]"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className="text-left text-sm font-medium text-[#1E3D32] hover:text-[#2D5A47] truncate flex items-center gap-1"
                    >
                      {localTitle || "Untitled"}
                      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                    </button>
                  )}

                  {/* Label - positioned near title like notes screen */}
                  <Popover open={showLabelPopover} onOpenChange={setShowLabelPopover}>
                    <PopoverTrigger asChild>
                      {selectedNote.tags?.[0] ? (
                        <button
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 hover:opacity-80 transition-opacity",
                            getLabelColor(selectedNote.tags[0]).bg,
                            getLabelColor(selectedNote.tags[0]).text
                          )}
                        >
                          {selectedNote.tags[0]}
                          <Pencil className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      ) : (
                        <button className="text-xs text-[#8B9A8F] hover:text-[#5C7A6B] flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#F5F0E6]">
                          <Tag className="w-3 h-3" />
                          <span>Add label</span>
                        </button>
                      )}
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="start">
                      {/* Current labels */}
                      {(selectedNote.tags?.length || 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {selectedNote.tags?.map((tag) => {
                            const color = getLabelColor(tag);
                            return (
                              <span
                                key={tag}
                                className={cn(
                                  "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                                  color.bg, color.text
                                )}
                              >
                                {tag}
                                <button onClick={() => removeLabel(tag)}>
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Add label input */}
                      <Input
                        placeholder="Add label..."
                        value={labelInput}
                        onChange={(e) => setLabelInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && labelInput.trim()) {
                            addLabel(labelInput);
                          }
                        }}
                        className="h-8 text-xs"
                      />

                      {/* Existing labels */}
                      {filteredLabels.length > 0 && (
                        <div className="mt-2 max-h-32 overflow-y-auto">
                          {filteredLabels.slice(0, 5).map((label) => (
                            <button
                              key={label}
                              onClick={() => addLabel(label)}
                              className="block w-full text-left px-2 py-1 text-xs hover:bg-[#F5F0E6] rounded"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center gap-1 ml-auto">
                  {/* Star */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleStarred}
                    className={cn("h-7 w-7 p-0", selectedNote.is_starred && "text-amber-500")}
                    title={selectedNote.is_starred ? "Unstar" : "Star"}
                  >
                    <Star className={cn("w-3.5 h-3.5", selectedNote.is_starred && "fill-current")} />
                  </Button>

                  {/* Folder Select */}
                  <Select
                    value={selectedNote.folder_id || "unfiled"}
                    onValueChange={(v) => updateFolder(v === "unfiled" ? null : v)}
                  >
                    <SelectTrigger className="h-7 w-auto min-w-[100px] gap-1 border border-[#E8DCC4] bg-[#F5F0E6] hover:bg-[#E8DCC4] text-xs px-2 rounded">
                      <FolderOpen className="w-3 h-3 text-[#5C7A6B] flex-shrink-0" />
                      <SelectValue placeholder="Select folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unfiled">📁 Unfiled</SelectItem>
                      {folders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>📁 {f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Note Type Select */}
                  <Select
                    value={selectedNote.note_type}
                    onValueChange={updateNoteType}
                  >
                    <SelectTrigger className="h-7 w-auto min-w-[110px] gap-1 border border-[#E8DCC4] bg-[#F5F0E6] hover:bg-[#E8DCC4] text-xs px-2 rounded">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {NOTE_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Delete note */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectedNote && deleteNote(selectedNote.id)}
                    className="h-7 w-7 p-0 hover:text-red-600"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#8B9A8F]" />
                  </Button>

                  {/* Close note */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNoteSwitch(null)}
                    className="h-7 w-7 p-0"
                    title="Close note"
                  >
                    <X className="w-3.5 h-3.5 text-[#8B9A8F]" />
                  </Button>
                </div>
              </div>
            )}

            {/* Horizontal Tabs - shows when multiple notes open */}
            {openTabs.length > 1 && (
              <div className="flex items-center gap-1 mb-2 pb-2 border-b border-[#E8DCC4] overflow-x-auto">
                {openTabs.map((tab) => {
                  const isActive = tab.note.id === activeTabId;
                  return (
                    <button
                      key={tab.note.id}
                      onClick={() => setActiveTabId(tab.note.id)}
                      className={cn(
                        "relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap group",
                        isActive
                          ? "bg-[#2D5A47] text-white"
                          : "bg-[#F5F0E6] text-[#5C7A6B] hover:bg-[#E8DCC4]"
                      )}
                    >
                      <span className="max-w-24 truncate">{tab.localTitle || "Untitled"}</span>
                      {tab.hasUnsavedChanges && (
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.note.id);
                        }}
                        className={cn(
                          "ml-1 p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity",
                          isActive ? "hover:bg-white/20" : "hover:bg-[#8B9A8F]/20"
                        )}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Meeting Event Badge - shown for meeting notes with linked calendar event */}
            {selectedNote && selectedNote.note_type === "meeting" && selectedNote.calendar_event_id && (
              <div className="mb-2">
                <MeetingEventBadge
                  calendarEventId={selectedNote.calendar_event_id}
                />
              </div>
            )}

            {/* Editor */}
            <div className="flex-1 min-h-0 border border-[#E8DCC4] rounded-lg overflow-hidden bg-white">
              {selectedNote ? (
                <div className="h-full overflow-y-auto">
                  <RichEditor
                    key={activeTab?.editorKey || 0}
                    content={localContent}
                    onChange={handleContentChange}
                    placeholder="Start writing... (use / for formatting commands)"
                    noteId={selectedNote.id}
                    hideToolbar
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-[#8B9A8F]">
                  <div className="text-center p-6">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm mb-3">Search for a note or create a new one</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={createNewNote}
                      className="border-[#E8DCC4]"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Focus Note
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Save or Delete Empty Note Dialog */}
      <Dialog open={showSaveDeleteDialog} onOpenChange={setShowSaveDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Empty Note</DialogTitle>
            <DialogDescription>
              This note is empty. Would you like to keep it or delete it?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={keepEmptyNote}
            >
              Keep Note
            </Button>
            <Button
              variant="destructive"
              onClick={deleteEmptyNote}
            >
              Delete Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
