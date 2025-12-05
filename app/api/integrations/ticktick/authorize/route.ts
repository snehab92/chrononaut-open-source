import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// This route starts the OAuth flow by redirecting to TickTick's login page
export async function GET() {
  // Check if user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.redirect(new URL('/sign-in', process.env.NEXT_PUBLIC_SITE_URL));
  }

  const clientId = process.env.TICKTICK_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/ticktick/callback`;

  // Validate required environment variables
  if (!clientId) {
    console.error('TICKTICK_CLIENT_ID is not set in environment variables');
    return NextResponse.redirect(
      new URL('/settings?error=config_error', process.env.NEXT_PUBLIC_SITE_URL!)
    );
  }

  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    console.error('NEXT_PUBLIC_SITE_URL is not set in environment variables');
    return NextResponse.redirect(
      new URL('/settings?error=config_error', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    );
  }
  
  // Generate a random state to prevent CSRF attacks
  const state = crypto.randomUUID();
  
  // Store state in a cookie to verify on callback
  const response = NextResponse.redirect(
    `https://ticktick.com/oauth/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=tasks:read tasks:write&` +
    `state=${state}`
  );
  
  // Set state cookie for verification (expires in 10 minutes)
  response.cookies.set('ticktick_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });
  
  return response;
}
