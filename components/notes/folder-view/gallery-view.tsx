"use client";

import { Star } from "lucide-react";
import { Note, NOTE_TYPE_ICONS, getLabelColor } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

interface GalleryViewProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
}

export function GalleryView({ notes, onSelectNote }: GalleryViewProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Strip HTML tags and get plain text preview
  const getContentPreview = (content: string | null, maxLength: number = 100) => {
    if (!content) return "";
    const text = content.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  };

  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {notes.map((note) => {
        const hasPhoto = !!note.photo_url;
        const label = note.tags[0] || null;
        const labelColors = label ? getLabelColor(label) : null;

        return (
          <div
            key={note.id}
            className="group bg-white border border-[#E8DCC4] rounded-lg overflow-hidden hover:shadow-md hover:border-[#1E3D32]/30 transition-all cursor-pointer"
            onClick={() => onSelectNote(note)}
          >
            {/* Photo Display */}
            {hasPhoto ? (
              <div className="relative aspect-video bg-[#F5F0E6]">
                <img
                  src={note.photo_url!}
                  alt={note.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Title Overlay on Photo */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <h3 className="text-white font-medium text-sm truncate">
                    {note.title || "Untitled"}
                  </h3>
                </div>
                {/* Starred Badge */}
                {note.is_starred && (
                  <div className="absolute top-2 right-2">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400 drop-shadow" />
                  </div>
                )}
              </div>
            ) : (
              /* Content Preview (no photo) */
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-sm text-[#1E3D32] line-clamp-2">
                    {note.title || "Untitled"}
                  </h3>
                  {note.is_starred && (
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                  )}
                </div>
                {note.content && (
                  <p className="text-xs text-[#5C7A6B] line-clamp-3">
                    {getContentPreview(note.content)}
                  </p>
                )}
              </div>
            )}

            {/* Metadata Footer */}
            <div
              className={cn(
                "px-4 py-2 border-t border-[#F5F0E6] flex items-center justify-between",
                hasPhoto && "bg-white"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{NOTE_TYPE_ICONS[note.note_type]}</span>
                {label && (
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded",
                      labelColors?.bg,
                      labelColors?.text
                    )}
                  >
                    {label}
                  </span>
                )}
              </div>
              <span className="text-xs text-[#8B9A8F]">
                {formatDate(note.updated_at)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
