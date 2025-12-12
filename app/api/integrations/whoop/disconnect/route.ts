import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/integrations/whoop/disconnect
 * 
 * Disconnects Whoop integration
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
    .eq("provider", "whoop");

  if (deleteError) {
    console.error("Failed to delete Whoop token:", deleteError);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
