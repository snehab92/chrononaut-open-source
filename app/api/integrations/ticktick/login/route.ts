import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TickTickClient } from '@/lib/ticktick/client';
import { pullTasksFromTickTick } from '@/lib/ticktick/sync';

/**
 * Direct login endpoint for TickTick
 * POST /api/integrations/ticktick/login
 * 
 * Body: { username: string, password: string }
 * 
 * This uses direct username/password authentication instead of OAuth.
 * Credentials are NOT stored - only the session token is saved.
 * 
 * After successful login, triggers initial sync to populate local database.
 */
export async function POST(request: NextRequest) {
  // Check if user is authenticated with Chrononaut
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    console.log('Attempting TickTick direct login for user:', user.id);

    // Attempt login
    const { client, token, inboxId } = await TickTickClient.login(username, password);

    console.log('TickTick login successful, storing token...');

    // Store token in database (NOT the password - just the session token)
    // TODO: Add encryption before production
    const { error: dbError } = await supabase
      .from('integration_tokens')
      .upsert({
        user_id: user.id,
        provider: 'ticktick',
        encrypted_access_token: token,
        encrypted_refresh_token: inboxId, // Store inboxId here for now
        token_type: 'session',
        scopes: ['tasks:read', 'tasks:write'],
        expires_at: null, // Session tokens don't have fixed expiry
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      });

    if (dbError) {
      console.error('Failed to store token:', dbError);
      return NextResponse.json(
        { error: 'Failed to store authentication' },
        { status: 500 }
      );
    }

    // Validate the token works by fetching projects
    const projects = await client.getProjects();
    console.log(`TickTick connected! Found ${projects.length} projects.`);

    // Trigger initial sync to populate local database
    console.log('Starting initial task sync...');
    const syncResult = await pullTasksFromTickTick(user.id, client, 'initial_connect');
    console.log('Initial sync complete:', {
      pulled: syncResult.pulled,
      errors: syncResult.errors.length,
    });

    return NextResponse.json({
      success: true,
      message: 'TickTick connected successfully',
      projectCount: projects.length,
      initialSync: {
        tasksPulled: syncResult.pulled,
        success: syncResult.success,
      },
    });

  } catch (err) {
    console.error('TickTick login error:', err);
    
    const message = err instanceof Error ? err.message : 'Unknown error';
    
    // Check for common error cases
    if (message.includes('401') || message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to connect to TickTick' },
      { status: 500 }
    );
  }
}
