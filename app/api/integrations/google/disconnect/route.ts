import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/integrations/google/disconnect
 * 
 * Disconnects Google Calendar integration
 */
export async function POST() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete token
  const { error: deleteError } = await supabase
    .from("integration_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", "google_calendar");

  if (deleteError) {
    console.error("Failed to delete Google token:", deleteError);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }

  // Optionally: Delete cached events (or keep for history)
  // For now, we'll keep them but you could delete with:
  // await supabase.from("calendar_events").delete().eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
