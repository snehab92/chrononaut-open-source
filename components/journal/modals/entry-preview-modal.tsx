"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MOOD_CONFIG, type MoodLabel, type JournalEntry } from "@/lib/journal/types";

interface EntryPreviewModalProps {
  entry: JournalEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EntryPreviewModal({ entry, isOpen, onClose }: EntryPreviewModalProps) {
  const router = useRouter();

  const navigateToEntry = () => {
    if (entry) {
      router.push(`/journal?date=${entry.entry_date}`);
      onClose();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!entry) return null;

  const moodConfig = entry.mood_label ? MOOD_CONFIG[entry.mood_label as MoodLabel] : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-[#FAF8F5]">
        {/* Photo Header */}
        {entry.photo_url && (
          <div className="relative w-full aspect-video">
            <img
              src={entry.photo_url}
              alt={`Journal photo from ${entry.entry_date}`}
              className="w-full h-full object-cover"
            />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          <DialogHeader className="mb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-[#1E3D32] font-serif">
                <Calendar className="w-4 h-4 text-[#5C7A6B]" />
                {formatDate(entry.entry_date)}
              </DialogTitle>
              {moodConfig && (
                <span
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-sm",
                    moodConfig.bgColor,
                    moodConfig.color
                  )}
                >
                  <span>{moodConfig.emoji}</span>
                  <span className="text-xs">{entry.mood_label}</span>
                </span>
              )}
            </div>

            {/* Location */}
            {entry.location_name && (
              <div className="flex items-center gap-1.5 text-sm text-[#5C7A6B] mt-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>{entry.location_name}</span>
              </div>
            )}
          </DialogHeader>

          {/* Content */}
          <div className="space-y-3">
            {entry.happened && (
              <div>
                <h4 className="text-xs font-medium text-[#8B9A8F] uppercase tracking-wide mb-1">
                  What happened
                </h4>
                <p className="text-sm text-[#1E3D32] line-clamp-3">
                  {entry.happened}
                </p>
              </div>
            )}
            {entry.feelings && (
              <div>
                <h4 className="text-xs font-medium text-[#8B9A8F] uppercase tracking-wide mb-1">
                  How I felt
                </h4>
                <p className="text-sm text-[#1E3D32] line-clamp-3">
                  {entry.feelings}
                </p>
              </div>
            )}
            {entry.grateful && (
              <div>
                <h4 className="text-xs font-medium text-[#8B9A8F] uppercase tracking-wide mb-1">
                  Grateful for
                </h4>
                <p className="text-sm text-[#1E3D32] line-clamp-3">
                  {entry.grateful}
                </p>
              </div>
            )}

            {/* Empty state if no content */}
            {!entry.happened &&
              !entry.feelings &&
              !entry.grateful && (
                <p className="text-sm text-[#8B9A8F] italic">
                  No written content for this day.
                </p>
              )}
          </div>

          {/* View Full Entry Button */}
          <div className="mt-5 pt-4 border-t border-[#E8DCC4]">
            <Button
              onClick={navigateToEntry}
              variant="outline"
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Full Entry
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
