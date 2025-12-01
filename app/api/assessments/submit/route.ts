/**
 * Submit Assessment Results
 *
 * Handles submission of completed assessments, calculates scores,
 * stores in database, and generates Pattern Analyzer insights.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

type AssessmentType = 'executive_function' | 'self_compassion' | 'strengths' | 'values_alignment';

interface SubmitRequest {
  type: AssessmentType;
  responses: Record<string, number | string | string[]>;
  date?: string; // YYYY-MM-DD, defaults to today
}

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Executive Function: 36 questions (12 skills x 3 questions each)
 * Each question is 1-7 scale, each skill max is 21
 */
function calculateEFScores(responses: Record<string, number>) {
  const skills = [
    'goal_directed_persistence',
    'organization',
    'task_initiation',
    'metacognition',
    'planning_prioritization',
    'stress_tolerance',
    'flexibility',
    'response_inhibition',
    'sustained_attention',
    'working_memory',
    'time_management',
    'emotional_control',
  ];

  const skillScores: Record<string, number> = {};
  let totalScore = 0;

  skills.forEach((skill, skillIndex) => {
    // Each skill has 3 questions
    const q1 = responses[`q${skillIndex * 3}`] || 0;
    const q2 = responses[`q${skillIndex * 3 + 1}`] || 0;
    const q3 = responses[`q${skillIndex * 3 + 2}`] || 0;
    const skillTotal = q1 + q2 + q3;
    skillScores[skill] = skillTotal;
    totalScore += skillTotal;
  });

  return { skillScores, totalScore };
}

/**
 * Self-Compassion Scale: 26 questions on 1-5 scale
 * Subscales with reverse-coded items
 */
function calculateSCScores(responses: Record<string, number>) {
  // Question groupings (0-indexed)
  const subscaleQuestions = {
    self_kindness: [4, 12, 19, 23, 25], // Items 5, 13, 20, 24, 26
    self_judgment: [0, 7, 10, 16, 20], // Items 1, 8, 11, 17, 21 (reverse)
    common_humanity: [2, 6, 9, 14, 21], // Items 3, 7, 10, 15, 22
    isolation: [3, 13, 17, 22, 24], // Items 4, 14, 18, 23, 25 (reverse)
    mindfulness: [8, 15, 18], // Items 9, 16, 19
    over_identification: [1, 5, 11], // Items 2, 6, 12 (reverse)
  };

  const subscaleScores: Record<string, number> = {};

  for (const [subscale, questions] of Object.entries(subscaleQuestions)) {
    const scores = questions.map(q => responses[`q${q}`] || 3); // Default to middle
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    subscaleScores[subscale] = Math.round(avg * 100) / 100;
  }

  // Calculate overall score (average of positive subscales minus negative)
  const positiveAvg = (subscaleScores.self_kindness + subscaleScores.common_humanity + subscaleScores.mindfulness) / 3;
  const negativeAvg = (subscaleScores.self_judgment + subscaleScores.isolation + subscaleScores.over_identification) / 3;
  const overallScore = Math.round(((positiveAvg + (6 - negativeAvg)) / 2) * 100) / 100;

  return { subscaleScores, overallScore };
}

/**
 * Professional Skills: 16 skills × 2 dimensions (Proficiency, Energy)
 * 2×2 Proficiency × Energy matrix:
 *   High P + High E = Strengths (realized)
 *   Low P + High E  = Growth Opportunities (unrealized)
 *   High P + Low E  = Learned Behaviors (learned)
 *   Low P + Low E   = Delegate/Develop (weakness)
 */
