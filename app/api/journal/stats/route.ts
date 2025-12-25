import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Get aggregated journal statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    // Get all entries for the year with relevant fields
    const { data: entries, error: entriesError } = await supabase
      .from("journal_entries")
      .select("entry_date, photo_url, location_name, mood_label")
      .eq("user_id", user.id)
      .gte("entry_date", startOfYear)
      .lte("entry_date", endOfYear);

    if (entriesError) throw entriesError;

    // Calculate unique locations
    const locations = new Set<string>();
    entries?.forEach((e) => {
      if (e.location_name) locations.add(e.location_name);
    });

    // Calculate photo stats
    const entriesWithPhotos = entries?.filter((e) => e.photo_url) || [];
    const photoLocationCounts = new Map<string, number>();
    entriesWithPhotos.forEach((e) => {
      if (e.location_name) {
        photoLocationCounts.set(
          e.location_name,
          (photoLocationCounts.get(e.location_name) || 0) + 1
        );
      }
    });

    // Find most photographed location
    let mostPhotographedLocation: string | null = null;
    let maxPhotoCount = 0;
    photoLocationCounts.forEach((count, location) => {
      if (count > maxPhotoCount) {
        maxPhotoCount = count;
        mostPhotographedLocation = location;
      }
    });

    // Calculate mood breakdown
    const moodCounts = new Map<string, number>();
    let totalMoodEntries = 0;
    entries?.forEach((e) => {
      if (e.mood_label) {
        moodCounts.set(e.mood_label, (moodCounts.get(e.mood_label) || 0) + 1);
        totalMoodEntries++;
      }
    });

    const moodBreakdown = Array.from(moodCounts.entries()).map(([mood, count]) => ({
      mood,
      count,
      percentage: totalMoodEntries > 0 ? Math.round((count / totalMoodEntries) * 100) : 0,
    }));

    // Sort by count descending
    moodBreakdown.sort((a, b) => b.count - a.count);

    return NextResponse.json({
      uniqueLocations: locations.size,
      totalPhotos: entriesWithPhotos.length,
      daysWithPhotos: new Set(entriesWithPhotos.map((e) => e.entry_date)).size,
      mostPhotographedLocation,
      moodBreakdown,
      year,
    });
  } catch (error) {
    console.error("Journal stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch journal statistics" },
      { status: 500 }
    );
  }
}
