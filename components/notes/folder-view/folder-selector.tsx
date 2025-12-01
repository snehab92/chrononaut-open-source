"use client";

import { useState } from "react";
import { Folder, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FolderType } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

interface FolderSelectorProps {
  currentFolderId: string | null;
  folders: FolderType[];
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string) => Promise<FolderType | null>;
  trigger?: React.ReactNode;
  align?: "start" | "center" | "end";
}

export function FolderSelector({
  currentFolderId,
  folders,
  onSelectFolder,
  onCreateFolder,
  trigger,
  align = "start",
}: FolderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Filter to only show notebook folders
  const notebookFolders = folders.filter((f) => f.folder_type === "notebook");

  const currentFolder = folders.find((f) => f.id === currentFolderId);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsCreating(true);
    const newFolder = await onCreateFolder(newFolderName.trim());
    if (newFolder) {
      onSelectFolder(newFolder.id);
    }
    setNewFolderName("");
    setShowCreateDialog(false);
    setIsCreating(false);
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          {trigger || (
            <button className="text-xs text-[#8B9A8F] hover:text-[#1E3D32] hover:bg-[#F5F0E6] px-2 py-1 rounded transition-colors flex items-center gap-1">
              <Folder className="w-3 h-3" />
              {currentFolder ? currentFolder.name : "Set folder"}
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-40">
          {/* No folder / Unfiled option */}
          <DropdownMenuItem
            onClick={() => {
              onSelectFolder(null);
              setIsOpen(false);
            }}
            className={cn("text-xs py-1", !currentFolderId && "bg-[#F5F0E6]")}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[#8B9A8F]">Unfiled</span>
              {!currentFolderId && <Check className="w-3 h-3" />}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Existing folders */}
          {notebookFolders.map((folder) => (
            <DropdownMenuItem
              key={folder.id}
              onClick={() => {
                onSelectFolder(folder.id);
                setIsOpen(false);
              }}
              className={cn("text-xs py-1", folder.id === currentFolderId && "bg-[#F5F0E6]")}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5">
                  <Folder className="w-3 h-3 text-[#5C7A6B]" />
                  <span className="truncate">{folder.name}</span>
                </div>
                {folder.id === currentFolderId && (
                  <Check className="w-3 h-3 text-[#1E3D32]" />
                )}
              </div>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Create new folder */}
          <DropdownMenuItem
            onClick={() => {
              setIsOpen(false);
              setShowCreateDialog(true);
            }}
            className="text-xs py-1 text-[#1E3D32]"
          >
            <Plus className="w-3.5 h-3.5 mr-2" />
            New folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name..."
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={isCreating || !newFolderName.trim()}
              className="bg-[#1E3D32] hover:bg-[#2a5446]"
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
