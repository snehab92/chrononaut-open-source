"use client";

import { useState, useEffect } from "react";
import { Settings, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderTemplate } from "@/lib/notes/types";
import { getAllFolderTemplates, deleteFolderTemplate } from "@/lib/notes/folder-templates";

interface TemplateSelectorProps {
  folderId: string;
  onManageTemplates: () => void;
  onCreateTemplate?: () => void;
}

export function TemplateSelector({
  folderId,
  onManageTemplates,
  onCreateTemplate,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<FolderTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, [folderId]);

  const loadTemplates = async () => {
    setIsLoading(true);
    const data = await getAllFolderTemplates(folderId);
    setTemplates(data);
    setIsLoading(false);
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    const success = await deleteFolderTemplate(templateId);
    if (success) {
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    }
  };

  const activeTemplates = templates.filter((t) => t.is_active);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-[#5C7A6B] hover:bg-[#F5F0E6]"
        >
          <Settings className="w-4 h-4" />
          <span className="text-xs">Templates</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Add New Template */}
        <DropdownMenuItem
          onClick={onCreateTemplate || onManageTemplates}
          className="text-xs py-1.5"
        >
          <Plus className="w-3.5 h-3.5 mr-2 text-[#5C7A6B]" />
          New Template
        </DropdownMenuItem>

        {/* Active Templates List */}
        {isLoading ? (
          <div className="px-2 py-1.5 text-xs text-[#8B9A8F]">Loading...</div>
        ) : activeTemplates.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-[10px] font-medium text-[#8B9A8F] uppercase tracking-wide">
              Active
            </div>
            {activeTemplates.map((template) => (
              <DropdownMenuItem
                key={template.id}
                className="text-xs py-1.5 flex items-center justify-between group"
                onClick={onManageTemplates}
              >
                <span className="truncate flex-1">{template.name}</span>
                <button
                  onClick={(e) => handleDeleteTemplate(e, template.id)}
                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-all text-[#C4B89B] hover:text-red-500"
                  title="Delete template"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
