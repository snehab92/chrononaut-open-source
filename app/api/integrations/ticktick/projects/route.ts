import { createClient } from "@/lib/supabase/server";
import { TickTickClient } from "@/lib/ticktick/client";
import { NextResponse } from "next/server";

/**
 * GET /api/integrations/ticktick/projects
 *
 * Fetch all TickTick projects/lists for the current user
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get TickTick token
  const { data: tokenData } = await supabase
    .from("integration_tokens")
    .select("encrypted_access_token, encrypted_refresh_token")
    .eq("user_id", user.id)
    .eq("provider", "ticktick")
    .single();

  if (!tokenData) {
    return NextResponse.json({ connected: false, projects: [] });
  }

  try {
    const client = TickTickClient.fromToken(
      tokenData.encrypted_access_token,
      tokenData.encrypted_refresh_token
    );

    const projects = await client.getProjects();

    // Transform to simpler format
    const formattedProjects = projects
      .filter((p) => !p.closed) // Exclude closed/archived projects
      .map((p) => ({
        id: p.id,
        name: p.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      connected: true,
      projects: formattedProjects,
    });
  } catch (error) {
    console.error("Failed to fetch TickTick projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects", connected: true, projects: [] },
      { status: 500 }
    );
  }
}
