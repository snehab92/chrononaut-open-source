import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, WhoopClient } from "@/lib/whoop/client";
import { syncWhoopData } from "@/lib/whoop/sync";
import { NextRequest, NextResponse } from "next/server";
import { storeIntegrationToken } from "@/lib/integrations/get-token";

/**
 * GET /api/integrations/whoop/callback
 * 
 * Handles OAuth callback from Whoop
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
    console.error('Whoop OAuth error:', error);
    return NextResponse.redirect(
      new URL('/settings?error=whoop_auth_failed', process.env.NEXT_PUBLIC_SITE_URL!)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/settings?error=no_code', process.env.NEXT_PUBLIC_SITE_URL!)
    );
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/whoop/callback`;
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    console.log('Whoop OAuth successful, storing tokens...');

    const storeResult = await storeIntegrationToken(
      user.id,
      'whoop',
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      },
      {
        token_type: 'oauth',
        scopes: ['read:recovery', 'read:cycles', 'read:sleep', 'read:workout', 'read:profile'],
        expires_at: new Date(tokens.expires_at).toISOString(),
      }
    );

    if (!storeResult.success) {
      console.error('Failed to store Whoop tokens:', storeResult.error);
      return NextResponse.redirect(
        new URL('/settings?error=token_storage_failed', process.env.NEXT_PUBLIC_SITE_URL!)
      );
    }

    // Validate token
    const client = new WhoopClient(tokens.access_token);
    const isValid = await client.validateToken();

    if (!isValid) {
      return NextResponse.redirect(
        new URL('/settings?error=token_invalid', process.env.NEXT_PUBLIC_SITE_URL!)
      );
    }

    // Trigger initial sync
    console.log('Starting initial Whoop sync...');
    const syncResult = await syncWhoopData(user.id, client);
    console.log('Initial Whoop sync complete:', {
      healthMetrics: syncResult.healthMetrics,
      workouts: syncResult.workouts,
      errors: syncResult.errors.length,
    });

    return NextResponse.redirect(
      new URL('/settings?success=whoop_connected', process.env.NEXT_PUBLIC_SITE_URL!)
    );
  } catch (err) {
    console.error('Whoop OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/settings?error=whoop_auth_failed', process.env.NEXT_PUBLIC_SITE_URL!)
    );
  }
}
