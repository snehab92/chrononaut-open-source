import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateMorningInsight,
  getMorningInsight,
  hasTodayInsight,
} from "@/lib/ai/workflows/morning-insight";

export const maxDuration = 30;

/**
 * GET /api/ai/agents/pattern-analyzer/morning-insight
 *
 * Get today's morning insight. Returns cached version if available.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check for existing insight
    const insight = await getMorningInsight(user.id);

    if (insight) {
      return NextResponse.json({
        insight,
        cached: true,
      });
    }

    return NextResponse.json({
      insight: null,
      cached: false,
      message: "No insight for today. Use POST to generate one.",
    });
  } catch (error) {
    console.error("Error getting morning insight:", error);
    return NextResponse.json(
      { error: "Failed to get morning insight" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/agents/pattern-analyzer/morning-insight
 *
 * Generate a new morning insight. Can force regeneration with ?force=true
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  try {
    // Check if we already have today's insight (unless forcing regeneration)
    if (!force && (await hasTodayInsight(user.id))) {
      const existing = await getMorningInsight(user.id);
      return NextResponse.json({
        insight: existing,
        cached: true,
        message: "Using existing insight for today. Add ?force=true to regenerate.",
      });
    }

    // Generate new insight
    const insight = await generateMorningInsight(user.id);

    return NextResponse.json({
      insight,
      cached: false,
      generated: true,
    });
  } catch (error) {
    console.error("Error generating morning insight:", error);
    return NextResponse.json(
      { error: "Failed to generate morning insight" },
      { status: 500 }
    );
  }
}
