"use client";

import { useState } from "react";
import { Download, FileText, FileIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportFolder, ExportableNote } from "@/lib/notes/export";

interface FolderExportMenuProps {
  notes: ExportableNote[];
  folderName: string;
  className?: string;
}

export function FolderExportMenu({
  notes,
  folderName,
  className,
}: FolderExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "md" | "docx") => {
    if (notes.length === 0) return;

    setIsExporting(true);
    try {
      await exportFolder(notes, folderName, format);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  if (notes.length === 0) {
    return null;
  }

  const isMultiple = notes.length > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1.5 text-[#5C7A6B] hover:text-[#1E3D32] hover:bg-[#F5F0E6] ${className}`}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="text-xs font-medium">Export{isMultiple ? " All" : ""}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => handleExport("md")}
          disabled={isExporting}
          className="text-xs py-1.5"
        >
          <FileText className="w-3.5 h-3.5 mr-2" />
          <div className="flex flex-col">
            <span>Markdown</span>
            {isMultiple && (
              <span className="text-[10px] text-[#8B9A8F]">
                {notes.length} notes
              </span>
            )}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("docx")}
          disabled={isExporting}
          className="text-xs py-1.5"
        >
          <FileIcon className="w-3.5 h-3.5 mr-2" />
          <div className="flex flex-col">
            <span>Word</span>
            {isMultiple && (
              <span className="text-[10px] text-[#8B9A8F]">
                {notes.length} notes
              </span>
            )}
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
