"use client";

import { useState, useEffect } from "react";
import { FileText, ChevronDown, ChevronUp, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type WeeklyReviewEntry } from "@/lib/journal/types";

interface ReviewWithContent extends WeeklyReviewEntry {
  isExpanded?: boolean;
}

// Get week range from entry date (assuming Sunday as week end)
function getWeekRange(entryDate: string): string {
  const end = new Date(entryDate + "T00:00:00");
  const start = new Date(end);
  start.setDate(start.getDate() - 6);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return `${formatDate(start)} - ${formatDate(end)}, ${end.getFullYear()}`;
}

export function WeeklyReviewsView() {
  const [reviews, setReviews] = useState<ReviewWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 10;

  // Load reviews
  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async (loadMore = false) => {
    if (!loadMore) setIsLoading(true);

    try {
      const currentOffset = loadMore ? offset : 0;
      const res = await fetch(
        `/api/journal/weekly-reviews?limit=${limit}&offset=${currentOffset}`
      );

      if (res.ok) {
        const data = await res.json();
        const newReviews = data.reviews.map((r: WeeklyReviewEntry) => ({
          ...r,
          isExpanded: false,
        }));

        if (loadMore) {
          setReviews((prev) => [...prev, ...newReviews]);
        } else {
          setReviews(newReviews);
        }
        setHasMore(data.hasMore);
        setOffset(currentOffset + limit);
      }
    } catch (error) {
      console.error("Failed to load reviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return { ...r, isExpanded: !r.isExpanded };
      })
    );
  };

  // Get excerpt from content (first 200 chars)
  const getExcerpt = (review: ReviewWithContent): string => {
    if (review.happened) {
      return review.happened.substring(0, 200) + (review.happened.length > 200 ? "..." : "");
    }
    return "Click to expand and view content...";
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-[#E8DCC4]">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-[#5C7A6B]" />
          <h2 className="text-lg font-serif font-semibold text-[#1E3D32]">
            Weekly Reviews
          </h2>
        </div>
        <p className="text-sm text-[#8B9A8F]">
          AI-generated summaries of your week, delivered every Sunday.
        </p>
      </div>

      {/* Reviews List */}
      <div className="p-6">
        {isLoading && reviews.length === 0 ? (
          <div className="text-center py-12 text-[#8B9A8F]">
            Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-[#C4B8A8] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#1E3D32] mb-2">
              No weekly reviews yet
            </h3>
            <p className="text-sm text-[#8B9A8F] max-w-md mx-auto">
              Weekly reviews are automatically generated every Sunday based on your
              journal entries from the past week. Keep journaling to receive your
              first review!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] overflow-hidden"
              >
                {/* Review Header */}
                <button
                  onClick={() => toggleExpand(review.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F5F0E6]/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#F5F0E6]">
                      <Calendar className="w-4 h-4 text-[#5C7A6B]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[#1E3D32]">
                        Week of {getWeekRange(review.entry_date)}
                      </h3>
                      <p className="text-xs text-[#8B9A8F]">
                        Generated {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {review.isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#8B9A8F]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#8B9A8F]" />
                  )}
                </button>

                {/* Collapsed Preview */}
                {!review.isExpanded && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-[#5C7A6B] line-clamp-2">
                      {getExcerpt(review)}
                    </p>
                  </div>
                )}

                {/* Expanded Content */}
                {review.isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#E8DCC4]/50">
                    <div className="pt-4">
                      {review.happened ? (
                        <div className="prose prose-sm max-w-none">
                          <div className="text-sm text-[#1E3D32] whitespace-pre-wrap">
                            {review.happened}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-[#8B9A8F] italic">
                          No content available.
                        </p>
                      )}
                    </div>

                    {/* Tags */}
                    {review.tags && review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#E8DCC4]/50">
                        {review.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs rounded-full bg-[#F5F0E6] text-[#5C7A6B]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => loadReviews(true)}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Load more reviews"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
