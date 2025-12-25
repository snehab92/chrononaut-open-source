/**
 * Import Baseline Assessment Data
 *
 * One-time endpoint to import November 2025 baseline assessment data
 * from assessment_results/ markdown files into the structured database.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {
      executive_function: false,
      self_compassion: false,
      strengths: false,
      values: false,
      insights: false,
      reminders: false,
    };

    // ========================================================================
    // 1. EXECUTIVE FUNCTION SCORES (November 2025)
    // ========================================================================
    const efData = {
      user_id: user.id,
      assessment_date: '2025-11-15',
      total_score: 132,
      goal_directed_persistence: 18,
      organization: 16,
      task_initiation: 14,
      metacognition: 14,
      planning_prioritization: 13,
      stress_tolerance: 13,
      flexibility: 10,
      response_inhibition: 9,
      sustained_attention: 9,
      working_memory: 7,
      time_management: 6,
      emotional_control: 3,
      source_file: 'assessment_results/executive_function_results_november_2025.md',
    };

    const { error: efError } = await supabase
      .from('executive_function_scores')
      .upsert(efData, { onConflict: 'user_id,assessment_date' });

    results.executive_function = !efError;
    if (efError) console.error('EF insert error:', efError);

    // ========================================================================
    // 2. SELF-COMPASSION SCORES (November 2025)
    // ========================================================================
    const scData = {
      user_id: user.id,
      assessment_date: '2025-11-14',
      overall_score: 2.94,
      self_kindness: 3.40,
      common_humanity: 2.75,
      mindfulness: 3.25,
      self_judgment: 3.00,
      isolation: 3.00,
      over_identification: 3.75,
      source: 'self-compassion.org',
    };

    const { error: scError } = await supabase
      .from('self_compassion_scores')
      .upsert(scData, { onConflict: 'user_id,assessment_date' });

    results.self_compassion = !scError;
    if (scError) console.error('SC insert error:', scError);

    // ========================================================================
    // 3. STRENGTHS RESPONSES (November 2025)
    // ========================================================================
    const strengthsData = [
      // REALISED STRENGTHS (14)
      { strength_name: 'Curiosity', strength_family: 'being', quadrant: 'realized', rank_in_quadrant: 1 },
      { strength_name: 'Narrator', strength_family: 'communicating', quadrant: 'realized', rank_in_quadrant: 2 },
      { strength_name: 'Gratitude', strength_family: 'being', quadrant: 'realized', rank_in_quadrant: 3 },
      { strength_name: 'Innovation', strength_family: 'thinking', quadrant: 'realized', rank_in_quadrant: 4 },
      { strength_name: 'Growth', strength_family: 'motivating', quadrant: 'realized', rank_in_quadrant: 5 },
      { strength_name: 'Improver', strength_family: 'motivating', quadrant: 'realized', rank_in_quadrant: 6 },
      { strength_name: 'Action', strength_family: 'motivating', quadrant: 'realized', rank_in_quadrant: 7 },
      { strength_name: 'Bounceback', strength_family: 'motivating', quadrant: 'realized', rank_in_quadrant: 8 },
      { strength_name: 'Explainer', strength_family: 'communicating', quadrant: 'realized', rank_in_quadrant: 9 },
      { strength_name: 'Humility', strength_family: 'being', quadrant: 'realized', rank_in_quadrant: 10 },
      { strength_name: 'Self-awareness', strength_family: 'being', quadrant: 'realized', rank_in_quadrant: 11 },
      { strength_name: 'Connector', strength_family: 'relating', quadrant: 'realized', rank_in_quadrant: 12 },
      { strength_name: 'Creativity', strength_family: 'thinking', quadrant: 'realized', rank_in_quadrant: 13 },
      { strength_name: 'Resolver', strength_family: 'thinking', quadrant: 'realized', rank_in_quadrant: 14 },

      // UNREALISED STRENGTHS (6)
      { strength_name: 'Resilience', strength_family: 'motivating', quadrant: 'unrealized', rank_in_quadrant: 1 },
      { strength_name: 'Adherence', strength_family: 'thinking', quadrant: 'unrealized', rank_in_quadrant: 2 },
      { strength_name: 'Pride', strength_family: 'being', quadrant: 'unrealized', rank_in_quadrant: 3 },
      { strength_name: 'Listener', strength_family: 'communicating', quadrant: 'unrealized', rank_in_quadrant: 4 },
      { strength_name: 'Catalyst', strength_family: 'motivating', quadrant: 'unrealized', rank_in_quadrant: 5 },
      { strength_name: 'Organiser', strength_family: 'thinking', quadrant: 'unrealized', rank_in_quadrant: 6 },

      // LEARNED BEHAVIOURS (18)
      { strength_name: 'Prevention', strength_family: 'thinking', quadrant: 'learned', rank_in_quadrant: 1 },
      { strength_name: 'Work Ethic', strength_family: 'motivating', quadrant: 'learned', rank_in_quadrant: 2 },
      { strength_name: 'Persistence', strength_family: 'motivating', quadrant: 'learned', rank_in_quadrant: 3 },
      { strength_name: 'Spotlight', strength_family: 'communicating', quadrant: 'learned', rank_in_quadrant: 4 },
      { strength_name: 'Detail', strength_family: 'thinking', quadrant: 'learned', rank_in_quadrant: 5 },
      { strength_name: 'Adventure', strength_family: 'motivating', quadrant: 'learned', rank_in_quadrant: 6 },
      { strength_name: 'Personalisation', strength_family: 'relating', quadrant: 'learned', rank_in_quadrant: 7 },
      { strength_name: 'Courage', strength_family: 'being', quadrant: 'learned', rank_in_quadrant: 8 },
      { strength_name: 'Adaptable', strength_family: 'thinking', quadrant: 'learned', rank_in_quadrant: 9 },
      { strength_name: 'Feedback', strength_family: 'communicating', quadrant: 'learned', rank_in_quadrant: 10 },
      { strength_name: 'Humour', strength_family: 'communicating', quadrant: 'learned', rank_in_quadrant: 11 },
      { strength_name: 'Optimism', strength_family: 'thinking', quadrant: 'learned', rank_in_quadrant: 12 },
      { strength_name: 'Counterpoint', strength_family: 'communicating', quadrant: 'learned', rank_in_quadrant: 13 },
      { strength_name: 'Change Agent', strength_family: 'motivating', quadrant: 'learned', rank_in_quadrant: 14 },
      { strength_name: 'Equality', strength_family: 'relating', quadrant: 'learned', rank_in_quadrant: 15 },
      { strength_name: 'Strategic Awareness', strength_family: 'thinking', quadrant: 'learned', rank_in_quadrant: 16 },
      { strength_name: 'Rapport Builder', strength_family: 'relating', quadrant: 'learned', rank_in_quadrant: 17 },
      { strength_name: 'Planner', strength_family: 'thinking', quadrant: 'learned', rank_in_quadrant: 18 },

      // WEAKNESSES (22)
      { strength_name: 'Personal Responsibility', strength_family: 'being', quadrant: 'weakness', rank_in_quadrant: 1 },
      { strength_name: 'Empathic', strength_family: 'relating', quadrant: 'weakness', rank_in_quadrant: 2 },
      { strength_name: 'Emotional Awareness', strength_family: 'relating', quadrant: 'weakness', rank_in_quadrant: 3 },
      { strength_name: 'Competitive', strength_family: 'motivating', quadrant: 'weakness', rank_in_quadrant: 4 },
      { strength_name: 'Time Optimiser', strength_family: 'thinking', quadrant: 'weakness', rank_in_quadrant: 5 },
      { strength_name: 'Centred', strength_family: 'being', quadrant: 'weakness', rank_in_quadrant: 6 },
      { strength_name: 'Drive', strength_family: 'motivating', quadrant: 'weakness', rank_in_quadrant: 7 },
      { strength_name: 'Moral Compass', strength_family: 'being', quadrant: 'weakness', rank_in_quadrant: 8 },
      { strength_name: 'Authenticity', strength_family: 'being', quadrant: 'weakness', rank_in_quadrant: 9 },
      { strength_name: 'Incubator', strength_family: 'thinking', quadrant: 'weakness', rank_in_quadrant: 10 },
      { strength_name: 'Esteem Builder', strength_family: 'relating', quadrant: 'weakness', rank_in_quadrant: 11 },
      { strength_name: 'Relationship Deepener', strength_family: 'relating', quadrant: 'weakness', rank_in_quadrant: 12 },
      { strength_name: 'Mission', strength_family: 'being', quadrant: 'weakness', rank_in_quadrant: 13 },
      { strength_name: 'Service', strength_family: 'being', quadrant: 'weakness', rank_in_quadrant: 14 },
      { strength_name: 'Compassion', strength_family: 'relating', quadrant: 'weakness', rank_in_quadrant: 15 },
      { strength_name: 'Persuasion', strength_family: 'relating', quadrant: 'weakness', rank_in_quadrant: 16 },
      { strength_name: 'Unconditionality', strength_family: 'being', quadrant: 'weakness', rank_in_quadrant: 17 },
      { strength_name: 'Judgement', strength_family: 'thinking', quadrant: 'weakness', rank_in_quadrant: 18 },
      { strength_name: 'Self-belief', strength_family: 'motivating', quadrant: 'weakness', rank_in_quadrant: 19 },
      { strength_name: 'Legacy', strength_family: 'being', quadrant: 'weakness', rank_in_quadrant: 20 },
      { strength_name: 'Enabler', strength_family: 'relating', quadrant: 'weakness', rank_in_quadrant: 21 },
      { strength_name: 'Writer', strength_family: 'communicating', quadrant: 'weakness', rank_in_quadrant: 22 },
    ].map(s => ({
      ...s,
      user_id: user.id,
      assessment_date: '2025-11-15',
    }));

    // Delete existing strengths for this date first, then insert
    await supabase
      .from('strengths_responses')
      .delete()
      .eq('user_id', user.id)
      .eq('assessment_date', '2025-11-15');

    const { error: strengthsError } = await supabase
      .from('strengths_responses')
      .insert(strengthsData);

    results.strengths = !strengthsError;
    if (strengthsError) console.error('Strengths insert error:', strengthsError);

    // ========================================================================
    // 4. VALUES ALIGNMENT RESULTS (November 2025)
    // ========================================================================
    const valuesData = {
      user_id: user.id,
      assessment_date: '2025-11-15',
      value_1: 'Well-being',
      value_2: 'Learning',
      value_3: 'Connection',
      value_1_supporting: [
        'Striving for good sleep hygiene, daily exercise, daily meditation',
        'Knowing health is the foundation for learning and connection',
      ],
      value_1_slippery: [
        'Emotional, addictive eating (particularly around sugar)',
        'Poor stress management',
      ],
      value_2_supporting: [
        'Always going deep on the industry/products professionally',
        'Staying curious across many different topics',
        'Trying to live every day prioritizing learning',
      ],
      value_2_slippery: [
        'Letting RSD and ADHD anxieties dictate behavior—becoming ego-based vs curiosity-based',
        'Historically slipped in professional settings with parents on differing POVs',
      ],
      value_3_supporting: [
        'Showing up for loved ones consistently',
        'Being present in conversations',
        'Vulnerability in close relationships',
      ],
      value_3_slippery: [
        'Isolating when stressed or overwhelmed',
        'Prioritizing work over relationships',
        'Surface-level interactions to avoid deeper engagement',
      ],
      early_warning_signs: [
        'Stressed',
        'Poor sleep',
        'Falling off daily habits',
        'No battery for social connection',
      ],
      realignment_actions: [
        'Prioritize sleep hygiene and rest',
        'Take a 10-minute walk or exercise',
        'Practice 5-minute meditation',
        'Choose curiosity over ego in interactions',
        'Reach out to one loved one',
        'Be present in conversations (phone away)',
      ],
      storage_path: 'assessment_results/values_alignment_results_november_2025.md',
    };

    const { error: valuesError } = await supabase
      .from('values_alignment_results')
      .upsert(valuesData, { onConflict: 'user_id,assessment_date' });

    results.values = !valuesError;
    if (valuesError) console.error('Values insert error:', valuesError);

    // ========================================================================
    // 5. CROSS-ASSESSMENT INSIGHTS
    // ========================================================================
    const insightsData = [
      {
        user_id: user.id,
        source_assessments: ['executive_function', 'self_compassion'],
        insight_type: 'cross_correlation',
        content: 'Low Emotional Control (EF: 3/21) correlates with high Over-Identification (SC: 3.75). When emotions spike, you may get swept up and lose task focus. DBT skills like STOP and Check the Facts can help create space.',
        severity: 'notable',
        trigger_context: ['therapist_chat', 'morning_insights', 'weekly_review'],
        valid_until: '2026-02-15',
      },
      {
        user_id: user.id,
        source_assessments: ['executive_function', 'strengths'],
        insight_type: 'strength_leverage',
        content: 'Your Goal-Directed Persistence (18/21) is a standout strength that can compensate for Time Management (6/21) and Working Memory (7/21) challenges. Tie tasks to meaningful goals to maintain momentum.',
        severity: 'gentle',
        trigger_context: ['executive_coach_chat', 'morning_insights'],
        valid_until: '2026-02-15',
      },
      {
        user_id: user.id,
        source_assessments: ['strengths', 'values_alignment'],
        insight_type: 'pattern_connection',
        content: 'Curiosity (#1 Realized) directly supports your Learning value. Growth (#5 Realized) reinforces it. These are your superpowers—lean into them during low-energy periods.',
        severity: 'gentle',
        trigger_context: ['executive_coach_chat'],
        valid_until: '2026-05-15',
      },
      {
        user_id: user.id,
        source_assessments: ['strengths'],
        insight_type: 'warning_indicator',
        content: 'Prevention is your #1 Learned Behaviour—you\'ve learned to anticipate problems but it drains energy. When stressed, watch for over-indexing on risk anticipation. Work Ethic (#2) and Persistence (#3) are also learned, not natural—be mindful of burnout.',
        severity: 'notable',
        trigger_context: ['therapist_chat', 'weekly_review'],
        valid_until: '2026-02-15',
      },
      {
        user_id: user.id,
        source_assessments: ['self_compassion', 'values_alignment'],
        insight_type: 'pattern_connection',
        content: 'Common Humanity (2.75) is your lowest positive SC subscale. This connects to the "isolation when stressed" slippery behavior in your Connection value. Practice "this is part of being human" reframes.',
        severity: 'gentle',
        trigger_context: ['therapist_chat', 'morning_insights'],
        valid_until: '2026-02-15',
      },
      {
        user_id: user.id,
        source_assessments: ['executive_function', 'strengths'],
        insight_type: 'cross_correlation',
        content: 'Personal Responsibility is your #1 Weakness, aligning with Time Management (6/21) and Working Memory (7/21) EF challenges. Use external scaffolding and accountability systems—this is essential, not optional.',
        severity: 'significant',
        trigger_context: ['executive_coach_chat', 'therapist_chat', 'morning_insights'],
        valid_until: '2026-02-15',
      },
    ];

    // Delete existing insights then insert fresh
    await supabase
      .from('assessment_insights')
      .delete()
      .eq('user_id', user.id);

    const { error: insightsError } = await supabase
      .from('assessment_insights')
      .insert(insightsData);

    results.insights = !insightsError;
    if (insightsError) console.error('Insights insert error:', insightsError);

    // ========================================================================
    // 6. ASSESSMENT REMINDERS
    // ========================================================================
    const remindersData = [
      {
        user_id: user.id,
        assessment_type: 'executive_function',
        last_taken_date: '2025-11-15',
        next_reminder_date: '2026-02-15',
        reminder_frequency_days: 90,
      },
      {
        user_id: user.id,
        assessment_type: 'self_compassion',
        last_taken_date: '2025-11-14',
        next_reminder_date: '2026-11-14',
        reminder_frequency_days: 365,
      },
      {
        user_id: user.id,
        assessment_type: 'strengths',
        last_taken_date: '2025-11-15',
        next_reminder_date: '2026-11-15',
        reminder_frequency_days: 365,
      },
      {
        user_id: user.id,
        assessment_type: 'values_alignment',
        last_taken_date: '2025-11-15',
        next_reminder_date: null, // Values rarely need retaking
        reminder_frequency_days: null,
      },
    ];

    for (const reminder of remindersData) {
      await supabase
        .from('assessment_reminders')
        .upsert(reminder, { onConflict: 'user_id,assessment_type' });
    }
    results.reminders = true;

    return NextResponse.json({
      success: true,
      message: 'November 2025 baseline data imported successfully',
      results,
    });
  } catch (error) {
    console.error('Import baseline error:', error);
    return NextResponse.json(
      { error: 'Failed to import baseline data', details: String(error) },
      { status: 500 }
    );
  }
}
