"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, FileText, Search, MoreVertical, Trash2, 
  ChevronLeft, ChevronRight, Folder, FolderPlus,
  ChevronDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { NOTE_TEMPLATES, getTemplateForNote } from "@/lib/note-templates";

// Dynamically import RichEditor to avoid SSR issues with Tiptap
const RichEditor = dynamic(() => import("@/components/rich-editor").then(mod => mod.RichEditor), {
  ssr: false,
  loading: () => <div className="p-4 text-[#8B9A8F]">Loading editor...</div>
});

// Matches existing schema enum
type NoteType = "meeting" | "document" | "quick capture";

interface Note {
  id: string;
  title: string;
  content: string | null;
  note_type: NoteType;
  tags: string[];
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

interface FolderType {
  id: string;
  name: string;
  parent_id: string | null;
}

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  meeting: "📅 Meeting",
  document: "📄 Document",
  "quick capture": "⚡ Quick Capture",
};

const NOTE_TYPE_ICONS: Record<NoteType, string> = {
  meeting: "📅",
  document: "📄",
  "quick capture": "⚡",
};

const NOTE_TYPES: NoteType[] = ["meeting", "document", "quick capture"];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<NoteType | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isFoldersExpanded, setIsFoldersExpanded] = useState(true);
  
  // Folder dialog
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  // Local state for editor (prevents lag)
  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");
  
  // Editor key to force re-render when note changes
  const [editorKey, setEditorKey] = useState(0);
  
  const supabase = createClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch notes and folders on mount
  useEffect(() => {
    fetchNotes();
    fetchFolders();
  }, []);

  async function fetchNotes() {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setNotes(data);
      if (!selectedNote && data.length > 0) {
        setSelectedNote(data[0]);
      }
    }
    setIsLoading(false);
  }

  async function fetchFolders() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });

    if (!error && data) {
      setFolders(data);
    }
  }

  async function createNote(noteType: NoteType = "document") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const template = getTemplateForNote(noteType);

    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title: "Untitled",
        content: template,
        note_type: noteType,
        folder_id: selectedFolder === "unfiled" ? null : selectedFolder,
      })
      .select()
      .single();

    if (!error && data) {
      setNotes([data, ...notes]);
      setSelectedNote(data);
      setEditorKey(prev => prev + 1);
    }
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("folders")
      .insert({
        user_id: user.id,
        name: newFolderName.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setFolders([...folders, data]);
      setNewFolderName("");
      setFolderDialogOpen(false);
    }
  }

  async function deleteFolder(folderId: string) {
    await supabase
      .from("notes")
      .update({ folder_id: null })
      .eq("folder_id", folderId);

    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", folderId);

    if (!error) {
      setFolders(folders.filter(f => f.id !== folderId));
      if (selectedFolder === folderId) {
        setSelectedFolder(null);
      }
      fetchNotes();
    }
  }

  // Sync local state when selected note changes
  useEffect(() => {
    if (selectedNote) {
      setLocalTitle(selectedNote.title);
      setLocalContent(selectedNote.content || "");
      setEditorKey(prev => prev + 1);
    }
  }, [selectedNote?.id]);

  // Debounced save to Supabase
  const debouncedSave = useCallback((updates: Partial<Note>) => {
    if (!selectedNote) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setIsSaving(true);
    
    saveTimeoutRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from("notes")
        .update(updates)
        .eq("id", selectedNote.id);

      if (!error) {
        const updatedNote = { ...selectedNote, ...updates };
        setSelectedNote(updatedNote);
        setNotes(prev => prev.map(n => n.id === selectedNote.id ? updatedNote : n));
      }
      setIsSaving(false);
    }, 500);
  }, [selectedNote, supabase]);

  // Immediate save for dropdowns
  async function updateNoteImmediate(updates: Partial<Note>) {
    if (!selectedNote) return;
    setIsSaving(true);

    const { error } = await supabase
      .from("notes")
      .update(updates)
      .eq("id", selectedNote.id);

    if (!error) {
      const updatedNote = { ...selectedNote, ...updates };
      setSelectedNote(updatedNote);
      setNotes(notes.map(n => n.id === selectedNote.id ? updatedNote : n));
    }
    setIsSaving(false);
  }

  async function deleteNote(noteId: string) {
    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", noteId);

    if (!error) {
      const remaining = notes.filter(n => n.id !== noteId);
      setNotes(remaining);
      if (selectedNote?.id === noteId) {
        setSelectedNote(remaining[0] || null);
      }
    }
  }

  // Strip HTML for preview
  function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').slice(0, 100);
  }

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stripHtml(note.content || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || note.note_type === typeFilter;
    const matchesFolder = 
      selectedFolder === null || 
      (selectedFolder === "unfiled" ? !note.folder_id : note.folder_id === selectedFolder);
    return matchesSearch && matchesType && matchesFolder;
  });

  const notesInFolder = (folderId: string | null) => 
    notes.filter(n => n.folder_id === folderId).length;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#FAF8F5]">
      {/* Left Panel - Collapsible */}
      <div 
        className={cn(
          "border-r border-[#E8DCC4] flex flex-col bg-white transition-all duration-300",
          isPanelCollapsed ? "w-12" : "w-80"
        )}
      >
        {isPanelCollapsed ? (
          <div className="flex flex-col items-center py-4 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPanelCollapsed(false)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => createNote()}
              className="h-8 w-8 p-0 bg-[#2D5A47] hover:bg-[#1E3D32] text-white"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-[#E8DCC4]">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-lg font-serif font-semibold text-[#1E3D32]">Notes</h1>
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        className="bg-[#2D5A47] hover:bg-[#1E3D32] text-white"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        New
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => createNote("document")}>
                        📄 Document
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => createNote("meeting")}>
                        📅 Meeting Notes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => createNote("quick capture")}>
                        ⚡ Quick Capture
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPanelCollapsed(true)}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9A8F]" />
                <Input
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-[#F5F0E6] border-[#E8DCC4] focus:border-[#2D5A47]"
                />
              </div>

              {/* Type Filter Chips */}
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setTypeFilter("all")}
                  className={cn(
                    "px-2 py-1 text-xs rounded-full transition-colors",
                    typeFilter === "all"
                      ? "bg-[#2D5A47] text-white"
                      : "bg-[#F5F0E6] text-[#5C7A6B] hover:bg-[#E8DCC4]"
                  )}
                >
                  All
                </button>
                {NOTE_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={cn(
                      "px-2 py-1 text-xs rounded-full transition-colors",
                      typeFilter === type
                        ? "bg-[#2D5A47] text-white"
                        : "bg-[#F5F0E6] text-[#5C7A6B] hover:bg-[#E8DCC4]"
                    )}
                  >
                    {NOTE_TYPE_ICONS[type]} {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Folders Section */}
            <div className="border-b border-[#E8DCC4]">
              <button
                onClick={() => setIsFoldersExpanded(!isFoldersExpanded)}
                className="w-full p-3 flex items-center justify-between text-sm text-[#5C7A6B] hover:bg-[#FAF8F5]"
              >
                <span className="flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  Folders
                </span>
                {isFoldersExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {isFoldersExpanded && (
                <div className="px-2 pb-2">
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm rounded-md flex items-center justify-between",
                      selectedFolder === null
                        ? "bg-[#F5F0E6] text-[#1E3D32]"
                        : "text-[#5C7A6B] hover:bg-[#FAF8F5]"
                    )}
                  >
                    <span>All Notes</span>
                    <span className="text-xs text-[#8B9A8F]">{notes.length}</span>
                  </button>
                  
                  <button
                    onClick={() => setSelectedFolder("unfiled")}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm rounded-md flex items-center justify-between",
                      selectedFolder === "unfiled"
                        ? "bg-[#F5F0E6] text-[#1E3D32]"
                        : "text-[#5C7A6B] hover:bg-[#FAF8F5]"
                    )}
                  >
                    <span>Unfiled</span>
                    <span className="text-xs text-[#8B9A8F]">
                      {notes.filter(n => !n.folder_id).length}
                    </span>
                  </button>
                  
                  {folders.map((folder) => (
                    <div key={folder.id} className="group flex items-center">
                      <button
                        onClick={() => setSelectedFolder(folder.id)}
                        className={cn(
                          "flex-1 px-3 py-2 text-left text-sm rounded-md flex items-center justify-between",
                          selectedFolder === folder.id
                            ? "bg-[#F5F0E6] text-[#1E3D32]"
                            : "text-[#5C7A6B] hover:bg-[#FAF8F5]"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Folder className="w-3 h-3" />
                          {folder.name}
                        </span>
                        <span className="text-xs text-[#8B9A8F]">
                          {notesInFolder(folder.id)}
                        </span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => deleteFolder(folder.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => setFolderDialogOpen(true)}
                    className="w-full px-3 py-2 text-left text-sm text-[#8B9A8F] hover:bg-[#FAF8F5] rounded-md flex items-center gap-2"
                  >
                    <FolderPlus className="w-3 h-3" />
                    New Folder
                  </button>
                </div>
              )}
            </div>

            {/* Note List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-[#8B9A8F]">Loading...</div>
              ) : filteredNotes.length === 0 ? (
                <div className="p-4 text-center text-[#8B9A8F]">
                  {searchQuery || typeFilter !== "all" || selectedFolder 
                    ? "No notes found" 
                    : "No notes yet. Create one!"}
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={cn(
                      "p-3 border-b border-[#E8DCC4] cursor-pointer transition-colors group",
                      selectedNote?.id === note.id
                        ? "bg-[#F5F0E6]"
                        : "hover:bg-[#FAF8F5]"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span>{NOTE_TYPE_ICONS[note.note_type]}</span>
                          <h3 className="font-medium text-[#1E3D32] truncate">
                            {note.title || "Untitled"}
                          </h3>
                        </div>
                        <p className="text-xs text-[#8B9A8F] mt-1 line-clamp-2">
                          {stripHtml(note.content || "") || "No content"}
                        </p>
                        <p className="text-xs text-[#8B9A8F] mt-1">
                          {new Date(note.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNote(note.id);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Right Panel - Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            {/* Editor Header */}
            <div className="p-4 border-b border-[#E8DCC4] bg-white">
              <div className="flex items-center gap-4">
                <Input
                  value={localTitle}
                  onChange={(e) => {
                    setLocalTitle(e.target.value);
                    debouncedSave({ title: e.target.value });
                  }}
                  placeholder="Note title..."
                  className="text-xl font-serif font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0 flex-1"
                />
                
                <Select
                  value={selectedNote.note_type}
                  onValueChange={(value: NoteType) => updateNoteImmediate({ note_type: value })}
                >
                  <SelectTrigger className="w-44 bg-[#F5F0E6] border-[#E8DCC4]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NOTE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedNote.folder_id || "none"}
                  onValueChange={(value) => updateNoteImmediate({ folder_id: value === "none" ? null : value })}
                >
                  <SelectTrigger className="w-40 bg-[#F5F0E6] border-[#E8DCC4]">
                    <SelectValue placeholder="No folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No folder</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        📁 {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {isSaving && (
                  <span className="text-xs text-[#8B9A8F]">Saving...</span>
                )}
              </div>
            </div>

            {/* Rich Editor */}
            <div className="flex-1 overflow-hidden">
              <RichEditor
                key={editorKey}
                content={localContent}
                onChange={(content) => {
                  setLocalContent(content);
                  debouncedSave({ content });
                }}
                placeholder="Start writing..."
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#8B9A8F]">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select a note or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name..."
            onKeyDown={(e) => e.key === "Enter" && createFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createFolder} className="bg-[#2D5A47] hover:bg-[#1E3D32]">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
