"use client";

import { BookOpen, Camera, Heart, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { type JournalViewType } from "@/lib/journal/types";

interface JournalViewSelectorProps {
  currentView: JournalViewType;
  onViewChange: (view: JournalViewType) => void;
}

const VIEWS = [
  { id: 'entry-feed' as const, label: 'Journal', icon: BookOpen, description: 'Daily entries' },
  { id: 'photo-of-day' as const, label: 'Photos', icon: Camera, description: 'Photo calendar' },
  { id: 'mood-tracker' as const, label: 'Mood', icon: Heart, description: 'Mood patterns' },
  { id: 'weekly-reviews' as const, label: 'Reviews', icon: FileText, description: 'Weekly reviews' },
];

export function JournalViewSelector({ currentView, onViewChange }: JournalViewSelectorProps) {
  return (
    <nav className="flex flex-col gap-1">
      {VIEWS.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.id;

        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
              "hover:bg-[#F5F0E6]",
              isActive
                ? "bg-[#F5F0E6] text-[#1E3D32] font-medium border-l-2 border-[#D4A84B] -ml-[2px] pl-[14px]"
                : "text-[#5C7A6B]"
            )}
          >
            <Icon className={cn(
              "w-5 h-5 flex-shrink-0",
              isActive ? "text-[#2D5A47]" : "text-[#8B9A8F]"
            )} />
            <div className="flex flex-col min-w-0">
              <span className="text-sm truncate">{view.label}</span>
              <span className={cn(
                "text-xs truncate",
                isActive ? "text-[#5C7A6B]" : "text-[#8B9A8F]"
              )}>
                {view.description}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
