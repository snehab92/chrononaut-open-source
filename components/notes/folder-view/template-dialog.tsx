"use client";

import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderTemplate, NoteType, NOTE_TYPE_LABELS, getLabelColor } from "@/lib/notes/types";
import {
  getFolderTemplate,
  saveFolderTemplate,
  deleteFolderTemplate,
} from "@/lib/notes/folder-templates";
import { cn } from "@/lib/utils";
import { RichEditor } from "@/components/rich-editor";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  userId: string;
  allLabels: string[];
}

export function TemplateDialog({
  open,
  onOpenChange,
  folderId,
  userId,
  allLabels,
}: TemplateDialogProps) {
  const [template, setTemplate] = useState<FolderTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState("Default Template");
  const [defaultContent, setDefaultContent] = useState("");
  const [defaultNoteType, setDefaultNoteType] = useState<NoteType>("document");
  const [defaultLabel, setDefaultLabel] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");

  // Load existing template
  useEffect(() => {
    if (open) {
      loadTemplate();
    }
  }, [open, folderId]);

  const loadTemplate = async () => {
    setIsLoading(true);
    const existingTemplate = await getFolderTemplate(folderId);
    if (existingTemplate) {
      setTemplate(existingTemplate);
      setName(existingTemplate.name);
      setDefaultContent(existingTemplate.default_content || "");
      setDefaultNoteType(existingTemplate.default_note_type as NoteType);
      setDefaultLabel(existingTemplate.default_label);
      setAiPrompt(existingTemplate.ai_prompt || "");
    } else {
      // Reset to defaults
      setTemplate(null);
      setName("Default Template");
      setDefaultContent("");
      setDefaultNoteType("document");
      setDefaultLabel(null);
      setAiPrompt("");
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const savedTemplate = await saveFolderTemplate(folderId, userId, {
      name,
      default_content: defaultContent || null,
      default_note_type: defaultNoteType,
      default_label: defaultLabel,
      ai_prompt: aiPrompt || null,
    });
    if (savedTemplate) {
      setTemplate(savedTemplate);
    }
    setIsSaving(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (template) {
      await deleteFolderTemplate(template.id);
      setTemplate(null);
      setName("Default Template");
      setDefaultContent("");
      setDefaultNoteType("document");
      setDefaultLabel(null);
      setAiPrompt("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium text-[#1E3D32]">
            {template ? "Edit Template" : "New Template"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-[#8B9A8F]">Loading...</div>
        ) : (
          <div className="space-y-3 py-2">
            {/* Template Name */}
            <div className="space-y-1.5">
              <Label htmlFor="template-name" className="text-xs text-[#1E3D32]">
                Template Name
              </Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Meeting Notes, Project Brief"
                className="border-[#E8DCC4] h-8 text-sm"
              />
            </div>

            {/* Default Note Type & Label - Side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#1E3D32]">Note Type</Label>
                <Select
                  value={defaultNoteType}
                  onValueChange={(v) => setDefaultNoteType(v as NoteType)}
                >
                  <SelectTrigger className="border-[#E8DCC4] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NOTE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="text-sm">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-[#1E3D32]">Label</Label>
                <Select
                  value={defaultLabel || "__none__"}
                  onValueChange={(v) =>
                    setDefaultLabel(v === "__none__" ? null : v)
                  }
                >
                  <SelectTrigger className="border-[#E8DCC4] h-8 text-sm">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-sm">None</SelectItem>
                    {allLabels.map((label) => {
                      const colors = getLabelColor(label);
                      return (
                        <SelectItem key={label} value={label} className="text-sm">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px]",
                              colors.bg,
                              colors.text
                            )}
                          >
                            {label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Default Content */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[#1E3D32]">
                Default Content
              </Label>
              <div className="border border-[#E8DCC4] rounded-md h-24 bg-white overflow-hidden">
                <RichEditor
                  content={defaultContent}
                  onChange={setDefaultContent}
                  placeholder="Type / for formatting..."
                  hideToolbar
                />
              </div>
            </div>

            {/* AI Prompt (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="ai-prompt" className="text-xs text-[#1E3D32]">
                AI Context
              </Label>
              <Textarea
                id="ai-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Context for AI..."
                className="border-[#E8DCC4] h-12 text-sm resize-none"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between pt-2">
          <div>
            {template && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="h-8 text-xs bg-[#1E3D32] hover:bg-[#2a5446] text-white"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
