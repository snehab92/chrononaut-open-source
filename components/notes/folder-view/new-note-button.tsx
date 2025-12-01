"use client";

import { useState, useEffect } from "react";
import { Plus, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderTemplate, NOTE_TYPE_ICONS } from "@/lib/notes/types";
import { getAllFolderTemplates } from "@/lib/notes/folder-templates";

interface NewNoteButtonProps {
  folderId: string;
  onCreateNote: (templateId?: string) => void;
}

export function NewNoteButton({ folderId, onCreateNote }: NewNoteButtonProps) {
  const [templates, setTemplates] = useState<FolderTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, [folderId]);

  const loadTemplates = async () => {
    setIsLoading(true);
    const data = await getAllFolderTemplates(folderId);
    // Only show active templates
    setTemplates(data.filter((t) => t.is_active));
    setIsLoading(false);
  };

  const hasTemplates = templates.length > 0;

  // If no templates, just show a simple button
  if (!hasTemplates && !isLoading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCreateNote()}
        className="gap-1.5 text-[#5C7A6B] hover:text-[#1E3D32] hover:bg-[#F5F0E6]"
      >
        <Plus className="w-4 h-4" />
        <span className="text-xs font-medium">New Note</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-[#5C7A6B] hover:text-[#1E3D32] hover:bg-[#F5F0E6]"
        >
          <Plus className="w-4 h-4" />
          <span className="text-xs font-medium">New Note</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {isLoading ? (
          <div className="px-2 py-1.5 text-xs text-[#8B9A8F]">Loading...</div>
        ) : (
          <>
            {/* Blank note option */}
            <DropdownMenuItem
              onClick={() => onCreateNote()}
              className="text-xs py-1.5"
            >
              <File className="w-3.5 h-3.5 mr-2 text-[#8B9A8F]" />
              Blank Note
            </DropdownMenuItem>

            {templates.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1 text-[10px] font-medium text-[#8B9A8F] uppercase tracking-wide">
                  Templates
                </div>
                {templates.map((template) => (
                  <DropdownMenuItem
                    key={template.id}
                    onClick={() => onCreateNote(template.id)}
                    className="text-xs py-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 mr-2 text-[#5C7A6B]" />
                    <span className="truncate">{template.name}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