function classifyStrengthQuadrant(
  performance: number,
  energy: number,
): 'realized' | 'unrealized' | 'learned' | 'weakness' {
  const highPerformance = performance >= 4;
  const highEnergy = energy >= 4;

  if (highPerformance && highEnergy) return 'realized';
  if (!highPerformance && highEnergy) return 'unrealized';
  if (highPerformance && !highEnergy) return 'learned';
  return 'weakness';
}

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SubmitRequest = await request.json();
    const { type, responses, date } = body;

    if (!type || !responses) {
      return NextResponse.json({ error: 'Missing type or responses' }, { status: 400 });
    }

    const assessmentDate = date || new Date().toISOString().split('T')[0];

    let result: { success: boolean; id?: string; scores?: unknown; error?: string };

    switch (type) {
      case 'executive_function':
        result = await submitExecutiveFunction(supabase, user.id, assessmentDate, responses as Record<string, number>);
        break;
      case 'self_compassion':
        result = await submitSelfCompassion(supabase, user.id, assessmentDate, responses as Record<string, number>);
        break;
      case 'strengths':
        result = await submitStrengths(supabase, user.id, assessmentDate, responses as unknown as Record<string, { p: number; e: number; f: number }>);
        break;
      case 'values_alignment':
        result = await submitValues(supabase, user.id, assessmentDate, responses as Record<string, string | string[]>);
        break;
      default:
        return NextResponse.json({ error: 'Invalid assessment type' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Update reminder
    await updateReminder(supabase, user.id, type, assessmentDate);

    // Regenerate pattern insights across all assessments
    await regeneratePatternInsights(supabase, user.id);

    return NextResponse.json({
      success: true,
      id: result.id,
      scores: result.scores,
      message: `${type} assessment submitted successfully`,
    });
  } catch (error) {
    console.error('Submit assessment error:', error);
    return NextResponse.json(
      { error: 'Failed to submit assessment', details: String(error) },
      { status: 500 }
    );
  }
}

// ============================================================================
// Submission Functions
// ============================================================================

async function submitExecutiveFunction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  date: string,
  responses: Record<string, number>
) {
  const { skillScores, totalScore } = calculateEFScores(responses);

  const { data, error } = await supabase
    .from('executive_function_scores')
    .upsert({
      user_id: userId,
      assessment_date: date,
      total_score: totalScore,
      ...skillScores,
      raw_responses: responses,
    }, { onConflict: 'user_id,assessment_date' })
    .select('id')
    .single();

  if (error) {
    console.error('EF insert error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id, scores: { totalScore, skills: skillScores } };
}

async function submitSelfCompassion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  date: string,
  responses: Record<string, number>
) {
  const { subscaleScores, overallScore } = calculateSCScores(responses);

  const { data, error } = await supabase
    .from('self_compassion_scores')
    .upsert({
      user_id: userId,
      assessment_date: date,
      overall_score: overallScore,
      self_kindness: subscaleScores.self_kindness,
      common_humanity: subscaleScores.common_humanity,
      mindfulness: subscaleScores.mindfulness,
      self_judgment: subscaleScores.self_judgment,
      isolation: subscaleScores.isolation,
      over_identification: subscaleScores.over_identification,
      raw_responses: responses,
    }, { onConflict: 'user_id,assessment_date' })
    .select('id')
    .single();

  if (error) {
    console.error('SC insert error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id, scores: { overallScore, subscales: subscaleScores } };
}

async function submitStrengths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  date: string,
  responses: Record<string, { p: number; e: number; f?: number }>
) {
  // Delete existing entries for this date
  await supabase
    .from('strengths_responses')
    .delete()
    .eq('user_id', userId)
    .eq('assessment_date', date);

  // Build strength entries (frequency is optional for backward compat)
  const strengthEntries = Object.entries(responses).map(([strengthName, scores]) => {
    const quadrant = classifyStrengthQuadrant(scores.p, scores.e);
    return {
      user_id: userId,
      assessment_date: date,
      strength_name: strengthName,
      performance: scores.p,
      energy: scores.e,
      frequency: scores.f ?? null,
      quadrant,
    };
  });

  const { error } = await supabase
    .from('strengths_responses')
    .insert(strengthEntries);

  if (error) {
    console.error('Strengths insert error:', error);
    return { success: false, error: error.message };
  }

  // Calculate quadrant counts
  const quadrantCounts = strengthEntries.reduce((acc, s) => {
    acc[s.quadrant] = (acc[s.quadrant] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return { success: true, scores: { quadrantCounts, totalStrengths: strengthEntries.length } };
}

async function submitValues(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  date: string,
  responses: Record<string, string | string[]>
) {
  const { data, error } = await supabase
    .from('values_alignment_results')
    .upsert({
      user_id: userId,
      assessment_date: date,
      value_1: responses.value_1 as string,
      value_2: responses.value_2 as string,
      value_3: responses.value_3 as string,
      value_1_supporting: responses.value_1_supporting as string[],
      value_1_slippery: responses.value_1_slippery as string[],
      value_2_supporting: responses.value_2_supporting as string[],
      value_2_slippery: responses.value_2_slippery as string[],
      value_3_supporting: responses.value_3_supporting as string[],
      value_3_slippery: responses.value_3_slippery as string[],
      early_warning_signs: responses.early_warning_signs as string[],
    }, { onConflict: 'user_id,assessment_date' })
    .select('id')
    .single();

  if (error) {
    console.error('Values insert error:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    id: data.id,
    scores: {
      values: [responses.value_1, responses.value_2, responses.value_3],
    },
  };
}

async function updateReminder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  type: AssessmentType,
  date: string
) {
  // Calculate next reminder based on assessment type
  const frequencies: Record<AssessmentType, number | null> = {
    executive_function: 90, // Quarterly
    self_compassion: 365, // Annually
    strengths: 365, // Annually
    values_alignment: null, // Rarely
  };

  const frequency = frequencies[type];
  let nextReminderDate: string | null = null;

  if (frequency) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + frequency);
    nextReminderDate = nextDate.toISOString().split('T')[0];
  }

  await supabase
    .from('assessment_reminders')
    .upsert({
      user_id: userId,
      assessment_type: type,
      last_taken_date: date,
      next_reminder_date: nextReminderDate,
      reminder_frequency_days: frequency,
    }, { onConflict: 'user_id,assessment_type' });
}

// ============================================================================
// Pattern Insights Regeneration
// ============================================================================

interface InsightData {
  source_assessments: string[];
  insight_type: 'cross_correlation' | 'pattern_connection' | 'strength_leverage' | 'warning_indicator' | 'progress_milestone';
  content: string;
  severity: 'gentle' | 'notable' | 'significant';
  trigger_context: string[];
  valid_until: string;
}

async function regeneratePatternInsights(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  try {
    // Fetch latest data from all assessments
    const [efResult, scResult, strengthsResult, valuesResult] = await Promise.all([
      supabase.from('executive_function_scores').select('*').eq('user_id', userId).order('assessment_date', { ascending: false }).limit(1).single(),
      supabase.from('self_compassion_scores').select('*').eq('user_id', userId).order('assessment_date', { ascending: false }).limit(1).single(),
      supabase.from('strengths_responses').select('*').eq('user_id', userId).order('assessment_date', { ascending: false }),
      supabase.from('values_alignment_results').select('*').eq('user_id', userId).order('assessment_date', { ascending: false }).limit(1).single(),
    ]);

    const insights: InsightData[] = [];
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    const validUntil = threeMonthsFromNow.toISOString().split('T')[0];

    const ef = efResult.data;
    const sc = scResult.data;
    const strengths = strengthsResult.data;
    const values = valuesResult.data;

    // EF + SC cross-correlation: Emotional Control vs Over-Identification
    if (ef && sc) {
      if (ef.emotional_control < 12 && sc.over_identification > 3.0) {
        insights.push({
          source_assessments: ['executive_function', 'self_compassion'],
          insight_type: 'cross_correlation',
          content: `Low Emotional Control (EF: ${ef.emotional_control}/21) correlates with high Over-Identification (SC: ${sc.over_identification.toFixed(2)}). When emotions spike, you may get swept up and lose task focus. DBT skills like STOP and Check the Facts can help create space.`,
          severity: 'notable',
          trigger_context: ['therapist_chat', 'morning_insights', 'weekly_review'],
          valid_until: validUntil,
        });
      }

      // Low self-judgment + high self-kindness = good combo
      if (sc.self_kindness >= 3.5 && sc.self_judgment < 2.5) {
        insights.push({
          source_assessments: ['self_compassion'],
          insight_type: 'progress_milestone',
          content: `Your self-kindness (${sc.self_kindness.toFixed(2)}) and low self-judgment (${sc.self_judgment.toFixed(2)}) show strong inner support. This foundation helps when facing EF challenges.`,
          severity: 'gentle',
          trigger_context: ['morning_insights'],
          valid_until: validUntil,
        });
      }
    }

    // EF strength leverage
    if (ef) {
      const skills = {
        goal_directed_persistence: ef.goal_directed_persistence,
        organization: ef.organization,
        task_initiation: ef.task_initiation,
        time_management: ef.time_management,
        working_memory: ef.working_memory,
      };

      const strongest = Object.entries(skills).sort(([, a], [, b]) => b - a)[0];
      const weakest = Object.entries(skills).sort(([, a], [, b]) => a - b)[0];

      if (strongest[1] >= 15 && weakest[1] < 10) {
        const strongName = strongest[0].replace(/_/g, ' ');
        const weakName = weakest[0].replace(/_/g, ' ');
        insights.push({
          source_assessments: ['executive_function'],
          insight_type: 'strength_leverage',
          content: `Your ${strongName} (${strongest[1]}/21) can compensate for ${weakName} (${weakest[1]}/21) challenges. Tie tasks to meaningful goals to maintain momentum.`,
          severity: 'gentle',
          trigger_context: ['executive_coach_chat', 'morning_insights'],
          valid_until: validUntil,
        });
      }
    }

    // Strengths + Values connection
    if (strengths && strengths.length > 0 && values) {
      const latestDate = strengths[0].assessment_date;
      const latestStrengths = strengths.filter(s => s.assessment_date === latestDate);
      const realized = latestStrengths.filter(s => s.quadrant === 'realized').map(s => s.strength_name);
      const learned = latestStrengths.filter(s => s.quadrant === 'learned');

      // Check for values-strengths alignment
      const valuesArr = [values.value_1, values.value_2, values.value_3].filter(Boolean);
      const learningValue = valuesArr.find(v => v?.toLowerCase().includes('learn'));

      if (learningValue && realized.includes('Curiosity')) {
        insights.push({
          source_assessments: ['strengths', 'values_alignment'],
          insight_type: 'pattern_connection',
          content: `Curiosity is a Realized Strength that directly supports your ${learningValue} value. This is a superpower—lean into it during low-energy periods.`,
          severity: 'gentle',
          trigger_context: ['executive_coach_chat'],
          valid_until: validUntil,
        });
      }

      // Warning about learned behaviors
      if (learned.length >= 15) {
        insights.push({
          source_assessments: ['strengths'],
          insight_type: 'warning_indicator',
          content: `You have ${learned.length} Learned Behaviors—skills you've developed but that drain energy. Watch for burnout, especially with Work Ethic and Persistence if they're learned, not natural.`,
          severity: 'notable',
          trigger_context: ['therapist_chat', 'weekly_review'],
          valid_until: validUntil,
        });
      }
    }

    // SC + Values: Isolation and Connection
    if (sc && values) {
      const hasConnectionValue = [values.value_1, values.value_2, values.value_3]
        .some(v => v?.toLowerCase().includes('connection'));

      if (hasConnectionValue && sc.isolation > 3.0) {
        insights.push({
          source_assessments: ['self_compassion', 'values_alignment'],
          insight_type: 'pattern_connection',
          content: `Elevated Isolation score (${sc.isolation.toFixed(2)}) may conflict with your Connection value. Practice "this is part of being human" reframes when you notice withdrawal.`,
          severity: 'gentle',
          trigger_context: ['therapist_chat', 'morning_insights'],
          valid_until: validUntil,
        });
      }
    }

    // Delete existing insights and insert new ones
    await supabase
      .from('assessment_insights')
      .delete()
      .eq('user_id', userId);

    if (insights.length > 0) {
      await supabase
        .from('assessment_insights')
        .insert(insights.map(i => ({ ...i, user_id: userId })));
    }

    console.log(`Regenerated ${insights.length} pattern insights for user ${userId}`);
  } catch (error) {
    console.error('Failed to regenerate pattern insights:', error);
    // Don't throw - this is non-critical
  }
}
