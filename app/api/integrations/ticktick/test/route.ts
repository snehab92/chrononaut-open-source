import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TickTickClient } from '@/lib/ticktick/client';

/**
 * Test endpoint - fetch tasks from TickTick
 * GET /api/integrations/ticktick/test
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get stored token
  const { data: tokenData, error: tokenError } = await supabase
    .from('integration_tokens')
    .select('encrypted_access_token, encrypted_refresh_token')
    .eq('user_id', user.id)
    .eq('provider', 'ticktick')
    .single();

  if (tokenError || !tokenData) {
    return NextResponse.json(
      { error: 'TickTick not connected. Please login first.' },
      { status: 400 }
    );
  }

  try {
    const client = TickTickClient.fromToken(
      tokenData.encrypted_access_token,
      tokenData.encrypted_refresh_token // inboxId stored here
    );

    // Test: Get all data
    const data = await client.getAllTasks();

    return NextResponse.json({
      success: true,
      summary: {
        projects: data.projectProfiles?.length || 0,
        tasks: data.syncTaskBean?.update?.length || 0,
        tags: data.tags?.length || 0
      },
      // Include first few items as preview
      preview: {
        projects: data.projectProfiles?.slice(0, 3).map(p => ({ id: p.id, name: p.name })),
        tasks: data.syncTaskBean?.update?.slice(0, 5).map(t => ({ 
          id: t.id, 
          title: t.title, 
          status: t.status,
          dueDate: t.dueDate 
        }))
      }
    });

  } catch (err) {
    console.error('TickTick test error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch from TickTick', details: String(err) },
      { status: 500 }
    );
  }
}
