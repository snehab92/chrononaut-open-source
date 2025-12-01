"use client";

import { useState } from "react";
import { ChevronDown, Plus, Trash2, Pencil, Check, X, Table, LayoutGrid, Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { FolderView } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

interface ViewSelectorProps {
  views: FolderView[];
  activeViewId: string | null;
  onSelectView: (viewId: string) => void;
  onCreateView: () => void;
  onDeleteView: (viewId: string) => void;
  onRenameView: (viewId: string, name: string) => void;
}

const VIEW_TYPE_ICONS = {
  database: Table,
  gallery: LayoutGrid,
  kanban: Columns,
};

export function ViewSelector({
  views,
  activeViewId,
  onSelectView,
  onCreateView,
  onDeleteView,
  onRenameView,
}: ViewSelectorProps) {
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const activeView = views.find((v) => v.id === activeViewId);
  const ActiveIcon = activeView ? VIEW_TYPE_ICONS[activeView.view_type] : Table;

  const handleStartRename = (view: FolderView, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingViewId(view.id);
    setEditName(view.name);
  };

  const handleSaveRename = (viewId: string) => {
    if (editName.trim()) {
      onRenameView(viewId, editName.trim());
    }
    setEditingViewId(null);
    setEditName("");
  };

  const handleCancelRename = () => {
    setEditingViewId(null);
    setEditName("");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-[#1E3D32] hover:bg-[#F5F0E6] gap-2"
        >
          <ActiveIcon className="w-4 h-4" />
          <span>{activeView?.name || "Select View"}</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {views.map((view) => {
          const Icon = VIEW_TYPE_ICONS[view.view_type];
          const isEditing = editingViewId === view.id;

          return (
            <DropdownMenuItem
              key={view.id}
              className={cn(
                "flex items-center justify-between group text-xs py-1",
                view.id === activeViewId && "bg-[#F5F0E6]"
              )}
              onClick={() => !isEditing && onSelectView(view.id)}
            >
              {isEditing ? (
                <div
                  className="flex items-center gap-1.5 flex-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon className="w-3.5 h-3.5 text-[#5C7A6B]" />
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-5 text-xs flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveRename(view.id);
                      } else if (e.key === "Escape") {
                        handleCancelRename();
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => handleSaveRename(view.id)}
                  >
                    <Check className="w-2.5 h-2.5 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={handleCancelRename}
                  >
                    <X className="w-2.5 h-2.5 text-red-600" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-[#5C7A6B]" />
                    <span>{view.name}</span>
                    {view.is_default && (
                      <span className="text-[10px] text-[#8B9A8F]">(default)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={(e) => handleStartRename(view, e)}
                    >
                      <Pencil className="w-2.5 h-2.5 text-[#5C7A6B]" />
                    </Button>
                    {views.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteView(view.id);
                        }}
                      >
                        <Trash2 className="w-2.5 h-2.5 text-red-500" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateView} className="text-xs py-1 text-[#1E3D32]">
          <Plus className="w-3.5 h-3.5 mr-2" />
          Add View
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
