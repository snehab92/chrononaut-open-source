"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { JournalSidebar, JournalMobileMenuTrigger } from "@/components/journal/journal-sidebar";
import { EntryFeedView } from "@/components/journal/views/entry-feed-view";
import { PhotoOfDayView } from "@/components/journal/views/photo-of-day-view";
import { MoodTrackerView } from "@/components/journal/views/mood-tracker-view";
import { WeeklyReviewsView } from "@/components/journal/views/weekly-reviews-view";
import { type JournalViewType } from "@/lib/journal/types";
import { getToday } from "@/lib/date-utils";

function JournalPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get view and date from URL params
  const viewParam = searchParams.get("view") as JournalViewType | null;
  const dateParam = searchParams.get("date");

  const [currentView, setCurrentView] = useState<JournalViewType>(
    viewParam || "entry-feed"
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    dateParam === "today" ? getToday() : dateParam || getToday()
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync view from URL
  useEffect(() => {
    if (viewParam && viewParam !== currentView) {
      setCurrentView(viewParam);
    }
  }, [viewParam]);

  // Update URL when view changes
  const handleViewChange = (view: JournalViewType) => {
    setCurrentView(view);
    const params = new URLSearchParams(searchParams.toString());
    if (view === "entry-feed") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    router.push(`/journal?${params.toString()}`);
  };

  // Update URL when date changes (for entry-feed view)
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", date);
    router.push(`/journal?${params.toString()}`);
  };

  // Get view title for mobile header
  const getViewTitle = () => {
    switch (currentView) {
      case "photo-of-day":
        return "Photos";
      case "mood-tracker":
        return "Mood";
      case "weekly-reviews":
        return "Reviews";
      default:
        return "Journal";
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#FAF8F5]">
      {/* Sidebar */}
      <JournalSidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        isOpen={isMobileMenuOpen}
        onOpenChange={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#E8DCC4] px-4 py-3">
          <div className="flex items-center gap-3">
            <JournalMobileMenuTrigger onClick={() => setIsMobileMenuOpen(true)} />
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#5C7A6B]" />
              <h1 className="text-lg font-serif font-semibold text-[#1E3D32]">
                {getViewTitle()}
              </h1>
            </div>
          </div>
        </div>

        {/* View Content */}
        {currentView === "entry-feed" && (
          <EntryFeedView
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
          />
        )}
        {currentView === "photo-of-day" && <PhotoOfDayView />}
        {currentView === "mood-tracker" && <MoodTrackerView />}
        {currentView === "weekly-reviews" && <WeeklyReviewsView />}
      </div>
    </div>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-4rem)] bg-[#FAF8F5] items-center justify-center">
        <div className="animate-pulse text-[#8B9A8F]">Loading...</div>
      </div>
    }>
      <JournalPageContent />
    </Suspense>
  );
}
