import { anthropic } from "@/lib/ai/anthropic";
import { streamText } from "ai";
import { HAIKU_MODEL } from "@/lib/ai/model-selector";

export const maxDuration = 30;

/**
 * Minimal streaming test endpoint (no auth, no context).
 * Useful for verifying the AI SDK + Anthropic connection works.
 * POST with { "messages": [{ "role": "user", "content": "..." }] }
 */
export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: anthropic(HAIKU_MODEL),
    messages,
    maxTokens: 100,
  });

  return result.toTextStreamResponse();
}
