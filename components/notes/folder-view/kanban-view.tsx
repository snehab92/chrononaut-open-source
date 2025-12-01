"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Star, GripVertical } from "lucide-react";
import { Note, NOTE_TYPE_ICONS, getLabelColor } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

interface KanbanViewProps {
  notes: Note[];
  allLabels: string[];
  onSelectNote: (note: Note) => void;
  onUpdateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
}

interface KanbanCardProps {
  note: Note;
  onSelectNote: (note: Note) => void;
  isDragging?: boolean;
}

function KanbanCard({ note, onSelectNote, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const label = note.tags[0] || null;
  const labelColors = label ? getLabelColor(label) : null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white border border-[#E8DCC4] rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group",
        (isDragging || isSortableDragging) && "opacity-50 shadow-lg"
      )}
      onClick={() => onSelectNote(note)}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing mt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-[#C4B89B]" />
        </div>

        {/* Card Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-medium text-[#1E3D32] truncate">
              {note.title || "Untitled"}
            </h4>
            {note.is_starred && (
              <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-[#8B9A8F]">
            <span>{NOTE_TYPE_ICONS[note.note_type]}</span>
            <span>{formatDate(note.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  id: string;
  label: string | null;
  notes: Note[];
  onSelectNote: (note: Note) => void;
}

function KanbanColumn({ id, label, notes, onSelectNote }: KanbanColumnProps) {
  const labelColors = label ? getLabelColor(label) : null;

  return (
    <div className="flex-shrink-0 w-72 bg-[#FAF8F5] rounded-lg">
      {/* Column Header */}
      <div className="px-3 py-2 border-b border-[#E8DCC4]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {label ? (
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded font-medium",
                  labelColors?.bg,
                  labelColors?.text
                )}
              >
                {label}
              </span>
            ) : (
              <span className="text-xs text-[#8B9A8F] font-medium">
                No Label
              </span>
            )}
          </div>
          <span className="text-xs text-[#8B9A8F]">{notes.length}</span>
        </div>
      </div>

      {/* Column Content */}
      <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
        <SortableContext
          items={notes.map((n) => n.id)}
          strategy={verticalListSortingStrategy}
        >
          {notes.map((note) => (
            <KanbanCard
              key={note.id}
              note={note}
              onSelectNote={onSelectNote}
            />
          ))}
        </SortableContext>
        {notes.length === 0 && (
          <div className="text-center py-8 text-xs text-[#8B9A8F]">
            No notes
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanView({
  notes,
  allLabels,
  onSelectNote,
  onUpdateNote,
}: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Group notes by label
  const getColumns = () => {
    const columns: { id: string; label: string | null; notes: Note[] }[] = [];

    // "No Label" column first
    const untaggedNotes = notes.filter((n) => n.tags.length === 0);
    columns.push({ id: "__no_label__", label: null, notes: untaggedNotes });

    // One column per unique label found in notes or allLabels
    const labelsInNotes = new Set(notes.flatMap((n) => n.tags));
    const allUniqueLabels = new Set([...allLabels, ...labelsInNotes]);

    allUniqueLabels.forEach((label) => {
      const labelNotes = notes.filter((n) => n.tags.includes(label));
      columns.push({ id: label, label, notes: labelNotes });
    });

    return columns;
  };

  const columns = getColumns();
  const activeNote = activeId ? notes.find((n) => n.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeNote = notes.find((n) => n.id === active.id);
    if (!activeNote) return;

    // Find which column the note was dropped into
    // Check if dropped directly on a column header or on another card
    const overId = over.id as string;

    // Find the column containing the drop target
    let targetColumn = columns.find((c) => c.id === overId);
    if (!targetColumn) {
      // Dropped on a card - find which column that card is in
      const targetNote = notes.find((n) => n.id === overId);
      if (targetNote) {
        const targetLabel = targetNote.tags[0] || null;
        targetColumn = columns.find((c) => c.label === targetLabel);
      }
    }

    if (!targetColumn) return;

    // Update the note's label
    const newLabel = targetColumn.label;
    const currentLabel = activeNote.tags[0] || null;

    if (newLabel !== currentLabel) {
      await onUpdateNote(activeNote.id, {
        tags: newLabel ? [newLabel] : [],
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-4 overflow-x-auto">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            label={column.label}
            notes={column.notes}
            onSelectNote={onSelectNote}
          />
        ))}
      </div>

      <DragOverlay>
        {activeNote && (
          <div className="bg-white border border-[#1E3D32] rounded-lg p-3 shadow-xl w-72 opacity-90">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-sm font-medium text-[#1E3D32] truncate">
                {activeNote.title || "Untitled"}
              </h4>
              {activeNote.is_starred && (
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8B9A8F]">
              <span>{NOTE_TYPE_ICONS[activeNote.note_type]}</span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
