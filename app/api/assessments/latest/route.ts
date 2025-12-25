/**
 * Get Latest Assessment Results
 *
 * Returns the most recent assessment data for all 4 assessment types,
 * along with active cross-assessment insights and reminder status.
 * Used by the dashboard growth cards.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface ExecutiveFunctionResult {
  assessment_date: string;
  total_score: number;
  max_score: 252;
  percentage: number;
  skills: {
    goal_directed_persistence: number;
    organization: number;
    task_initiation: number;
    metacognition: number;
    planning_prioritization: number;
    stress_tolerance: number;
    flexibility: number;
    response_inhibition: number;
    sustained_attention: number;
    working_memory: number;
    time_management: number;
    emotional_control: number;
  };
  top_3_strengths: string[];
  bottom_3_challenges: string[];
}

export interface SelfCompassionResult {
  assessment_date: string;
  overall_score: number;
  subscales: {
    self_kindness: number;
    common_humanity: number;
    mindfulness: number;
    self_judgment: number;
    isolation: number;
    over_identification: number;
  };
  positive_subscales: { name: string; score: number; above_threshold: boolean }[];
  negative_subscales: { name: string; score: number; above_threshold: boolean }[];
}

export interface StrengthItem {
  name: string;
  family: string;
  rank: number;
}

export interface StrengthsResult {
  assessment_date: string;
  quadrant_counts: {
    realized: number;
    unrealized: number;
    learned: number;
    weakness: number;
  };
  // All strengths in each quadrant, sorted by rank
  all_realized: StrengthItem[];
  all_unrealized: StrengthItem[];
  all_learned: StrengthItem[];
  all_weakness: StrengthItem[];
  // Legacy: Top 5 for backwards compatibility
  top_realized: { name: string; family: string }[];
  top_unrealized: { name: string; family: string }[];
  top_learned: { name: string; family: string }[];
  top_weakness: { name: string; family: string }[];
  family_distribution: Record<string, { realized: number; unrealized: number; learned: number; weakness: number }>;
}

export interface ValuesResult {
  assessment_date: string;
  values: string[];
  living_aligned_score?: number;
  living_aligned_trend?: 'up' | 'down' | 'stable';
  early_warning_signs: string[];
  realignment_actions: string[];
}

export interface AssessmentInsight {
  id: string;
  source_assessments: string[];
  insight_type: 'cross_correlation' | 'pattern_connection' | 'strength_leverage' | 'warning_indicator' | 'progress_milestone';
  content: string;
  severity: 'gentle' | 'notable' | 'significant';
  trigger_context: string[];
}

export interface ReminderStatus {
  assessment_type: string;
  last_taken_date: string | null;
  next_reminder_date: string | null;
  is_due: boolean;
  days_until_due: number | null;
}

export interface LatestAssessmentsResponse {
  executive_function: ExecutiveFunctionResult | null;
  self_compassion: SelfCompassionResult | null;
  strengths: StrengthsResult | null;
  values_alignment: ValuesResult | null;
  insights: AssessmentInsight[];
  reminders: ReminderStatus[];
}

// Skill display names for formatting
const skillDisplayNames: Record<string, string> = {
  goal_directed_persistence: 'Goal-Directed Persistence',
  organization: 'Organization',
  task_initiation: 'Task Initiation',
  metacognition: 'Metacognition',
  planning_prioritization: 'Planning & Prioritization',
  stress_tolerance: 'Stress Tolerance',
  flexibility: 'Flexibility',
  response_inhibition: 'Response Inhibition',
  sustained_attention: 'Sustained Attention',
  working_memory: 'Working Memory',
  time_management: 'Time Management',
  emotional_control: 'Emotional Control',
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all assessment data in parallel
    const [efResult, scResult, strengthsResult, valuesResult, insightsResult, remindersResult] = await Promise.all([
      // Executive Function - latest entry
      supabase
        .from('executive_function_scores')
        .select('*')
        .eq('user_id', user.id)
        .order('assessment_date', { ascending: false })
        .limit(1)
        .single(),

      // Self-Compassion - latest entry
      supabase
        .from('self_compassion_scores')
        .select('*')
        .eq('user_id', user.id)
        .order('assessment_date', { ascending: false })
        .limit(1)
        .single(),

      // Strengths - all entries for latest date
      supabase
        .from('strengths_responses')
        .select('*')
        .eq('user_id', user.id)
        .order('assessment_date', { ascending: false }),

      // Values - latest entry
      supabase
        .from('values_alignment_results')
        .select('*')
        .eq('user_id', user.id)
        .order('assessment_date', { ascending: false })
        .limit(1)
        .single(),

      // Active insights
      supabase
        .from('assessment_insights')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`),

      // Reminders
      supabase
        .from('assessment_reminders')
        .select('*')
        .eq('user_id', user.id),
    ]);

    // Process Executive Function data
    let executive_function: ExecutiveFunctionResult | null = null;
    if (efResult.data) {
      const ef = efResult.data;
      const skills = {
        goal_directed_persistence: ef.goal_directed_persistence,
        organization: ef.organization,
        task_initiation: ef.task_initiation,
        metacognition: ef.metacognition,
        planning_prioritization: ef.planning_prioritization,
        stress_tolerance: ef.stress_tolerance,
        flexibility: ef.flexibility,
        response_inhibition: ef.response_inhibition,
        sustained_attention: ef.sustained_attention,
        working_memory: ef.working_memory,
        time_management: ef.time_management,
        emotional_control: ef.emotional_control,
      };

      // Sort skills for top/bottom
      const sortedSkills = Object.entries(skills)
        .sort(([, a], [, b]) => b - a)
        .map(([key]) => skillDisplayNames[key]);

      executive_function = {
        assessment_date: ef.assessment_date,
        total_score: ef.total_score,
        max_score: 252,
        percentage: Math.round((ef.total_score / 252) * 100),
        skills,
        top_3_strengths: sortedSkills.slice(0, 3),
        bottom_3_challenges: sortedSkills.slice(-3).reverse(),
      };
    }

    // Process Self-Compassion data
    let self_compassion: SelfCompassionResult | null = null;
    if (scResult.data) {
      const sc = scResult.data;
      const subscales = {
        self_kindness: sc.self_kindness,
        common_humanity: sc.common_humanity,
        mindfulness: sc.mindfulness,
        self_judgment: sc.self_judgment,
        isolation: sc.isolation,
        over_identification: sc.over_identification,
      };

      self_compassion = {
        assessment_date: sc.assessment_date,
        overall_score: sc.overall_score,
        subscales,
        positive_subscales: [
          { name: 'Self-Kindness', score: sc.self_kindness, above_threshold: sc.self_kindness >= 3.0 },
          { name: 'Common Humanity', score: sc.common_humanity, above_threshold: sc.common_humanity >= 3.0 },
          { name: 'Mindfulness', score: sc.mindfulness, above_threshold: sc.mindfulness >= 3.0 },
        ],
        negative_subscales: [
          { name: 'Self-Judgment', score: sc.self_judgment, above_threshold: sc.self_judgment >= 3.0 },
          { name: 'Isolation', score: sc.isolation, above_threshold: sc.isolation >= 3.0 },
          { name: 'Over-Identification', score: sc.over_identification, above_threshold: sc.over_identification >= 3.0 },
        ],
      };
    }

    // Process Strengths data
    let strengths: StrengthsResult | null = null;
    if (strengthsResult.data && strengthsResult.data.length > 0) {
      // Get the latest assessment date
      const latestDate = strengthsResult.data[0].assessment_date;
      const latestStrengths = strengthsResult.data.filter(s => s.assessment_date === latestDate);

      // Count by quadrant
      const quadrant_counts = {
        realized: latestStrengths.filter(s => s.quadrant === 'realized').length,
        unrealized: latestStrengths.filter(s => s.quadrant === 'unrealized').length,
        learned: latestStrengths.filter(s => s.quadrant === 'learned').length,
        weakness: latestStrengths.filter(s => s.quadrant === 'weakness').length,
      };

      // Get all strengths from each quadrant (sorted by rank)
      const getAllByQuadrant = (quadrant: string): StrengthItem[] =>
        latestStrengths
          .filter(s => s.quadrant === quadrant)
          .sort((a, b) => (a.rank_in_quadrant || 0) - (b.rank_in_quadrant || 0))
          .map(s => ({ name: s.strength_name, family: s.strength_family, rank: s.rank_in_quadrant || 0 }));

      // Get top 5 from each quadrant (sorted by rank) - legacy
      const getTopN = (quadrant: string, n: number = 5) =>
        latestStrengths
          .filter(s => s.quadrant === quadrant)
          .sort((a, b) => (a.rank_in_quadrant || 0) - (b.rank_in_quadrant || 0))
          .slice(0, n)
          .map(s => ({ name: s.strength_name, family: s.strength_family }));

      // Calculate family distribution
      const families = ['being', 'communicating', 'motivating', 'relating', 'thinking'];
      const family_distribution: Record<string, { realized: number; unrealized: number; learned: number; weakness: number }> = {};

      for (const family of families) {
        const familyStrengths = latestStrengths.filter(s => s.strength_family === family);
        family_distribution[family] = {
          realized: familyStrengths.filter(s => s.quadrant === 'realized').length,
          unrealized: familyStrengths.filter(s => s.quadrant === 'unrealized').length,
          learned: familyStrengths.filter(s => s.quadrant === 'learned').length,
          weakness: familyStrengths.filter(s => s.quadrant === 'weakness').length,
        };
      }

      strengths = {
        assessment_date: latestDate,
        quadrant_counts,
        all_realized: getAllByQuadrant('realized'),
        all_unrealized: getAllByQuadrant('unrealized'),
        all_learned: getAllByQuadrant('learned'),
        all_weakness: getAllByQuadrant('weakness'),
        top_realized: getTopN('realized'),
        top_unrealized: getTopN('unrealized'),
        top_learned: getTopN('learned'),
        top_weakness: getTopN('weakness'),
        family_distribution,
      };
    }

    // Process Values data
    let values_alignment: ValuesResult | null = null;
    if (valuesResult.data) {
      const v = valuesResult.data;
      values_alignment = {
        assessment_date: v.assessment_date,
        values: [v.value_1, v.value_2, v.value_3].filter(Boolean),
        living_aligned_score: v.living_aligned_score,
        living_aligned_trend: v.living_aligned_trend,
        early_warning_signs: v.early_warning_signs || [],
        realignment_actions: v.realignment_actions || [],
      };
    }

    // Process insights
    const insights: AssessmentInsight[] = (insightsResult.data || []).map(i => ({
      id: i.id,
      source_assessments: i.source_assessments,
      insight_type: i.insight_type,
      content: i.content,
      severity: i.severity,
      trigger_context: i.trigger_context || [],
    }));

    // Process reminders
    const today = new Date();
    const reminders: ReminderStatus[] = (remindersResult.data || []).map(r => {
      const nextReminder = r.next_reminder_date ? new Date(r.next_reminder_date) : null;
      const isDue = nextReminder ? nextReminder <= today : false;
      const daysUntilDue = nextReminder
        ? Math.ceil((nextReminder.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        assessment_type: r.assessment_type,
        last_taken_date: r.last_taken_date,
        next_reminder_date: r.next_reminder_date,
        is_due: isDue,
        days_until_due: daysUntilDue,
      };
    });

    const response: LatestAssessmentsResponse = {
      executive_function,
      self_compassion,
      strengths,
      values_alignment,
      insights,
      reminders,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get latest assessments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment data', details: String(error) },
      { status: 500 }
    );
  }
}
