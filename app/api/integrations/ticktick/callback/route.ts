import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// This route handles the callback from TickTick after user authorizes
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle errors from TickTick
  if (error) {
    console.error('TickTick OAuth error:', error);
    return NextResponse.redirect(
      new URL('/settings?error=ticktick_auth_failed', process.env.NEXT_PUBLIC_SITE_URL!)
    );
  }

  // Verify we have a code
  if (!code) {
    return NextResponse.redirect(
      new URL('/settings?error=no_code', process.env.NEXT_PUBLIC_SITE_URL!)
    );
  }

  // Verify state matches (CSRF protection)
  const storedState = request.cookies.get('ticktick_oauth_state')?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL('/settings?error=invalid_state', process.env.NEXT_PUBLIC_SITE_URL!)
    );
  }

  // Check if user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.redirect(new URL('/sign-in', process.env.NEXT_PUBLIC_SITE_URL!));
  }

  try {
    const clientId = process.env.TICKTICK_CLIENT_ID!;
    const clientSecret = process.env.TICKTICK_CLIENT_SECRET!;
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/ticktick/callback`;

    console.log('=== TickTick OAuth Token Exchange ===');

    // Try approach 1: Basic Auth only (standard OAuth2)
    // Body: grant_type, code, redirect_uri, scope (NO credentials in body)
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      scope: 'tasks:read tasks:write',
    });

    // Basic Auth header with client_id:client_secret
    // Use utf8 encoding (default) instead of ascii to handle any special characters
    const authString = `${clientId}:${clientSecret}`;
    const authBase64 = Buffer.from(authString, 'utf8').toString('base64');

    console.log('Request details:', {
      url: 'https://ticktick.com/oauth/token',
      body: body.toString().replace(code, '[CODE]'),
      authHeader: `Basic ${authBase64.substring(0, 30)}...`,
      authStringLength: authString.length,
      redirectUri: redirectUri,
      clientIdLength: clientId.length,
      clientSecretLength: clientSecret.length,
      clientIdPreview: clientId.substring(0, 8) + '...',
    });

    // Try with Basic Auth header (standard OAuth2)
    let tokenResponse = await fetch('https://ticktick.com/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authBase64}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body,
    });

    // If Basic Auth fails, try with credentials in body (some OAuth2 implementations require this)
    if (!tokenResponse.ok && tokenResponse.status === 401) {
      console.log('Basic Auth failed, trying with credentials in body...');
      const bodyWithCredentials = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        scope: 'tasks:read tasks:write',
      });

      tokenResponse = await fetch('https://ticktick.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: bodyWithCredentials,
      });
    }

    const responseText = await tokenResponse.text();
    
    console.log('Token response:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      headers: Object.fromEntries(tokenResponse.headers.entries()),
      body: responseText.substring(0, 500),
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        responseBody: responseText,
        contentType: tokenResponse.headers.get('content-type'),
      });
      return NextResponse.redirect(
        new URL('/settings?error=token_exchange_failed', process.env.NEXT_PUBLIC_SITE_URL!)
      );
    }

    let tokens;
    try {
      tokens = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse token response as JSON:', {
        error: parseError,
        responseBody: responseText.substring(0, 500),
      });
      return NextResponse.redirect(
        new URL('/settings?error=token_exchange_failed', process.env.NEXT_PUBLIC_SITE_URL!)
      );
    }
    console.log('Token exchange successful!');
    
    // Store tokens in database
    const { error: dbError } = await supabase
      .from('integration_tokens')
      .upsert({
        user_id: user.id,
        provider: 'ticktick',
        encrypted_access_token: tokens.access_token,
        encrypted_refresh_token: tokens.refresh_token || null,
        token_type: tokens.token_type || 'Bearer',
        scopes: tokens.scope ? tokens.scope.split(' ') : ['tasks:read', 'tasks:write'],
        expires_at: tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      });

    if (dbError) {
      console.error('Failed to store tokens:', dbError);
      return NextResponse.redirect(
        new URL('/settings?error=storage_failed', process.env.NEXT_PUBLIC_SITE_URL!)
      );
    }

    // Success! Clear the state cookie and redirect
    const response = NextResponse.redirect(
      new URL('/settings?success=ticktick_connected', process.env.NEXT_PUBLIC_SITE_URL!)
    );
    response.cookies.delete('ticktick_oauth_state');
    
    return response;

  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/settings?error=unknown', process.env.NEXT_PUBLIC_SITE_URL!)
    );
  }
}
