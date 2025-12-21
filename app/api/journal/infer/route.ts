import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";

// Valid mood labels from database enum
const MOOD_LABELS = [
  "Threatened",
  "Stressed",
  "Unfocused",
  "Rejected",
  "Creative",
  "Adventurous",
  "Angry",
  "Manic",
  "Calm",
  "Acceptance",
  "Socially Connected",
  "Romantic",
] as const;

type MoodLabel = (typeof MOOD_LABELS)[number];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { happened, feelings, grateful } = await request.json();

    if (!happened && !feelings && !grateful) {
      return NextResponse.json(
        { error: "No content provided for inference" },
        { status: 400 }
      );
    }

    // Combine all text for analysis
    const entryText = [
      happened && `What happened: ${happened}`,
      feelings && `Feelings: ${feelings}`,
      grateful && `Grateful for: ${grateful}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    // Call Claude for mood and energy inference
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      prompt: `Analyze this journal entry and infer the writer's mood and energy level.

Journal Entry:
${entryText}

Based on this entry, provide:
1. MOOD: Choose exactly ONE from: ${MOOD_LABELS.join(", ")}
2. ENERGY: A number from 1-10 (1=exhausted/depleted, 10=energized/vibrant)

Respond in this exact JSON format:
{"mood": "MoodLabel", "energy": 7}

Only respond with the JSON, nothing else.`,
    });

    // Parse the response
    const parsed = JSON.parse(text);

    // Validate mood label
    const mood = MOOD_LABELS.includes(parsed.mood) ? parsed.mood : "Calm";

    // Validate energy (1-10)
    const energy = Math.min(10, Math.max(1, Math.round(parsed.energy || 5)));

    return NextResponse.json({
      mood_label: mood as MoodLabel,
      energy_rating: energy,
    });
  } catch (error) {
    console.error("Mood inference error:", error);
    return NextResponse.json(
      { error: "Failed to infer mood/energy" },
      { status: 500 }
    );
  }
}
