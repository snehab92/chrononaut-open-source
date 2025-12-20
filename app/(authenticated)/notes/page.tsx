"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, FileText, Search, MoreVertical, Trash2, 
  ChevronLeft, ChevronRight, Folder, FolderOpen, Inbox,
  ChevronDown, ChevronUp, Star, Filter, SortAsc, SortDesc,
  Sparkles, BookOpen, Pencil, Tag, X
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
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<NoteType | "all">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "alpha">("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  
  const [isAiConversationsExpanded, setIsAiConversationsExpanded] = useState(true);
  const [isNotebookExpanded, setIsNotebookExpanded] = useState(true);
  
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
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
  
  // Label input state
  const [labelInputValue, setLabelInputValue] = useState("");
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);
  
  const supabase = createClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isOpen: isChatOpen } = useChatDrawer();

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

    const template = getTemplateForNote(noteType);
    const targetFolderId = folderId || (selectedFolder === "unfiled" ? null : selectedFolder);

    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title: "Untitled",
        content: template,
        note_type: noteType,
        folder_id: targetFolderId,
        is_starred: false,
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

  // Get folders by type
  const aiConversationFolders = folders.filter(f => f.folder_type === "ai_conversations");
  const notebookFolders = folders.filter(f => f.folder_type === "notebook");
  
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
        // Exclude AI conversation notes
        const isInAiFolder = aiConversationFolders.some(f => f.id === n.folder_id);
        if (isInAiFolder) return false;
        
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
                  placeholder="Search title, content, date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-[#F5F0E6] border-[#E8DCC4] focus:border-[#2D5A47]"
                />
              </div>

              {/* Filter & Sort */}
              <div className="flex items-center gap-2">
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as NoteType | "all")}>
                  <SelectTrigger className="flex-1 h-8 text-xs bg-[#F5F0E6] border-[#E8DCC4]">
                    <Filter className="w-3 h-3 mr-1" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {NOTE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {NOTE_TYPE_ICONS[type]} {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as typeof sortOrder)}>
                  <SelectTrigger className="w-28 h-8 text-xs bg-[#F5F0E6] border-[#E8DCC4]">
                    {sortOrder === "newest" ? <SortDesc className="w-3 h-3 mr-1" /> : <SortAsc className="w-3 h-3 mr-1" />}
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="alpha">A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* About Me Section - above AI Conversations */}
              <AboutMeSection />
              
              {/* AI Conversations Section */}
              <div className="border-b border-[#E8DCC4]">
                <button
                  onClick={() => setIsAiConversationsExpanded(!isAiConversationsExpanded)}
                  className="w-full p-3 flex items-center justify-between text-sm text-[#5C7A6B] hover:bg-[#FAF8F5]"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D4A84B]" />
                    AI Conversations
                  </span>
                  {isAiConversationsExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                
                {isAiConversationsExpanded && (
                  <div className="pb-2">
                    {aiConversationFolders.map(folder => {
                      const folderNotes = getFilteredNotesInFolder(folder.id);
                      const isSelected = selectedFolder === folder.id;
                      return (
                        <div key={folder.id}>
                          <button
                            onClick={() => setSelectedFolder(isSelected ? null : folder.id)}
                            className={cn(
                              "w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors",
                              isSelected 
                                ? "bg-[#F5F0E6] text-[#1E3D32]" 
                                : "text-[#5C7A6B] hover:bg-[#FAF8F5]"
                            )}
                          >
                            <Folder className="w-3 h-3" />
                            <span className="flex-1">{folder.name}</span>
                            <span className="text-xs text-[#8B9A8F]">{folderNotes.length}</span>
                          </button>
                          
                          {isSelected && (
                            <div>
                              {folderNotes.length === 0 ? (
                                <p className="px-6 py-2 text-xs text-[#8B9A8F]">No notes</p>
                              ) : (
                                folderNotes.map(note => renderNoteItem(note))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

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
                      onClick={() => setSelectedFolder(selectedFolder === "unfiled" ? "__collapsed__" : "unfiled")}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors",
                        selectedFolder === "unfiled"
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
                    
                    {selectedFolder === "unfiled" && (
                      <div>
                        {getNotebookNotes(true).length === 0 ? (
                          <p className="px-6 py-2 text-xs text-[#8B9A8F]">No notes</p>
                        ) : (
                          getNotebookNotes(true).map(note => renderNoteItem(note))
                        )}
                      </div>
                    )}
                    
                    {/* Notebook Folders - middle */}
                    {notebookFolders.map(folder => {
                      const folderNotes = getFilteredNotesInFolder(folder.id);
                      const isSelected = selectedFolder === folder.id;
                      return (
                        <div key={folder.id}>
                          <button
                            onClick={() => setSelectedFolder(isSelected ? "__collapsed__" : folder.id)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenuFolder(folder.id);
                              setContextMenuPos({ x: e.clientX, y: e.clientY });
                            }}
                            className={cn(
                              "w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors",
                              isSelected 
                                ? "bg-[#F5F0E6] text-[#1E3D32]" 
                                : "text-[#5C7A6B] hover:bg-[#FAF8F5]"
                            )}
                          >
                            <Folder className="w-3 h-3" />
                            <span className="flex-1">{folder.name}</span>
                            <span className="text-xs text-[#8B9A8F]">{folderNotes.length}</span>
                          </button>
                          
                          {isSelected && (
                            <div>
                              {folderNotes.length === 0 ? (
                                <p className="px-6 py-2 text-xs text-[#8B9A8F]">No notes</p>
                              ) : (
                                folderNotes.map(note => renderNoteItem(note))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* All Notes - at bottom */}
                    <button
                      onClick={() => setSelectedFolder(selectedFolder === null ? "__collapsed__" : null)}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors",
                        selectedFolder === null
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
                    
                    {selectedFolder === null && (
                      <div>
                        {getNotebookNotes(false).length === 0 ? (
                          <p className="px-6 py-2 text-xs text-[#8B9A8F]">No notes</p>
                        ) : (
                          getNotebookNotes(false).map(note => renderNoteItem(note))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Panel - Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
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
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleStar(selectedNote.id, selectedNote.is_starred)}
                  className="h-8 w-8 p-0"
                >
                  <Star className={cn(
                    "w-4 h-4",
                    selectedNote.is_starred && "fill-[#D4A84B] text-[#D4A84B]"
                  )} />
                </Button>
                
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
                        {folder.folder_type === "ai_conversations" ? "✨ " : "📁 "}
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {isSaving && (
                  <span className="text-xs text-[#8B9A8F]">Saving...</span>
                )}
              </div>
              
              {/* Label row */}
              <div className="flex items-center gap-2 mt-3">
                <Tag className="w-4 h-4 text-[#8B9A8F]" />
                {currentLabel ? (
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1",
                      getLabelColor(currentLabel).bg,
                      getLabelColor(currentLabel).text
                    )}>
                      {currentLabel}
                      <button
                        onClick={() => setNoteLabel(null)}
                        className="hover:opacity-70"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                    <button
                      onClick={() => setShowLabelDropdown(true)}
                      className="text-xs text-[#8B9A8F] hover:text-[#5C7A6B]"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowLabelDropdown(true);
                        setTimeout(() => labelInputRef.current?.focus(), 0);
                      }}
                      className="text-xs text-[#8B9A8F] hover:text-[#5C7A6B] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add label
                    </button>
                  </div>
                )}
                
                {/* Label dropdown */}
                {showLabelDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => {
                        setShowLabelDropdown(false);
                        setLabelInputValue("");
                      }}
                    />
                    <div className="absolute left-16 top-24 z-50 bg-white rounded-lg shadow-lg border border-[#E8DCC4] p-2 min-w-[200px]">
                      <Input
                        ref={labelInputRef}
                        value={labelInputValue}
                        onChange={(e) => setLabelInputValue(e.target.value)}
                        onKeyDown={handleLabelKeyDown}
                        placeholder="Type label & press Enter"
                        className="h-8 text-sm mb-2"
                        autoFocus
                      />
                      {filteredLabels.length > 0 && (
                        <div className="max-h-32 overflow-y-auto">
                          <p className="text-xs text-[#8B9A8F] px-2 mb-1">Existing labels</p>
                          {filteredLabels.map(label => {
                            const color = getLabelColor(label);
                            return (
                              <div
                                key={label}
                                className="w-full px-2 py-1.5 text-left text-sm hover:bg-[#F5F0E6] rounded flex items-center justify-between group/label"
                              >
                                <button
                                  onClick={() => setNoteLabel(label)}
                                  className="flex items-center gap-2 flex-1"
                                >
                                  <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    color.bg, color.text
                                  )}>
                                    {label}
                                  </span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Remove this label from all notes that have it
                                    notes.forEach(async (n) => {
                                      if (n.tags?.includes(label)) {
                                        const newTags = n.tags.filter(t => t !== label);
                                        await supabase.from("notes").update({ tags: newTags }).eq("id", n.id);
                                      }
                                    });
                                    // Update local state
                                    setNotes(prev => prev.map(n => 
                                      n.tags?.includes(label) 
                                        ? { ...n, tags: n.tags.filter(t => t !== label) }
                                        : n
                                    ));
                                    if (selectedNote?.tags?.includes(label)) {
                                      setSelectedNote({ ...selectedNote, tags: selectedNote.tags.filter(t => t !== label) });
                                    }
                                  }}
                                  className="opacity-0 group-hover/label:opacity-100 p-1 hover:bg-red-100 rounded text-red-500"
                                  title="Delete label from all notes"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {labelInputValue && !filteredLabels.includes(labelInputValue) && (
                        <button
                          onClick={() => setNoteLabel(labelInputValue.trim())}
                          className="w-full px-2 py-1.5 text-left text-sm hover:bg-[#F5F0E6] rounded flex items-center gap-2 border-t border-[#E8DCC4] mt-1 pt-2"
                        >
                          <Plus className="w-3 h-3" />
                          Create "{labelInputValue}"
                        </button>
                      )}
                    </div>
                  </>
                )}
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
    </div>
  );
}
