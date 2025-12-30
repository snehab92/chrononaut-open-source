"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, FileText, Search, MoreVertical, Trash2, 
  ChevronLeft, ChevronRight, Folder, FolderOpen, Inbox,
  ChevronDown, ChevronUp, Star, Filter, SortAsc, SortDesc,
  BookOpen, Pencil, Tag, X
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
import { useChatDrawer } from "@/components/chat/chat-provider";
import { AboutMeSection } from "@/components/notes/about-me-section";
import { FolderView, UnfiledView, AllNotesView } from "@/components/notes/folder-view";
import { getFolderTemplate } from "@/lib/notes/folder-templates";
import { FolderType as FolderViewType } from "@/lib/notes/types";
import { MeetingEventBadge } from "@/components/notes/meeting-event-badge";
import { ExportImportMenu } from "@/components/notes/export-import-menu";
import { ImportDialog } from "@/components/notes/import-dialog";
import { ImportResult } from "@/lib/notes/import";

const RichEditor = dynamic(() => import("@/components/rich-editor").then(mod => mod.RichEditor), {
  ssr: false,
  loading: () => <div className="p-4 text-[#8B9A8F]">Loading editor...</div>
});

type NoteType = "meeting" | "document" | "quick capture";

interface Note {
  id: string;
  title: string;
  content: string | null;
  note_type: NoteType;
  tags: string[];
  folder_id: string | null;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
  calendar_event_id?: string | null;
}

interface FolderType {
  id: string;
  name: string;
  parent_id: string | null;
  folder_type: "notebook" | "ai_conversations";
}

const NOTE_TYPE_ICONS: Record<NoteType, string> = {
  meeting: "📅",
  document: "📄",
  "quick capture": "⚡",
};

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  meeting: "📅 Meeting",
  document: "📄 Document",
  "quick capture": "⚡ Quick Capture",
};

const NOTE_TYPES: NoteType[] = ["meeting", "document", "quick capture"];

