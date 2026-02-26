import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, GoogleCalendarClient } from "@/lib/google/calendar";
import { pullEventsFromGoogle } from "@/lib/google/sync";
import { NextRequest, NextResponse } from "next/server";
import { storeIntegrationToken } from "@/lib/integrations/get-token";

/**
 * GET /api/integrations/google/callback
 * 
 * Handles OAuth callback from Google
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_SITE_URL!));
  }

  // Get authorization code from query params
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(
      new URL('/settings?error=google_auth_failed', process.env.NEXT_PUBLIC_SITE_URL!)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/settings?error=no_code', process.env.NEXT_PUBLIC_SITE_URL!)
    );
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/google/callback`;
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    console.log('Google OAuth successful, storing tokens...');

    const storeResult = await storeIntegrationToken(
      user.id,
      'google_calendar',
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
      },
      {
        token_type: 'oauth',
        scopes: ['calendar.readonly'],
        expires_at: tokens.expires_at ? new Date(tokens.expires_at).toISOString() : null,
      }
    );

    if (!storeResult.success) {
      console.error('Failed to store Google tokens:', storeResult.error);
      return NextResponse.redirect(
        new URL('/settings?error=token_storage_failed', process.env.NEXT_PUBLIC_SITE_URL!)
      );
    }

    // Validate token and do initial sync
    const client = GoogleCalendarClient.fromTokens(tokens);
    const isValid = await client.validateToken();

    if (!isValid) {
      return NextResponse.redirect(
        new URL('/settings?error=token_invalid', process.env.NEXT_PUBLIC_SITE_URL!)
      );
    }

    // Trigger initial sync
    console.log('Starting initial calendar sync...');
    const syncResult = await pullEventsFromGoogle(user.id, client, 'initial_connect');
    console.log('Initial sync complete:', {
      pulled: syncResult.pulled,
      errors: syncResult.errors.length,
    });

    return NextResponse.redirect(
      new URL('/settings?success=google_connected', process.env.NEXT_PUBLIC_SITE_URL!)
    );
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/settings?error=google_auth_failed', process.env.NEXT_PUBLIC_SITE_URL!)
    );
  }
}
