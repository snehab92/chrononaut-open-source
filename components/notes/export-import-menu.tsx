"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  FileIcon,
  Share2,
  MoreHorizontal,
  Loader2,
  Mail,
  Paperclip,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportNote, ExportableNote } from "@/lib/notes/export";
import { shareViaPaste, shareViaDownload } from "@/lib/notes/share/email-share";

interface ExportImportMenuProps {
  note: ExportableNote;
  onImport?: (result: { title: string; content: string }) => void;
  onOpenImportDialog?: () => void;
  onDelete?: () => void;
  variant?: "icon" | "button";
}

export function ExportImportMenu({
  note,
  onImport,
  onOpenImportDialog,
  onDelete,
  variant = "icon",
}: ExportImportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleExport = async (format: "md" | "docx") => {
    setIsExporting(true);
    try {
      await exportNote(note, format);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSharePaste = () => {
    setIsSharing(true);
    try {
      shareViaPaste({
        noteTitle: note.title,
        noteContent: note.content || "",
        noteType: note.note_type,
        tags: note.tags,
      });
    } catch (error) {
      console.error("Share failed:", error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareDownload = async () => {
    setIsSharing(true);
    try {
      await shareViaDownload({
        noteTitle: note.title,
        noteContent: note.content || "",
        noteType: note.note_type,
        tags: note.tags,
      });
    } catch (error) {
      console.error("Share failed:", error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={isExporting || isSharing}
          >
            {isExporting || isSharing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MoreHorizontal className="w-4 h-4" />
            )}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-[#5C7A6B]"
            disabled={isExporting || isSharing}
          >
            {isExporting || isSharing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MoreHorizontal className="w-4 h-4" />
            )}
            <span className="text-xs">More</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {/* Export submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={isExporting}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => handleExport("md")}
              disabled={isExporting}
            >
              <FileText className="w-4 h-4 mr-2" />
              Markdown (.md)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleExport("docx")}
              disabled={isExporting}
            >
              <FileIcon className="w-4 h-4 mr-2" />
              Word (.docx)
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Share submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={isSharing}>
            <Share2 className="w-4 h-4 mr-2" />
            Share via Email
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={handleSharePaste}
              disabled={isSharing}
            >
              <Mail className="w-4 h-4 mr-2" />
              <div className="flex flex-col">
                <span>Paste in email</span>
                <span className="text-xs text-[#8B9A8F]">Content in email body</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleShareDownload}
              disabled={isSharing}
            >
              <Paperclip className="w-4 h-4 mr-2" />
              <div className="flex flex-col">
                <span>Download to attach</span>
                <span className="text-xs text-[#8B9A8F]">Word document to attach</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Delete option */}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete note
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
