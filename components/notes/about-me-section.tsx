"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Upload, FileText, Trash2, Download, Eye,
  ChevronDown, ChevronUp, MoreVertical, Settings, Info, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface AboutMeFile {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  category: string;
  agent_access: string[];
  description: string | null;
  is_assessment: boolean;
  assessment_type: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "assessments", label: "Assessments", icon: "📊" },
  { value: "feedback", label: "360 Feedback", icon: "💬" },
  { value: "inspiration", label: "Inspiration", icon: "✨" },
  { value: "research", label: "Research", icon: "🔍" },
  { value: "general", label: "General", icon: "📁" },
];

// Updated to include Therapist
const AGENTS = [
  { value: "executive-coach", label: "Executive Coach" },
  { value: "research-assistant", label: "Research Assistant" },
  { value: "therapist", label: "Therapist" },
];

const ASSESSMENT_TYPES = [
  { value: "self_compassion", label: "Self-Compassion" },
  { value: "values_alignment", label: "Values Alignment" },
  { value: "executive_function", label: "Executive Function" },
  { value: "strengths", label: "Strengths Profile" },
];

// Auto-detection keyword mappings for assessments
const ASSESSMENT_KEYWORDS: Record<string, string[]> = {
  self_compassion: ["self-compassion", "self compassion", "scs", "neff"],
  values_alignment: ["values", "valued living", "vlq"],
  executive_function: ["executive function", "adhd", "ef", "brown"],
  strengths: ["strengths", "clifton", "gallup", "via", "character"],
};

const FILE_ICONS: Record<string, string> = {
  pdf: "📕",
  docx: "📘",
  xlsx: "📗",
  markdown: "📝",
  txt: "📄",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Auto-detect assessment type from filename
function detectAssessmentType(filename: string): string | null {
  const lowerFilename = filename.toLowerCase();
  
  for (const [assessmentType, keywords] of Object.entries(ASSESSMENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerFilename.includes(keyword)) {
        return assessmentType;
      }
    }
  }
  return null;
}

