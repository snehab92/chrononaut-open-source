/**
 * Values Alignment Score Computation
 *
 * Computes a "Living Aligned" score based on:
 * - User's stated values and behaviors from their assessment
 * - Trailing 30 days of journal entries and pattern data
 *
 * Returns a 0-100 score with trend analysis
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { readAssessmentFile } from "@/lib/assessments/markdown-parser";
import { ValuesAlignmentData } from "@/lib/assessments/types";

// ============================================================================
// Types
// ============================================================================

export interface LivingAlignedScore {
  score: number;                    // 0-100
  trend: "up" | "down" | "stable";
  dataPoints: number;               // Number of journal entries analyzed
  lastComputed: string;             // ISO timestamp
  highlights: string[];             // Positive alignment moments
  concerns: string[];               // Misalignment signals
  perValueScores?: {
    value: string;
    score: number;
    notes: string;
  }[];
}

interface JournalEntryForAnalysis {
  id: string;
  entry_date: string;
  mood_label: string | null;
  energy_rating: number | null;
  // For this analysis, we use mood/energy + any AI insights
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Compute the Living Aligned score for a user
 */
export async function computeLivingAlignedScore(
  userId: string
): Promise<LivingAlignedScore | null> {
  try {
    // 1. Get the user's values alignment assessment
    const valuesAssessment = await readAssessmentFile<ValuesAlignmentData>('values_alignment');

    if (!valuesAssessment?.isComplete) {
      console.log('Values alignment assessment not complete');
      return null;
    }

    const valuesData = valuesAssessment.frontmatter;
    const values = valuesData.values?.filter(v => v.name?.trim().length > 0) || [];

    if (values.length === 0) {
      return null;
    }

    // 2. Fetch trailing 30 days of journal data
    const supabase = await createClient();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: journalEntries, error: journalError } = await supabase
      .from('journal_entries')
      .select('id, entry_date, mood_label, energy_rating')
      .eq('user_id', userId)
      .gte('entry_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('entry_date', { ascending: false });

    if (journalError) {
      console.error('Failed to fetch journal entries:', journalError);
      return null;
    }

    // 3. Fetch recent AI insights
    const { data: aiInsights } = await supabase
      .from('ai_insights')
      .select('insight_date, summary, values_alignment_score, patterns_detected')
      .eq('user_id', userId)
      .gte('insight_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('insight_date', { ascending: false })
      .limit(30);

    // 4. Build context for AI analysis
    const context = buildAnalysisContext(valuesData, journalEntries || [], aiInsights || []);

    // 5. Use AI to compute alignment score
    const score = await analyzeAlignment(context);

    return score;
  } catch (error) {
    console.error('Failed to compute Living Aligned score:', error);
    return null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildAnalysisContext(
  valuesData: ValuesAlignmentData,
  journalEntries: JournalEntryForAnalysis[],
  aiInsights: Array<{
    insight_date: string;
    summary: string | null;
    values_alignment_score: number | null;
    patterns_detected: string[] | null;
  }>
): string {
  const values = valuesData.values.filter(v => v.name?.trim());

  let context = `## User's Core Values\n`;
  values.forEach((v, i) => {
    context += `\n### Value ${i + 1}: ${v.name}\n`;
    if (v.supporting_behaviors?.filter(b => b?.trim()).length > 0) {
      context += `Supporting behaviors: ${v.supporting_behaviors.filter(b => b?.trim()).join(', ')}\n`;
    }
    if (v.slippery_behaviors?.filter(b => b?.trim()).length > 0) {
      context += `Slippery behaviors (misalignment signals): ${v.slippery_behaviors.filter(b => b?.trim()).join(', ')}\n`;
    }
  });

  if (valuesData.early_warning_signs?.filter(s => s?.trim()).length > 0) {
    context += `\n## Early Warning Signs of Misalignment\n`;
    context += valuesData.early_warning_signs.filter(s => s?.trim()).map(s => `- ${s}`).join('\n');
  }

  if (valuesData.alignment_feeling?.trim()) {
    context += `\n\n## What Alignment Feels Like\n${valuesData.alignment_feeling}`;
  }

  // Add journal mood/energy summary
  if (journalEntries.length > 0) {
    context += `\n\n## Recent Journal Data (${journalEntries.length} entries, last 30 days)\n`;

    const moodCounts: Record<string, number> = {};
    let totalEnergy = 0;
    let energyCount = 0;

    journalEntries.forEach(entry => {
      if (entry.mood_label) {
        moodCounts[entry.mood_label] = (moodCounts[entry.mood_label] || 0) + 1;
      }
      if (entry.energy_rating) {
        totalEnergy += entry.energy_rating;
        energyCount++;
      }
    });

    context += `Mood distribution: ${Object.entries(moodCounts).map(([mood, count]) => `${mood} (${count})`).join(', ')}\n`;
    if (energyCount > 0) {
      context += `Average energy: ${(totalEnergy / energyCount).toFixed(1)}/10\n`;
    }
  }

  // Add AI insights summary
  if (aiInsights.length > 0) {
    const alignmentScores = aiInsights
      .filter(i => i.values_alignment_score !== null)
      .map(i => i.values_alignment_score as number);

    if (alignmentScores.length > 0) {
      const avgScore = alignmentScores.reduce((a, b) => a + b, 0) / alignmentScores.length;
      context += `\n## Previous Alignment Scores\n`;
      context += `Average score over period: ${avgScore.toFixed(0)}%\n`;
      context += `Latest: ${alignmentScores[0]}%, Oldest: ${alignmentScores[alignmentScores.length - 1]}%\n`;
    }

    const patterns = aiInsights
      .flatMap(i => i.patterns_detected || [])
      .filter(Boolean);

    if (patterns.length > 0) {
      const patternCounts: Record<string, number> = {};
      patterns.forEach(p => {
        patternCounts[p] = (patternCounts[p] || 0) + 1;
      });

      context += `\n## Detected Patterns\n`;
      Object.entries(patternCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([pattern, count]) => {
          context += `- ${pattern} (${count}x)\n`;
        });
    }
  }

  return context;
}

async function analyzeAlignment(context: string): Promise<LivingAlignedScore> {
  const anthropic = new Anthropic();

  const prompt = `You are analyzing a user's values alignment based on their assessment data and recent journal/pattern data.

${context}

Based on this data, provide an alignment score and analysis. Return a JSON response:

{
  "score": 0-100,
  "trend": "up" | "down" | "stable",
  "highlights": ["2-3 positive alignment moments or patterns"],
  "concerns": ["0-2 gentle observations about potential misalignment"],
  "perValueScores": [
    {"value": "Value Name", "score": 0-100, "notes": "Brief observation"}
  ]
}

Guidelines:
- Score 80-100: Strongly aligned, living into values consistently
- Score 60-79: Generally aligned with some drift
- Score 40-59: Mixed signals, some misalignment patterns
- Score 0-39: Significant misalignment detected

Be kind and constructive in your assessment. Focus on patterns, not judgments.
If there's limited data, score conservatively around 70 and note the data limitation.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      score: result.score || 70,
      trend: result.trend || "stable",
      dataPoints: 0, // Will be set by caller
      lastComputed: new Date().toISOString(),
      highlights: result.highlights || [],
      concerns: result.concerns || [],
      perValueScores: result.perValueScores,
    };
  } catch (error) {
    console.error('AI analysis failed:', error);
    // Return a default score on error
    return {
      score: 70,
      trend: "stable",
      dataPoints: 0,
      lastComputed: new Date().toISOString(),
      highlights: ["Analysis pending - limited data available"],
      concerns: [],
    };
  }
}

// ============================================================================
// API Helper
// ============================================================================

/**
 * Get cached Living Aligned score or compute if stale
 * Caches for 24 hours
 */
export async function getLivingAlignedScore(
  userId: string,
  forceRefresh = false
): Promise<LivingAlignedScore | null> {
  const supabase = await createClient();

  // Check for cached score (stored in computed_patterns)
  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from('computed_patterns')
      .select('pattern_data, computation_date')
      .eq('user_id', userId)
      .eq('pattern_type', 'values_alignment_score')
      .single();

    if (cached) {
      const cacheAge = Date.now() - new Date(cached.computation_date).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (cacheAge < twentyFourHours) {
        return cached.pattern_data as LivingAlignedScore;
      }
    }
  }

  // Compute fresh score
  const score = await computeLivingAlignedScore(userId);

  if (score) {
    // Cache the result
    await supabase
      .from('computed_patterns')
      .upsert({
        user_id: userId,
        pattern_type: 'values_alignment_score',
        pattern_data: score,
        computation_date: new Date().toISOString(),
      }, {
        onConflict: 'user_id,pattern_type',
      });
  }

  return score;
}
