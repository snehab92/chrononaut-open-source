import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Get weekly review entries
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get entries with weekly-review tag
    const { data, error, count } = await supabase
      .from("journal_entries")
      .select("id, entry_date, encrypted_happened, encrypted_ai_insights, tags, created_at", {
        count: "exact",
      })
      .eq("user_id", user.id)
      .contains("tags", ["weekly-review"])
      .order("entry_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      reviews: data || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error("Weekly reviews error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly reviews" },
      { status: 500 }
    );
  }
}
