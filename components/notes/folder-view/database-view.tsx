"use client";

import { useState, useRef } from "react";
import { Star, ChevronUp, ChevronDown, GripVertical, Trash2 } from "lucide-react";
import {
  Note,
  FolderType,
  ViewConfig,
  SortField,
  DATABASE_COLUMNS,
  NOTE_TYPE_ICONS,
  getLabelColor,
} from "@/lib/notes/types";
import { LabelSelector } from "./label-selector";
import { FolderSelector } from "./folder-selector";
import { cn } from "@/lib/utils";

interface DatabaseViewProps {
  notes: Note[];
  config: ViewConfig;
  allLabels: string[];
  folders: FolderType[];
  onConfigChange: (config: ViewConfig) => void;
  onSelectNote: (note: Note) => void;
  onUpdateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  onCreateFolder: (name: string) => Promise<FolderType | null>;
  onDeleteNote?: (noteId: string) => Promise<void>;
}

export function DatabaseView({
  notes,
  config,
  allLabels,
  folders,
  onConfigChange,
  onSelectNote,
  onUpdateNote,
  onCreateFolder,
  onDeleteNote,
}: DatabaseViewProps) {
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartRef = useRef({ x: 0, width: 0 });

  // Get column width
  const getColumnWidth = (columnId: string) => {
    const column = DATABASE_COLUMNS.find((c) => c.id === columnId);
    if (!column) return 100;
    return config.columnWidths?.[columnId] ?? column.defaultWidth;
  };

  // Handle column resize
  const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = getColumnWidth(columnId);
    resizeStartRef.current = { x: startX, width: startWidth };
    setResizingColumn(columnId);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const column = DATABASE_COLUMNS.find((c) => c.id === columnId);
      if (!column) return;

      const delta = moveEvent.clientX - resizeStartRef.current.x;
      const newWidth = Math.max(
        column.minWidth,
        Math.min(column.maxWidth, resizeStartRef.current.width + delta)
      );

      onConfigChange({
        ...config,
        columnWidths: {
          ...config.columnWidths,
          [columnId]: newWidth,
        },
      });
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Handle sort - supports multi-sort
  const handleSort = (field: string) => {
    const sortField = field as SortField;
    const currentRules = config.sortRules || [{ field: config.sortField, direction: config.sortDirection }];
    const existingIndex = currentRules.findIndex((r) => r.field === sortField);

    let newRules = [...currentRules];

    if (existingIndex === 0) {
      // Toggle direction of primary sort
      newRules[0] = {
        ...newRules[0],
        direction: newRules[0].direction === "asc" ? "desc" : "asc",
      };
    } else if (existingIndex > 0) {
      // Move to primary sort
      const [rule] = newRules.splice(existingIndex, 1);
      newRules.unshift({ ...rule, direction: "desc" });
    } else {
      // Add as primary sort
      newRules.unshift({ field: sortField, direction: "desc" });
    }

    // Keep max 3 sort rules
    newRules = newRules.slice(0, 3);

    onConfigChange({
      ...config,
      sortField: newRules[0]?.field || "updated_at",
      sortDirection: newRules[0]?.direction || "desc",
      sortRules: newRules,
    });
  };

  // Get sort indicator for a column
  const getSortIndicator = (columnId: string) => {
    const rules = config.sortRules || [{ field: config.sortField, direction: config.sortDirection }];
    const index = rules.findIndex((r) => r.field === columnId);
    if (index === -1) return null;
    return {
      direction: rules[index].direction,
      order: index + 1,
    };
  };

  const handleToggleStar = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    await onUpdateNote(note.id, { is_starred: !note.is_starred });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  // Strip HTML and get content preview
  const getContentPreview = (content: string | null, maxLength: number = 60) => {
    if (!content) return "";
    const text = content.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  };

  // Group notes if grouping is enabled
  const getGroupedNotes = () => {
    if (!config.groupByField) {
      return [{ key: null, label: null, notes }];
    }

    const groups: Map<string, Note[]> = new Map();
    const noGroupKey = "__no_group__";

    notes.forEach((note) => {
      let groupKey: string;
      switch (config.groupByField) {
        case "tags":
          groupKey = note.tags[0] || noGroupKey;
          break;
        case "note_type":
          groupKey = note.note_type;
          break;
        case "is_starred":
          groupKey = note.is_starred ? "starred" : "not_starred";
          break;
        default:
          groupKey = noGroupKey;
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(note);
    });

    return Array.from(groups.entries()).map(([key, groupNotes]) => ({
      key,
      label: key === noGroupKey
        ? "No " + (config.groupByField === "tags" ? "Label" : config.groupByField?.replace("_", " "))
        : key,
      notes: groupNotes,
    }));
  };

  const groupedNotes = getGroupedNotes();

  // Get visible columns
  const visibleColumns = DATABASE_COLUMNS.filter((col) =>
    config.visibleColumns.includes(col.id)
  );

  const totalWidth = visibleColumns.reduce((sum, col) => sum + getColumnWidth(col.id), 0);

  return (
    <div className="w-full overflow-x-auto">
      {/* Header Row */}
      <div
        className="flex items-center border-b border-[#E8DCC4] bg-[#FAF8F5] sticky top-0 z-10"
        style={{ minWidth: totalWidth }}
      >
        {visibleColumns.map((column, index) => {
          const sortInfo = getSortIndicator(column.id);
          const width = getColumnWidth(column.id);

          return (
            <div
              key={column.id}
              className={cn(
                "relative px-3 py-2 text-xs font-medium text-[#5C7A6B] uppercase tracking-wider select-none flex-shrink-0",
                column.sortable && "cursor-pointer hover:text-[#1E3D32]"
              )}
              style={{ width }}
              onClick={() => column.sortable && handleSort(column.id)}
            >
              <div className="flex items-center gap-1">
                <span className="truncate">{column.label}</span>
                {sortInfo && (
                  <div className="flex items-center">
                    {sortInfo.direction === "asc" ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    {(config.sortRules?.length || 0) > 1 && (
                      <span className="text-[10px] ml-0.5 bg-[#1E3D32] text-white rounded-full w-3 h-3 flex items-center justify-center">
                        {sortInfo.order}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {/* Resize Handle */}
              {index < visibleColumns.length - 1 && (
                <div
                  className={cn(
                    "absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[#1E3D32]/20 flex items-center justify-center",
                    resizingColumn === column.id && "bg-[#1E3D32]/30"
                  )}
                  onMouseDown={(e) => handleResizeStart(e, column.id)}
                >
                  <GripVertical className="w-3 h-3 text-[#C4B89B] opacity-0 hover:opacity-100" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Data Rows */}
      <div>
        {groupedNotes.map((group) => (
          <div key={group.key || "all"}>
            {/* Group Header */}
            {config.groupByField && (
              <div className="px-3 py-2 bg-[#F5F0E6] border-b border-[#E8DCC4] text-sm font-medium text-[#1E3D32] flex items-center gap-2">
                {config.groupByField === "tags" && group.key !== "__no_group__" ? (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs",
                      getLabelColor(group.key!).bg,
                      getLabelColor(group.key!).text
                    )}
                  >
                    {group.label}
                  </span>
                ) : config.groupByField === "note_type" && group.key !== "__no_group__" ? (
                  <span>
                    {NOTE_TYPE_ICONS[group.key as keyof typeof NOTE_TYPE_ICONS]} {group.label}
                  </span>
                ) : config.groupByField === "is_starred" ? (
                  <span>{group.key === "starred" ? "⭐ Starred" : "Not Starred"}</span>
                ) : (
                  <span className="text-[#8B9A8F]">{group.label}</span>
                )}
                <span className="text-xs text-[#8B9A8F]">({group.notes.length})</span>
              </div>
            )}

            {/* Notes in group */}
            {group.notes.map((note) => {
              const label = note.tags[0] || null;
              const noteFolder = folders.find((f) => f.id === note.folder_id);

              return (
                <div
                  key={note.id}
                  className="flex items-center border-b border-[#F5F0E6] hover:bg-[#FAF8F5] cursor-pointer transition-colors"
                  style={{ minWidth: totalWidth }}
                  onClick={() => onSelectNote(note)}
                >
                  {visibleColumns.map((column) => {
                    const width = getColumnWidth(column.id);

                    return (
                      <div
                        key={column.id}
                        className="px-3 py-3 flex-shrink-0 overflow-hidden"
                        style={{ width }}
                      >
                        {/* Title */}
                        {column.id === "title" && (
                          <span className="text-sm text-[#1E3D32] font-medium truncate block">
                            {note.title || "Untitled"}
                          </span>
                        )}

                        {/* Content Preview */}
                        {column.id === "content_preview" && (
                          <span className="text-xs text-[#8B9A8F] truncate block">
                            {getContentPreview(note.content)}
                          </span>
                        )}

                        {/* Type */}
                        {column.id === "note_type" && (
                          <span className="text-sm">
                            {NOTE_TYPE_ICONS[note.note_type]}
                          </span>
                        )}

                        {/* Label */}
                        {column.id === "tags" && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <LabelSelector
                              currentLabel={label}
                              allLabels={allLabels}
                              onSelectLabel={(newLabel) =>
                                onUpdateNote(note.id, {
                                  tags: newLabel ? [newLabel] : [],
                                })
                              }
                            />
                          </div>
                        )}

                        {/* Folder */}
                        {column.id === "folder" && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <FolderSelector
                              currentFolderId={note.folder_id}
                              folders={folders}
                              onSelectFolder={(folderId) =>
                                onUpdateNote(note.id, { folder_id: folderId })
                              }
                              onCreateFolder={onCreateFolder}
                            />
                          </div>
                        )}

                        {/* Starred */}
                        {column.id === "is_starred" && (
                          <button
                            onClick={(e) => handleToggleStar(note, e)}
                            className="p-1 hover:bg-[#F5F0E6] rounded transition-colors"
                          >
                            <Star
                              className={cn(
                                "w-4 h-4",
                                note.is_starred
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-[#C4B89B]"
                              )}
                            />
                          </button>
                        )}

                        {/* Created */}
                        {column.id === "created_at" && (
                          <span className="text-xs text-[#8B9A8F]">
                            {formatDate(note.created_at)}
                          </span>
                        )}

                        {/* Updated */}
                        {column.id === "updated_at" && (
                          <span className="text-xs text-[#8B9A8F]">
                            {formatDate(note.updated_at)}
                          </span>
                        )}

                        {/* Actions (Delete) */}
                        {column.id === "actions" && onDeleteNote && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteNote(note.id);
                            }}
                            className="p-1 hover:bg-red-50 rounded transition-colors text-[#C4B89B] hover:text-red-500"
                            title="Delete note"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
