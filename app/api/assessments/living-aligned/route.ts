/**
 * Living Aligned Score API
 *
 * GET - Fetch the user's current Living Aligned score
 * Auto-computes if stale (>24 hours) or missing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLivingAlignedScore } from '@/lib/ai/workflows/values-alignment-score';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for force refresh param
    const searchParams = request.nextUrl.searchParams;
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Get or compute the score (cached for 24 hours)
    const score = await getLivingAlignedScore(user.id, forceRefresh);

    if (!score) {
      return NextResponse.json({
        score: null,
        message: 'Values alignment assessment not complete or insufficient data',
      });
    }

    return NextResponse.json(score);
  } catch (error) {
    console.error('Living Aligned API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
