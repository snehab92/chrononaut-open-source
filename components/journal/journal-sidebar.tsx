"use client";

import { Menu, BookOpen, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { JournalViewSelector } from "./journal-view-selector";
import { type JournalViewType } from "@/lib/journal/types";
import {
  clearEncryptionData,
  isEncryptionInitialized,
} from "@/lib/journal/encryption";

interface JournalSidebarProps {
  currentView: JournalViewType;
  onViewChange: (view: JournalViewType) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JournalSidebar({
  currentView,
  onViewChange,
  isOpen,
  onOpenChange,
}: JournalSidebarProps) {
  const handleViewChange = (view: JournalViewType) => {
    onViewChange(view);
    onOpenChange(false); // Close sheet on mobile after selection
  };

  const handleLockJournal = () => {
    if (confirm("Lock your journal? You'll need to enter your passphrase to unlock.")) {
      clearEncryptionData();
      // Reload to show locked state
      window.location.reload();
    }
  };

  const isUnlocked = isEncryptionInitialized();

  return (
    <>
      {/* Desktop Sidebar - always visible on md+ */}
      <aside className="hidden md:flex flex-col w-[200px] bg-[#FAF8F5] border-r border-[#E8DCC4] p-4 h-full">
        <div className="flex items-center gap-2 mb-6 px-1">
          <BookOpen className="w-5 h-5 text-[#5C7A6B]" />
          <span className="font-serif font-semibold text-[#1E3D32]">Journal</span>
        </div>
        <JournalViewSelector
          currentView={currentView}
          onViewChange={onViewChange}
        />

        {/* Lock Button - at bottom */}
        <div className="mt-auto pt-4 border-t border-[#E8DCC4]">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLockJournal}
            disabled={!isUnlocked}
            className="w-full justify-start text-[#8B9A8F] hover:text-[#1E3D32] hover:bg-[#F5F0E6] disabled:opacity-50"
          >
            <Lock className="w-4 h-4 mr-2" />
            {isUnlocked ? "Lock Journal" : "Not encrypted"}
          </Button>
        </div>
      </aside>

      {/* Mobile Trigger + Sheet */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
            >
              <Menu className="w-5 h-5 text-[#5C7A6B]" />
              <span className="sr-only">Open journal navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[260px] bg-[#FAF8F5] p-0 flex flex-col">
            <SheetHeader className="p-4 border-b border-[#E8DCC4]">
              <SheetTitle className="flex items-center gap-2 text-left">
                <BookOpen className="w-5 h-5 text-[#5C7A6B]" />
                <span className="font-serif font-semibold text-[#1E3D32]">Journal</span>
              </SheetTitle>
            </SheetHeader>
            <div className="p-4 flex-1">
              <JournalViewSelector
                currentView={currentView}
                onViewChange={handleViewChange}
              />
            </div>

            {/* Lock Button - mobile */}
            <div className="p-4 border-t border-[#E8DCC4]">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLockJournal}
                disabled={!isUnlocked}
                className="w-full justify-start text-[#8B9A8F] hover:text-[#1E3D32] hover:bg-[#F5F0E6] disabled:opacity-50"
              >
                <Lock className="w-4 h-4 mr-2" />
                {isUnlocked ? "Lock Journal" : "Not encrypted"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

// Mobile header trigger button - for use in the page header
export function JournalMobileMenuTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="md:hidden h-9 w-9 p-0"
      onClick={onClick}
    >
      <Menu className="w-5 h-5 text-[#5C7A6B]" />
      <span className="sr-only">Open journal navigation</span>
    </Button>
  );
}
