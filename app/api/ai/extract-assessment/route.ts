import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

interface AssessmentInsight {
  assessment_type: string;
  summary: string;
  key_insights: string[];
  score_interpretation?: string;
  growth_areas: string[];
  strengths: string[];
  extracted_at: string;
}

const ASSESSMENT_PROMPTS: Record<string, string> = {
  self_compassion: `Analyze this self-compassion assessment result. Extract:
1. Overall score interpretation (high/moderate/low self-compassion)
2. Key insights about the person's relationship with themselves
3. Their strengths in self-compassion (e.g., mindfulness, common humanity)
4. Areas for growth (e.g., self-judgment, isolation, over-identification)
5. A brief 1-2 sentence summary`,

  values_alignment: `Analyze this values alignment assessment result. Extract:
1. Their core values identified
2. How well they're living in alignment with those values
3. Strengths in values-based living
4. Areas where values and actions may be misaligned
5. A brief 1-2 sentence summary`,

  executive_function: `Analyze this executive function assessment result. Extract:
1. Overall executive function profile interpretation
2. Key insights about their cognitive patterns
3. Executive function strengths (e.g., working memory, flexibility)
4. Areas of challenge (e.g., initiation, time management, emotional regulation)
5. A brief 1-2 sentence summary`,

  strengths: `Analyze this strengths assessment result (VIA, CliftonStrengths, or similar). Extract:
1. Their top signature strengths
2. How these strengths manifest in their life
3. Potential "shadow" sides of their strengths
4. Underutilized strengths
5. A brief 1-2 sentence summary`,
};

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { fileId } = await req.json();

  if (!fileId) {
    return new Response("File ID required", { status: 400 });
  }

  // Fetch the file record
  const { data: file, error: fileError } = await supabase
    .from("about_me_files")
    .select("*")
    .eq("id", fileId)
    .eq("user_id", user.id)
    .single();

  if (fileError || !file) {
    return new Response("File not found", { status: 404 });
  }

  if (!file.is_assessment || !file.assessment_type) {
    return new Response("File is not an assessment", { status: 400 });
  }

  // Download file content
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("about-me-files")
    .download(file.storage_path);

  if (downloadError || !fileData) {
    return new Response("Failed to download file", { status: 500 });
  }

  // Read file content based on type
  let fileContent: string;
  try {
    if (file.file_type === "pdf") {
      // For PDF, we need to handle differently - use text representation
      // In production, you'd use a PDF parser library
      fileContent = await fileData.text();
    } else {
      fileContent = await fileData.text();
    }
  } catch {
    return new Response("Failed to read file content", { status: 500 });
  }

  // Truncate content if too long (keep under ~10k tokens)
  const maxChars = 30000;
  if (fileContent.length > maxChars) {
    fileContent = fileContent.slice(0, maxChars) + "\n\n[Content truncated...]";
  }

  // Get assessment-specific prompt
  const assessmentPrompt = ASSESSMENT_PROMPTS[file.assessment_type] || ASSESSMENT_PROMPTS.strengths;

  const systemPrompt = `You are an expert psychologist analyzing assessment results.
Be warm, insightful, and non-judgmental. Focus on practical insights.
Always respond in valid JSON format matching this structure:
{
  "summary": "1-2 sentence overview",
  "key_insights": ["insight 1", "insight 2", "insight 3"],
  "score_interpretation": "optional interpretation of any scores",
  "strengths": ["strength 1", "strength 2"],
  "growth_areas": ["area 1", "area 2"]
}`;

  try {
    const result = await generateText({
      model: anthropic("claude-3-5-haiku-20241022"),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `${assessmentPrompt}

Assessment Document:
---
${fileContent}
---

Return ONLY valid JSON, no other text.`,
        },
      ],
      maxTokens: 1000,
    });

    // Parse the AI response
    let insights: Partial<AssessmentInsight>;
    try {
      // Extract JSON from response (in case there's any surrounding text)
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      insights = JSON.parse(jsonMatch[0]);
    } catch {
      // If parsing fails, create a basic structure from the text
      insights = {
        summary: result.text.slice(0, 200),
        key_insights: ["Assessment analyzed - see full document for details"],
        strengths: [],
        growth_areas: [],
      };
    }

    // Build full response
    const fullInsights: AssessmentInsight = {
      assessment_type: file.assessment_type,
      summary: insights.summary || "",
      key_insights: insights.key_insights || [],
      score_interpretation: insights.score_interpretation,
      growth_areas: insights.growth_areas || [],
      strengths: insights.strengths || [],
      extracted_at: new Date().toISOString(),
    };

    // Store insights in the file record for caching
    await supabase
      .from("about_me_files")
      .update({
        extracted_insights: fullInsights,
      })
      .eq("id", fileId);

    return new Response(JSON.stringify(fullInsights), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI extraction error:", error);
    return new Response(JSON.stringify({ error: "AI extraction failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