export function AboutMeSection() {
  const [files, setFiles] = useState<AboutMeFile[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("general");
  const [uploadAgents, setUploadAgents] = useState<string[]>([]);
  const [uploadDescription, setUploadDescription] = useState("");
  // Auto-detected assessment type (shown as info, not editable)
  const [detectedAssessmentType, setDetectedAssessmentType] = useState<string | null>(null);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<AboutMeFile | null>(null);
  
  // View dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingFile, setViewingFile] = useState<AboutMeFile | null>(null);
  const [viewContent, setViewContent] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [isLoadingView, setIsLoadingView] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchFiles();
  }, []);

  // Auto-detect assessment type when file or category changes
  useEffect(() => {
    if (selectedFile && uploadCategory === "assessments") {
      const detected = detectAssessmentType(selectedFile.name);
      setDetectedAssessmentType(detected);
    } else {
      setDetectedAssessmentType(null);
    }
  }, [selectedFile, uploadCategory]);

  async function fetchFiles() {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("about_me_files")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setFiles(data);
    }
    setIsLoading(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validTypes = ['pdf', 'docx', 'xlsx', 'md', 'markdown', 'txt'];
    if (!ext || !validTypes.includes(ext)) {
      alert("Please select a PDF, DOCX, XLSX, Markdown, or TXT file");
      return;
    }

    setSelectedFile(file);
    setUploadDialogOpen(true);
  }

  async function handleUpload() {
    if (!selectedFile) return;

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Get file extension
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      const fileType = ext === 'md' ? 'markdown' : ext;
      
      // Generate unique filename
      const uniqueName = `${user.id}/${Date.now()}_${selectedFile.name}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("about-me-files")
        .upload(uniqueName, selectedFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert("Failed to upload file. Please try again.");
        return;
      }

      // Auto-detect if this is an assessment based on category + filename
      const isAssessment = uploadCategory === "assessments" && detectedAssessmentType !== null;

      // Create database record
      const { error: dbError } = await supabase
        .from("about_me_files")
        .insert({
          user_id: user.id,
          filename: selectedFile.name,
          file_type: fileType,
          file_size: selectedFile.size,
          storage_path: uniqueName,
          category: uploadCategory,
          agent_access: uploadAgents.length > 0 ? uploadAgents : [],
          description: uploadDescription || null,
          is_assessment: isAssessment,
          assessment_type: isAssessment ? detectedAssessmentType : null,
        });

      if (dbError) {
        console.error("DB error:", dbError);
        alert("Failed to save file info.");
        return;
      }

      // Reset and refresh
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadCategory("general");
      setUploadAgents([]);
      setUploadDescription("");
      setDetectedAssessmentType(null);
      fetchFiles();
    } catch (error) {
      console.error("Upload error:", error);
      alert("An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  }

  async function deleteFile(fileId: string, storagePath: string) {
    const { error: storageError } = await supabase.storage
      .from("about-me-files")
      .remove([storagePath]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
    }

    const { error: dbError } = await supabase
      .from("about_me_files")
      .delete()
      .eq("id", fileId);

    if (!dbError) {
      setFiles(prev => prev.filter(f => f.id !== fileId));
    }
  }

  async function updateFile(fileId: string, updates: Partial<AboutMeFile>) {
    const { error } = await supabase
      .from("about_me_files")
      .update(updates)
      .eq("id", fileId);

    if (!error) {
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updates } : f));
      setEditDialogOpen(false);
      setEditingFile(null);
    }
  }

  async function viewFile(file: AboutMeFile) {
    setViewingFile(file);
    setViewDialogOpen(true);
    setIsLoadingView(true);
    setViewContent(null);
    setViewUrl(null);

    try {
      // Get signed URL for the file
      const { data: urlData, error: urlError } = await supabase.storage
        .from("about-me-files")
        .createSignedUrl(file.storage_path, 3600); // 1 hour expiry

      if (urlError || !urlData?.signedUrl) {
        console.error("URL error:", urlError);
        setIsLoadingView(false);
        return;
      }

      // Handle different file types
      if (file.file_type === "pdf") {
        // PDF: use iframe with signed URL
        setViewUrl(urlData.signedUrl);
      } else if (file.file_type === "txt" || file.file_type === "markdown") {
        // TXT/Markdown: fetch and display content
        const response = await fetch(urlData.signedUrl);
        const text = await response.text();
        setViewContent(text);
      } else {
        // DOCX/XLSX: provide download link
        setViewUrl(urlData.signedUrl);
      }
    } catch (error) {
      console.error("View error:", error);
    } finally {
      setIsLoadingView(false);
    }
  }

  async function downloadFile(file: AboutMeFile) {
    const { data: urlData, error } = await supabase.storage
      .from("about-me-files")
      .createSignedUrl(file.storage_path, 60);

    if (!error && urlData?.signedUrl) {
      const link = document.createElement("a");
      link.href = urlData.signedUrl;
      link.download = file.filename;
      link.click();
    }
  }

  // Group files by category
  const filesByCategory = CATEGORIES.map(cat => ({
    ...cat,
    files: files.filter(f => f.category === cat.value)
  })).filter(cat => cat.files.length > 0);

  return (
    <div className="border-b border-[#E8DCC4]">
      {/* Header with collapse toggle and upload icon */}
      <div className="w-full p-3 flex items-center justify-between text-sm text-[#5C7A6B]">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:text-[#1E3D32]"
        >
          <Settings className="w-4 h-4" />
          <span>About Me</span>
        </button>
        <div className="flex items-center gap-1">
          {/* Upload icon button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-6 w-6 p-0 text-[#8B9A8F] hover:text-[#5C7A6B]"
            title="Upload file"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.md,.markdown,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          {/* Collapse toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-[#FAF8F5] rounded"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="pb-2">
          {/* File list by category */}
          {isLoading ? (
            <p className="px-3 py-2 text-xs text-[#8B9A8F]">Loading...</p>
          ) : files.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[#8B9A8F]">
              Upload files for AI agents to reference
            </p>
          ) : (
            <div className="space-y-1">
              {filesByCategory.map(category => (
                <div key={category.value}>
                  <button
                    onClick={() => setExpandedCategory(
                      expandedCategory === category.value ? null : category.value
                    )}
                    className={cn(
                      "w-full px-3 py-1.5 text-left text-xs flex items-center gap-2",
                      expandedCategory === category.value
                        ? "bg-[#F5F0E6] text-[#1E3D32]"
                        : "text-[#5C7A6B] hover:bg-[#FAF8F5]"
                    )}
                  >
                    <span>{category.icon}</span>
                    <span className="flex-1">{category.label}</span>
                    <span className="text-[#8B9A8F]">{category.files.length}</span>
                  </button>

                  {expandedCategory === category.value && (
                    <div className="pl-4">
                      {category.files.map(file => (
                        <div
                          key={file.id}
                          className="px-3 py-2 flex items-center gap-2 text-xs hover:bg-[#FAF8F5] group"
                        >
                          <span>{FILE_ICONS[file.file_type] || "📄"}</span>
                          <div className="flex-1 min-w-0">
                            {file.description ? (
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="truncate text-[#1E3D32] cursor-help">{file.filename}</p>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-[200px] text-xs">
                                    {file.description}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <p className="truncate text-[#1E3D32]">{file.filename}</p>
                            )}
                            <div className="flex items-center gap-1 text-[10px] text-[#8B9A8F]">
                              <span>{formatFileSize(file.file_size)}</span>
                              {file.agent_access.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{file.agent_access.length} agent{file.agent_access.length > 1 ? 's' : ''}</span>
                                </>
                              )}
                              {file.is_assessment && file.assessment_type && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#5C7A6B]">
                                    {ASSESSMENT_TYPES.find(t => t.value === file.assessment_type)?.label}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              >
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => viewFile(file)}>
                                <Eye className="w-3 h-3 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadFile(file)}>
                                <Download className="w-3 h-3 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setEditingFile(file);
                                setEditDialogOpen(true);
                              }}>
                                <Settings className="w-3 h-3 mr-2" />
                                Edit Settings
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => deleteFile(file.id, file.storage_path)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-3 h-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Info tooltip */}
          <div className="px-3 py-2 flex items-start gap-2 text-[10px] text-[#8B9A8F]">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>Files are used as context for AI agents. Set agent access to control which agents see each file.</span>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload About Me File</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* File info */}
            {selectedFile && (
              <div className="p-3 rounded-lg bg-[#F5F0E6] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#5C7A6B]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-[#8B9A8F]">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
            )}

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-sm">Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Auto-detected assessment info */}
            {uploadCategory === "assessments" && detectedAssessmentType && (
              <div className="p-2 rounded-lg bg-[#E8F5E9] text-xs text-[#2D5A47] flex items-center gap-2">
                <span>✓</span>
                <span>
                  Auto-detected: <strong>{ASSESSMENT_TYPES.find(t => t.value === detectedAssessmentType)?.label}</strong> assessment
                </span>
              </div>
            )}

            {uploadCategory === "assessments" && !detectedAssessmentType && selectedFile && (
              <div className="p-2 rounded-lg bg-[#FFF8E1] text-xs text-[#8B7355] flex items-center gap-2">
                <Info className="w-3 h-3" />
                <span>
                  No assessment type detected. Include keywords like "strengths", "values", "self-compassion", or "executive function" in filename.
                </span>
              </div>
            )}

            {/* Agent Access */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Agent Access
                <span className="text-xs text-[#8B9A8F] ml-1">(leave empty for all)</span>
              </Label>
              <div className="space-y-2">
                {AGENTS.map(agent => (
                  <div key={agent.value} className="flex items-center gap-2">
                    <Checkbox
                      id={agent.value}
                      checked={uploadAgents.includes(agent.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setUploadAgents([...uploadAgents, agent.value]);
                        } else {
                          setUploadAgents(uploadAgents.filter(a => a !== agent.value));
                        }
                      }}
                    />
                    <Label htmlFor={agent.value} className="text-sm font-normal">
                      {agent.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-sm">Description (optional)</Label>
              <Input
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Brief description of this file..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={isUploading}
              className="bg-[#2D5A47] hover:bg-[#1E3D32]"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit File Settings</DialogTitle>
          </DialogHeader>

          {editingFile && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[#F5F0E6] flex items-center gap-2">
                <span>{FILE_ICONS[editingFile.file_type] || "📄"}</span>
                <span className="text-sm font-medium">{editingFile.filename}</span>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label className="text-sm">Category</Label>
                <Select 
                  value={editingFile.category} 
                  onValueChange={(v) => setEditingFile({ ...editingFile, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Agent Access */}
              <div className="space-y-1.5">
                <Label className="text-sm">Agent Access</Label>
                <div className="space-y-2">
                  {AGENTS.map(agent => (
                    <div key={agent.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-${agent.value}`}
                        checked={editingFile.agent_access.includes(agent.value)}
                        onCheckedChange={(checked) => {
                          const newAccess = checked
                            ? [...editingFile.agent_access, agent.value]
                            : editingFile.agent_access.filter(a => a !== agent.value);
                          setEditingFile({ ...editingFile, agent_access: newAccess });
                        }}
                      />
                      <Label htmlFor={`edit-${agent.value}`} className="text-sm font-normal">
                        {agent.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => editingFile && updateFile(editingFile.id, {
                category: editingFile.category,
                agent_access: editingFile.agent_access,
              })}
              className="bg-[#2D5A47] hover:bg-[#1E3D32]"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View File Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingFile && (
                <>
                  <span>{FILE_ICONS[viewingFile.file_type] || "📄"}</span>
                  <span className="truncate">{viewingFile.filename}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-[400px] max-h-[60vh] overflow-auto">
            {isLoadingView ? (
              <div className="flex items-center justify-center h-full text-[#8B9A8F]">
                Loading...
              </div>
            ) : viewingFile?.file_type === "pdf" && viewUrl ? (
              <iframe
                src={viewUrl}
                className="w-full h-[500px] border-0 rounded"
                title={viewingFile.filename}
              />
            ) : (viewingFile?.file_type === "txt" || viewingFile?.file_type === "markdown") && viewContent ? (
              <div className="w-full h-[500px] overflow-auto bg-[#FAF8F5] rounded p-4">
                <pre className="whitespace-pre-wrap break-words text-sm font-mono w-full overflow-x-hidden">
                  {viewContent}
                </pre>
              </div>
            ) : (viewingFile?.file_type === "docx" || viewingFile?.file_type === "xlsx") ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-[#8B9A8F]">
                <FileText className="w-12 h-12" />
                <p className="text-sm">Preview not available for {viewingFile.file_type.toUpperCase()} files</p>
                <Button
                  onClick={() => viewingFile && downloadFile(viewingFile)}
                  className="bg-[#2D5A47] hover:bg-[#1E3D32]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download to View
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[#8B9A8F]">
                Unable to load file
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {viewingFile && (
              <Button 
                onClick={() => downloadFile(viewingFile)}
                className="bg-[#2D5A47] hover:bg-[#1E3D32]"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
