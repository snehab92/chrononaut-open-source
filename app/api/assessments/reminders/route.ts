/**
 * Assessment Reminders API
 *
 * GET - Fetch due reminders
 * POST - Dismiss/snooze a reminder
 * PUT - Update after assessment completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AssessmentType } from '@/lib/assessments/types';

// ============================================================================
// GET - Fetch due reminders
// ============================================================================

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get all reminders for user
    const { data: reminders, error } = await supabase
      .from('assessment_reminders')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to fetch reminders:', error);
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
    }

    // Check which are due
    const dueReminders = (reminders || []).filter(r => {
      // Skip if dismissed
      if (r.dismissed_until && r.dismissed_until > today) {
        return false;
      }
      // Due if next_reminder_date is today or past
      return r.next_reminder_date && r.next_reminder_date <= today;
    });

    return NextResponse.json({
      all: reminders || [],
      due: dueReminders,
    });
  } catch (error) {
    console.error('Reminders API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ============================================================================
// POST - Dismiss or snooze a reminder
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { assessment_type, action, snooze_days } = body as {
      assessment_type: AssessmentType;
      action: 'dismiss' | 'snooze';
      snooze_days?: number;
    };

    if (!assessment_type || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const today = new Date();
    let dismissedUntil: string | null = null;

    if (action === 'dismiss') {
      // Dismiss for 30 days by default
      const dismissDate = new Date(today);
      dismissDate.setDate(dismissDate.getDate() + 30);
      dismissedUntil = dismissDate.toISOString().split('T')[0];
    } else if (action === 'snooze') {
      // Snooze for specified days (default 7)
      const snoozeDate = new Date(today);
      snoozeDate.setDate(snoozeDate.getDate() + (snooze_days || 7));
      dismissedUntil = snoozeDate.toISOString().split('T')[0];
    }

    const { error } = await supabase
      .from('assessment_reminders')
      .upsert({
        user_id: user.id,
        assessment_type,
        dismissed_until: dismissedUntil,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,assessment_type',
      });

    if (error) {
      console.error('Failed to update reminder:', error);
      return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
    }

    return NextResponse.json({ success: true, dismissed_until: dismissedUntil });
  } catch (error) {
    console.error('Reminders API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ============================================================================
// PUT - Update after assessment completed
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { assessment_type, taken_date } = body as {
      assessment_type: AssessmentType;
      taken_date?: string;
    };

    if (!assessment_type) {
      return NextResponse.json({ error: 'Missing assessment_type' }, { status: 400 });
    }

    const lastTaken = taken_date || new Date().toISOString().split('T')[0];

    // Calculate next reminder date based on assessment type
    const frequencyDays = getFrequencyDays(assessment_type);
    let nextReminderDate: string | null = null;

    if (frequencyDays) {
      const nextDate = new Date(lastTaken);
      nextDate.setDate(nextDate.getDate() + frequencyDays);
      nextReminderDate = nextDate.toISOString().split('T')[0];
    }

    const { error } = await supabase
      .from('assessment_reminders')
      .upsert({
        user_id: user.id,
        assessment_type,
        last_taken_date: lastTaken,
        next_reminder_date: nextReminderDate,
        reminder_frequency_days: frequencyDays,
        dismissed_until: null, // Clear any dismissal
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,assessment_type',
      });

    if (error) {
      console.error('Failed to update reminder:', error);
      return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      last_taken_date: lastTaken,
      next_reminder_date: nextReminderDate,
    });
  } catch (error) {
    console.error('Reminders API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getFrequencyDays(assessmentType: AssessmentType): number | null {
  switch (assessmentType) {
    case 'executive_function':
      return 90; // Quarterly
    case 'self_compassion':
    case 'strengths':
      return 365; // Yearly
    case 'values_alignment':
      return null; // No reminder (unchanging)
    default:
      return null;
  }
}