// Label colors - auto-assigned based on label name hash
const LABEL_COLORS = [
  { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" },
  { bg: "bg-lime-100", text: "text-lime-700", border: "border-lime-200" },
  { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
  { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200" },
  { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-200" },
  { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
  { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700", border: "border-fuchsia-200" },
  { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
];

function getLabelColor(label: string) {
  // Simple hash to get consistent color per label
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewingFolder, setViewingFolder] = useState<FolderType | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [cameFromFolder, setCameFromFolder] = useState<FolderType | null>(null);
  const [cameFromUnfiled, setCameFromUnfiled] = useState(false);
  const [cameFromAllNotes, setCameFromAllNotes] = useState(false);
  const [viewingUnfiled, setViewingUnfiled] = useState(false);
  const [viewingAllNotes, setViewingAllNotes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<NoteType | "all">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "alpha">("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  
  const [isNotebookExpanded, setIsNotebookExpanded] = useState(true);
  
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  // Context menu for folder right-click
  const [contextMenuFolder, setContextMenuFolder] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  
  // Rename folder dialog
  const [renameFolderDialogOpen, setRenameFolderDialogOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");
  
  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Label input state
  const [labelInputValue, setLabelInputValue] = useState("");
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  const supabase = createClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isOpen: isChatOpen } = useChatDrawer();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    fetchNotes();
    fetchFolders();
  }, []);

  // Handle URL query param to auto-select note (e.g., from dashboard meeting note link)
  useEffect(() => {
    const noteId = searchParams.get("id");
    if (noteId && notes.length > 0 && folders.length >= 0) {
      const matchingNote = notes.find(n => n.id === noteId);
      if (matchingNote) {
        setSelectedNote(matchingNote);
        // Clear any folder/unfiled views to show the editor
        setViewingFolder(null);
        setViewingUnfiled(false);
        setViewingAllNotes(false);

        // Set "came from" state based on note's folder so user can navigate back
        if (matchingNote.folder_id) {
          const noteFolder = folders.find(f => f.id === matchingNote.folder_id);
          if (noteFolder) {
            setCameFromFolder(noteFolder);
            setCameFromUnfiled(false);
            setCameFromAllNotes(false);
          }
        } else {
          // Note is unfiled
          setCameFromUnfiled(true);
          setCameFromFolder(null);
          setCameFromAllNotes(false);
        }

        // Clear the query param from URL after opening
        router.replace("/notes", { scroll: false });
      }
    }
  }, [searchParams, notes, folders, router]);

  async function fetchNotes() {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

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
      // Clean up duplicate AI folders and Therapist folder
      const aiConvFolders = data.filter(f => f.folder_type === "ai_conversations");
      const execCoachFolders = aiConvFolders.filter(f => f.name === "Executive Coach");
      const researchFolders = aiConvFolders.filter(f => f.name === "Research Assistant");
      const therapistFolders = aiConvFolders.filter(f => f.name === "Therapist");
      
      // Delete duplicates and Therapist folders
      if (execCoachFolders.length > 1) {
        for (let i = 1; i < execCoachFolders.length; i++) {
          await supabase.from("folders").delete().eq("id", execCoachFolders[i].id);
        }
      }
      if (researchFolders.length > 1) {
        for (let i = 1; i < researchFolders.length; i++) {
          await supabase.from("folders").delete().eq("id", researchFolders[i].id);
        }
      }
      // Delete ALL Therapist folders (moving to Journal screen)
      for (const folder of therapistFolders) {
        await supabase.from("folders").delete().eq("id", folder.id);
      }
      
      // Keep only unique folders, excluding Therapist
      const uniqueFolders = data.filter(f => {
        if (f.name === "Therapist" && f.folder_type === "ai_conversations") return false;
        if (f.folder_type !== "ai_conversations") return true;
        if (f.name === "Executive Coach") return f.id === execCoachFolders[0]?.id;
        if (f.name === "Research Assistant") return f.id === researchFolders[0]?.id;
        return true;
      });
      
      setFolders(uniqueFolders);
      await ensureAiAgentFolders(user.id, uniqueFolders);
    }
  }

  async function ensureAiAgentFolders(userId: string, existingFolders: FolderType[]) {
    const agentFolders = [
      { name: "Executive Coach" },
      { name: "Research Assistant" },
    ];
    
    for (const agentFolder of agentFolders) {
      const exists = existingFolders.some(
        f => f.name === agentFolder.name && f.folder_type === "ai_conversations"
      );
      
      if (!exists) {
        const { data: newFolder } = await supabase
          .from("folders")
          .insert({
            user_id: userId,
            name: agentFolder.name,
            folder_type: "ai_conversations",
          })
          .select()
          .single();
        
        if (newFolder) {
          setFolders(prev => [...prev, newFolder]);
        }
      }
    }
  }

  async function createNote(noteType: NoteType = "document", folderId?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const targetFolderId = folderId || (selectedFolder === "unfiled" ? null : selectedFolder);

    // Check if folder has a template
    let content = getTemplateForNote(noteType);
    let finalNoteType = noteType;
    let defaultTags: string[] = [];

    if (targetFolderId) {
      const folderTemplate = await getFolderTemplate(targetFolderId);
      if (folderTemplate) {
        if (folderTemplate.default_content) {
          content = folderTemplate.default_content;
        }
        if (folderTemplate.default_note_type) {
          finalNoteType = folderTemplate.default_note_type as NoteType;
          // If template has content, use it; otherwise use the note type template
          if (!folderTemplate.default_content) {
            content = getTemplateForNote(finalNoteType);
          }
        }
        if (folderTemplate.default_label) {
          defaultTags = [folderTemplate.default_label];
        }
      }
    }

    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title: "Untitled",
        content: content,
        note_type: finalNoteType,
        folder_id: targetFolderId,
        is_starred: false,
        tags: defaultTags,
      })
      .select()
      .single();

    if (!error && data) {
      setNotes([data, ...notes]);
      setSelectedNote(data);
      setViewingFolder(null); // Exit folder view to show the new note
      setCameFromFolder(viewingFolder); // Remember where we came from
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
        folder_type: "notebook",
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
    setContextMenuFolder(null);
  }

  async function renameFolder() {
    if (!renameFolderId || !renameFolderValue.trim()) return;
    
    const { error } = await supabase
      .from("folders")
      .update({ name: renameFolderValue.trim() })
      .eq("id", renameFolderId);

    if (!error) {
      setFolders(folders.map(f => 
        f.id === renameFolderId ? { ...f, name: renameFolderValue.trim() } : f
      ));
    }
    setRenameFolderDialogOpen(false);
    setRenameFolderId(null);
    setRenameFolderValue("");
  }

  // Create folder and return it (for FolderView and UnfiledView)
  async function handleCreateFolder(name: string): Promise<FolderType | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("folders")
      .insert({
        user_id: user.id,
        name: name.trim(),
        folder_type: "notebook",
      })
      .select()
      .single();

    if (!error && data) {
      setFolders(prev => [...prev, data]);
      return data;
    }
    return null;
  }

  async function toggleStar(noteId: string, currentValue: boolean) {
    const { error } = await supabase
      .from("notes")
      .update({ is_starred: !currentValue })
      .eq("id", noteId);

    if (!error) {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, is_starred: !currentValue } : n));
      if (selectedNote?.id === noteId) {
        setSelectedNote({ ...selectedNote, is_starred: !currentValue });
      }
    }
  }

  useEffect(() => {
    if (selectedNote) {
      setLocalTitle(selectedNote.title);
      setLocalContent(selectedNote.content || "");
      setEditorKey(prev => prev + 1);
    }
  }, [selectedNote?.id]);

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
      // Use functional update to avoid stale closure
      setNotes(prev => prev.map(n => n.id === selectedNote.id ? updatedNote : n));
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

  function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Get all unique labels from all notes (filter out nulls and empty)
  const allLabels = Array.from(
    new Set(
      notes
        .flatMap(n => n.tags || [])
        .filter(tag => tag && tag.trim() !== '')
    )
  );
  
  // Get the current note's label (first tag, single-select)
  const currentLabel = selectedNote?.tags?.[0] || null;
  
  // Filter labels for dropdown
  const filteredLabels = allLabels.filter(label => 
    label.toLowerCase().includes(labelInputValue.toLowerCase())
  );
  
  // Set label on note
  async function setNoteLabel(label: string | null) {
    if (!selectedNote) return;
    const newTags = label ? [label] : [];
    await updateNoteImmediate({ tags: newTags } as Partial<Note>);
    setLabelInputValue("");
    setShowLabelDropdown(false);
  }
  
  // Handle label input keydown
  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && labelInputValue.trim()) {
      e.preventDefault();
      setNoteLabel(labelInputValue.trim());
    } else if (e.key === "Escape") {
      setShowLabelDropdown(false);
      setLabelInputValue("");
    }
  };

  // Get notebook folders only, excluding special view storage folders
  const notebookFolders = folders.filter(f =>
    f.folder_type === "notebook" &&
    !f.name.startsWith("__") // Exclude __unfiled_views__, __all_notes_views__, etc.
  );
  
  // Search filter function - searches title, content, and date
  const matchesSearch = (note: Note) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = note.title.toLowerCase().includes(query);
    const contentMatch = stripHtml(note.content || "").toLowerCase().includes(query);
    const dateMatch = formatDate(note.updated_at).toLowerCase().includes(query);
    return titleMatch || contentMatch || dateMatch;
  };

  // Type filter function
  const matchesType = (note: Note) => {
    return typeFilter === "all" || note.note_type === typeFilter;
  };

  // Sort function
  const sortNotes = (notesToSort: Note[]) => {
    return [...notesToSort].sort((a, b) => {
      // Starred always first
      if (a.is_starred && !b.is_starred) return -1;
      if (!a.is_starred && b.is_starred) return 1;
      
      // Then apply sort order
      if (sortOrder === "newest") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sortOrder === "oldest") return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      return a.title.localeCompare(b.title);
    });
  };

  // Get notes for a specific folder with filters applied
  const getFilteredNotesInFolder = (folderId: string) => {
    return sortNotes(
      notes.filter(n => n.folder_id === folderId && matchesSearch(n) && matchesType(n))
    );
  };

  // Get notebook notes (All Notes or Unfiled)
  const getNotebookNotes = (unfiledOnly: boolean) => {
    return sortNotes(
      notes.filter(n => {
        // Filter by unfiled if needed
        if (unfiledOnly && n.folder_id) return false;

        return matchesSearch(n) && matchesType(n);
      })
    );
  };

  // Render note item
  const renderNoteItem = (note: Note) => {
    const noteLabel = note.tags?.[0];
    const labelColor = noteLabel ? getLabelColor(noteLabel) : null;
    
    return (
      <div
        key={note.id}
        onClick={() => setSelectedNote(note)}
        className={cn(
          "px-3 py-2 cursor-pointer transition-colors group flex items-start gap-2 border-b border-[#E8DCC4]",
          selectedNote?.id === note.id ? "bg-[#F5F0E6]" : "hover:bg-[#FAF8F5]"
        )}
      >
        <span className="flex-shrink-0 mt-0.5">{NOTE_TYPE_ICONS[note.note_type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-medium text-[#1E3D32] text-sm truncate max-w-[140px]">
              {note.title || "Untitled"}
            </h3>
            {note.is_starred && <Star className="w-3 h-3 text-[#D4A84B] fill-[#D4A84B] flex-shrink-0" />}
            {noteLabel && labelColor && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 whitespace-nowrap",
                labelColor.bg, labelColor.text
              )}>
                {noteLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-[#8B9A8F] line-clamp-1">
            {stripHtml(note.content || "").slice(0, 60) || "No content"}
          </p>
          <p className="text-xs text-[#8B9A8F] mt-0.5">
            {formatDate(note.updated_at)}
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              toggleStar(note.id, note.is_starred);
            }}>
              <Star className={cn("w-4 h-4 mr-2", note.is_starred && "fill-[#D4A84B] text-[#D4A84B]")} />
              {note.is_starred ? "Unstar" : "Star"}
            </DropdownMenuItem>
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
    );
  };

  return (
    <div className={cn(
      "flex h-[calc(100vh-4rem)] bg-[#FAF8F5] transition-all duration-300",
      isChatOpen && "mr-[420px]"
    )}>
      {/* Left Panel */}
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
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-[#5C7A6B] hover:text-[#1E3D32] hover:bg-[#F5F0E6]"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-xs font-medium">New</span>
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9A8F]" />
                <Input
                  placeholder="Search title, content, date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-[#F5F0E6] border-[#E8DCC4] focus:border-[#2D5A47]"
                />
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* About Me Section */}
              <AboutMeSection />

              {/* Notebook Section */}
              <div>
                <div className="flex items-center">
                  <button
                    onClick={() => setIsNotebookExpanded(!isNotebookExpanded)}
                    className="flex-1 p-3 flex items-center justify-between text-sm text-[#5C7A6B] hover:bg-[#FAF8F5]"
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Notebook
                    </span>
                    {isNotebookExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFolderDialogOpen(true)}
                    className="h-8 w-8 p-0 mr-2"
                    title="New folder"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                {isNotebookExpanded && (
                  <div className="pb-2">
                    {/* Unfiled - at top */}
                    <button
                      onClick={() => {
                        // Open unfiled view in right panel
                        setViewingUnfiled(!viewingUnfiled);
                        setViewingFolder(null);
                        setViewingAllNotes(false);
                        setSelectedNote(null);
                        setCameFromFolder(null);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors",
                        viewingUnfiled
                          ? "bg-[#F5F0E6] text-[#1E3D32]"
                          : "text-[#5C7A6B] hover:bg-[#FAF8F5]"
                      )}
                    >
                      <Inbox className="w-3 h-3" />
                      <span className="flex-1">Unfiled</span>
                      <span className="text-xs text-[#8B9A8F]">
                        {getNotebookNotes(true).length}
                      </span>
                    </button>
                    
                    {/* Notebook Folders - middle */}
                    {notebookFolders.map(folder => {
                      const folderNotes = getFilteredNotesInFolder(folder.id);
                      const isViewing = viewingFolder?.id === folder.id;
                      return (
                        <div key={folder.id}>
                          <button
                            onClick={() => {
                              // Open folder view in right panel
                              setViewingFolder(isViewing ? null : folder);
                              setViewingUnfiled(false);
                              setViewingAllNotes(false);
                              setSelectedNote(null);
                              setCameFromFolder(null);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenuFolder(folder.id);
                              setContextMenuPos({ x: e.clientX, y: e.clientY });
                            }}
                            className={cn(
                              "w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors",
                              isViewing
                                ? "bg-[#F5F0E6] text-[#1E3D32]"
                                : "text-[#5C7A6B] hover:bg-[#FAF8F5]"
                            )}
                          >
                            <Folder className="w-3 h-3" />
                            <span className="flex-1">{folder.name}</span>
                            <span className="text-xs text-[#8B9A8F]">{folderNotes.length}</span>
                          </button>
                        </div>
                      );
                    })}
                    
                    {/* All Notes - at bottom */}
                    <button
                      onClick={() => {
                        setViewingAllNotes(!viewingAllNotes);
                        setViewingUnfiled(false);
                        setViewingFolder(null);
                        setSelectedNote(null);
                        setCameFromFolder(null);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors",
                        viewingAllNotes
                          ? "bg-[#F5F0E6] text-[#1E3D32]"
                          : "text-[#5C7A6B] hover:bg-[#FAF8F5]"
                      )}
                    >
                      <FolderOpen className="w-3 h-3" />
                      <span className="flex-1">All Notes</span>
                      <span className="text-xs text-[#8B9A8F]">
                        {getNotebookNotes(false).length}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Panel - Editor or Folder View */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            {/* Editor - HIGHEST PRIORITY */}
            {(cameFromFolder || cameFromUnfiled || cameFromAllNotes) && (
              <div className="px-4 py-2 border-b border-[#E8DCC4] bg-[#FAF8F5]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (cameFromUnfiled) {
                      setViewingUnfiled(true);
                      setCameFromUnfiled(false);
                    } else if (cameFromAllNotes) {
                      setViewingAllNotes(true);
                      setCameFromAllNotes(false);
                    } else if (cameFromFolder) {
                      setViewingFolder(cameFromFolder);
                      setCameFromFolder(null);
                    }
                    setSelectedNote(null);
                  }}
                  className="text-[#5C7A6B] hover:text-[#1E3D32] hover:bg-[#F5F0E6] -ml-2"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back to {cameFromUnfiled ? "Unfiled" : cameFromAllNotes ? "All Notes" : cameFromFolder?.name}
                </Button>
              </div>
            )}
            <div className="p-4 border-b border-[#E8DCC4] bg-white space-y-3">
              {/* Row 1: Title, Label, Star, Note Type, Folder */}
              <div className="flex items-center gap-3">
                {/* Title + Label grouped together */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isEditingTitle ? (
                    <Input
                      ref={titleInputRef}
                      value={localTitle}
                      onChange={(e) => {
                        setLocalTitle(e.target.value);
                        debouncedSave({ title: e.target.value });
                      }}
                      onBlur={() => setIsEditingTitle(false)}
                      onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
                      placeholder="Note title..."
                      className="text-xl font-serif font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0 flex-1"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setIsEditingTitle(true);
                        setTimeout(() => titleInputRef.current?.focus(), 0);
                      }}
                      className="text-left text-xl font-serif font-semibold text-[#1E3D32] hover:text-[#2D5A47] truncate max-w-[300px] flex items-center gap-1 group"
                    >
                      {localTitle || "Untitled"}
                      <Pencil className="w-4 h-4 opacity-0 group-hover:opacity-50 flex-shrink-0" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <RichEditor
                key={editorKey}
                content={localContent}
                onChange={(content) => {
                  setLocalContent(content);
                  debouncedSave({ content });
                }}
                placeholder="Start writing... (use / for formatting commands)"
                noteId={selectedNote?.id}
                hideToolbar
              />
            </div>
          </>
        ) : viewingUnfiled && userId ? (
          <UnfiledView
            notes={getNotebookNotes(true)}
            userId={userId}
            allLabels={allLabels}
            allFolders={notebookFolders}
            onSelectNote={(note) => {
              // Clear ALL viewing states to ensure clean transition
              setViewingUnfiled(false);
              setViewingAllNotes(false);
              setViewingFolder(null);

              // Set navigation breadcrumb
              setCameFromUnfiled(true);
              setCameFromFolder(null);
              setCameFromAllNotes(false);

              // Finally, set the selected note (triggers editor render)
              setSelectedNote(note);
            }}
            onCreateNote={async () => {
              await createNote("document");
            }}
            onUpdateNote={async (noteId, updates) => {
              const { error } = await supabase
                .from("notes")
                .update(updates)
                .eq("id", noteId);
              if (!error) {
                setNotes(prev => prev.map(n =>
                  n.id === noteId ? { ...n, ...updates } : n
                ));
              }
            }}
            onDeleteNote={deleteNote}
            onCreateFolder={handleCreateFolder}
            onImportNote={async (result) => {
              // Create a new unfiled note with the imported content
              const { data, error } = await supabase
                .from("notes")
                .insert({
                  user_id: userId,
                  title: result.title || "Imported Note",
                  content: result.content,
                  note_type: result.noteType || "document",
                  folder_id: null, // Unfiled
                  tags: result.tags || [],
                  is_starred: false,
                })
                .select()
                .single();

              if (!error && data) {
                setNotes(prev => [data, ...prev]);
                setSelectedNote(data);
                setCameFromFolder(null);
                setCameFromUnfiled(true);
                setViewingUnfiled(false);
              }
            }}
          />
        ) : viewingAllNotes && userId ? (
          <AllNotesView
            notes={getNotebookNotes(false)}
            userId={userId}
            allLabels={allLabels}
            allFolders={notebookFolders}
            onSelectNote={(note) => {
              // Clear ALL viewing states to ensure clean transition
              setViewingUnfiled(false);
              setViewingAllNotes(false);
              setViewingFolder(null);

              // Set navigation breadcrumb
              setCameFromAllNotes(true);
              setCameFromFolder(null);
              setCameFromUnfiled(false);

              // Finally, set the selected note (triggers editor render)
              setSelectedNote(note);
            }}
            onCreateNote={async () => {
              await createNote("document");
            }}
            onUpdateNote={async (noteId, updates) => {
              const { error } = await supabase
                .from("notes")
                .update(updates)
                .eq("id", noteId);
              if (!error) {
                setNotes(prev => prev.map(n =>
                  n.id === noteId ? { ...n, ...updates } : n
                ));
              }
            }}
            onDeleteNote={deleteNote}
            onCreateFolder={handleCreateFolder}
            onImportNote={async (result) => {
              // Create a new unfiled note with the imported content
              const { data, error } = await supabase
                .from("notes")
                .insert({
                  user_id: userId,
                  title: result.title || "Imported Note",
                  content: result.content,
                  note_type: result.noteType || "document",
                  folder_id: null,
                  tags: result.tags || [],
                  is_starred: false,
                })
                .select()
                .single();

              if (!error && data) {
                setNotes(prev => [data, ...prev]);
                setSelectedNote(data);
                setCameFromFolder(null);
                setCameFromUnfiled(false);
                setCameFromAllNotes(true);
                setViewingAllNotes(false);
              }
            }}
          />
        ) : viewingFolder && userId ? (
          <FolderView
            folder={viewingFolder}
            notes={getFilteredNotesInFolder(viewingFolder.id)}
            userId={userId}
            allLabels={allLabels}
            allFolders={notebookFolders}
            onSelectNote={(note) => {
              // Save current folder for breadcrumb BEFORE clearing
              const currentFolder = viewingFolder;

              // Clear ALL viewing states to ensure clean transition
              setViewingUnfiled(false);
              setViewingAllNotes(false);
              setViewingFolder(null);

              // Set navigation breadcrumb
              setCameFromFolder(currentFolder);
              setCameFromUnfiled(false);
              setCameFromAllNotes(false);

              // Finally, set the selected note (triggers editor render)
              setSelectedNote(note);
            }}
            onCreateNote={async (folderId) => {
              await createNote("document", folderId);
            }}
            onUpdateNote={async (noteId, updates) => {
              const { error } = await supabase
                .from("notes")
                .update(updates)
                .eq("id", noteId);
              if (!error) {
                setNotes(prev => prev.map(n =>
                  n.id === noteId ? { ...n, ...updates } : n
                ));
              }
            }}
            onDeleteNote={deleteNote}
            onCreateFolder={handleCreateFolder}
            onImportNote={async (folderId, result) => {
              // Create a new note with the imported content
              const { data, error } = await supabase
                .from("notes")
                .insert({
                  user_id: userId,
                  title: result.title || "Imported Note",
                  content: result.content,
                  note_type: result.noteType || "document",
                  folder_id: folderId,
                  tags: result.tags || [],
                  is_starred: false,
                })
                .select()
                .single();

              if (!error && data) {
                setNotes(prev => [data, ...prev]);
                setSelectedNote(data);
                setCameFromFolder(viewingFolder);
                setCameFromUnfiled(false);
                setViewingFolder(null);
              }
            }}
          />
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

      {/* Rename Folder Dialog */}
      <Dialog open={renameFolderDialogOpen} onOpenChange={setRenameFolderDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <Input
            value={renameFolderValue}
            onChange={(e) => setRenameFolderValue(e.target.value)}
            placeholder="Folder name..."
            onKeyDown={(e) => e.key === "Enter" && renameFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={renameFolder} className="bg-[#2D5A47] hover:bg-[#1E3D32]">
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Context Menu for Folders */}
      {contextMenuFolder && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setContextMenuFolder(null)}
          />
          <div
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-[#E8DCC4] py-1 min-w-[160px]"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          >
            <button
              onClick={() => {
                const folder = folders.find(f => f.id === contextMenuFolder);
                setRenameFolderValue(folder?.name || "");
                setRenameFolderId(contextMenuFolder);
                setRenameFolderDialogOpen(true);
                setContextMenuFolder(null);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-[#F5F0E6] flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Rename
            </button>
            <button
              onClick={() => deleteFolder(contextMenuFolder)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-[#F5F0E6] flex items-center gap-2 text-red-600"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}

      {/* Import Dialog for Note Content */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        mode="replace"
        onImport={(result: ImportResult) => {
          if (selectedNote) {
            // Update content from import
            if (result.title && result.title !== "Imported Note") {
              setLocalTitle(result.title);
            }
            setLocalContent(result.content);
            debouncedSave({
              content: result.content,
              title: result.title !== "Imported Note" ? result.title : undefined,
            });
            // Force editor refresh
            setEditorKey(prev => prev + 1);
          }
        }}
      />
    </div>
  );
}
