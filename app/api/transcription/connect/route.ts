import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Returns Deepgram API key for WebSocket connection
// In production, this should generate scoped temporary tokens
export async function POST() {
  const supabase = await createClient();

  // Verify auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

  if (!deepgramApiKey) {
    return NextResponse.json(
      { error: "Transcription service not configured" },
      { status: 500 }
    );
  }

  // Return API key for WebSocket connection
  // In production, use Deepgram's API to generate scoped temporary tokens
  return NextResponse.json({
    token: deepgramApiKey,
    expiresIn: 3600, // 1 hour
  });
}
