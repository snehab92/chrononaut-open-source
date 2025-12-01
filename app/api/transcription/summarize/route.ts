import { anthropic } from "@/lib/ai/anthropic";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60; // Allow longer for summarization

function buildSummaryPrompt(speakerNames?: string[]): string {
  const nameEnforcement = speakerNames && speakerNames.length > 0
    ? `\n\nIMPORTANT - SPEAKER NAME SPELLINGS:\nThe following names are EXACT and must be spelled correctly in your summary:\n${speakerNames.map(n => `• ${n}`).join('\n')}\n\nDo NOT autocorrect, change, or "fix" these names. Use them exactly as provided above.`
    : '';

  return `You are a professional meeting summarization assistant. Your role is to create clear, actionable summaries from meeting transcripts.${nameEnforcement}

When analyzing a transcript:
1. Identify the main topics discussed
2. Extract key decisions made
3. List action items with owners (if mentioned)
4. Note any important deadlines or follow-ups
5. Capture any open questions or unresolved items

Format your summary using markdown:

## Key Discussion Points
- Bullet points of main topics (3-5 items)

## Decisions Made
- List any decisions with context

## Action Items
- [ ] Task description - @Owner (if mentioned)

## Next Steps
- Follow-up items or scheduled meetings

Keep the summary professional, concise, and actionable. Focus on information that matters for follow-up.`;
}

export async function POST(req: Request) {
  const supabase = await createClient();

  // Verify auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { transcript, meetingNoteId, title, speakerNames } = await req.json();

    if (!transcript || transcript.trim().length === 0) {
      return Response.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }

    // Build prompt with speaker name enforcement if provided
    const systemPrompt = buildSummaryPrompt(speakerNames);

    // Generate summary using Claude
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: systemPrompt,
      prompt: `Meeting: ${title || "Untitled Meeting"}\n\nTranscript:\n${transcript}`,
      maxTokens: 1500,
    });

    // Optionally update the meeting note with the summary
    if (meetingNoteId) {
      // Just update the status to indicate summary was generated
      await supabase
        .from("meeting_notes")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", meetingNoteId)
        .eq("user_id", user.id);
    }

    return Response.json({ summary: text });
  } catch (error) {
    console.error("Summarization error:", error);
    return Response.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
