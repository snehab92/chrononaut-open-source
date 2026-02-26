import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// iOS Shortcut API endpoint
// Creates or opens today's journal entry with minimal auth friction

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Return redirect URL to login with return path
      const baseUrl = new URL(request.url).origin;
      const returnPath = "/journal?date=today";
      return NextResponse.json({
        authenticated: false,
        loginUrl: `${baseUrl}/auth/login?returnTo=${encodeURIComponent(returnPath)}`,
      });
    }

    // Get today's date in user's timezone (or default to UTC)
    const today = new Date().toISOString().split("T")[0];

    // Check if entry exists for today
    const { data: existing } = await supabase
      .from("journal_entries")
      .select("id, entry_date")
      .eq("user_id", user.id)
      .eq("entry_date", today)
      .single();

    const baseUrl = new URL(request.url).origin;

    if (existing) {
      // Entry exists, return URL to open it
      return NextResponse.json({
        authenticated: true,
        entryExists: true,
        entryId: existing.id,
        date: today,
        openUrl: `${baseUrl}/journal?date=${today}`,
      });
    }

    // No entry yet, return URL that will create one
    return NextResponse.json({
      authenticated: true,
      entryExists: false,
      date: today,
      openUrl: `${baseUrl}/journal?date=${today}&new=true`,
    });
  } catch (error) {
    console.error("Shortcut API error:", error);
    return NextResponse.json(
      { error: "Failed to process shortcut request" },
      { status: 500 }
    );
  }
}

// POST - Quick create entry from iOS Shortcut
// Accepts voice transcription text and optional photo URL
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      text,
      photo_url,
      location_lat,
      location_lng,
      location_name,
    } = body;

    const today = new Date().toISOString().split("T")[0];

    // Check if entry already exists
    const { data: existing } = await supabase
      .from("journal_entries")
      .select("id, happened")
      .eq("user_id", user.id)
      .eq("entry_date", today)
      .single();

    if (existing) {
      // Append to existing entry
      const { data, error } = await supabase
        .from("journal_entries")
        .update({
          location_lat: location_lat || undefined,
          location_lng: location_lng || undefined,
          location_name: location_name || undefined,
          photo_url: photo_url || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        action: "updated",
        entryId: data.id,
        message: "Entry updated. Open app to add text.",
      });
    }

    // Create new entry
    const { data, error } = await supabase
      .from("journal_entries")
      .insert({
        user_id: user.id,
        entry_date: today,
        location_lat,
        location_lng,
        location_name,
        photo_url,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      action: "created",
      entryId: data.id,
      message: "Entry created. Open app to add text.",
    });
  } catch (error) {
    console.error("Shortcut POST error:", error);
    return NextResponse.json(
      { error: "Failed to create entry" },
      { status: 500 }
    );
  }
}
