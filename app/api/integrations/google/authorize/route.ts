import { createClient } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/google/calendar";
import { NextResponse } from "next/server";

/**
 * GET /api/integrations/google/authorize
 * 
 * Redirects user to Google OAuth consent screen
 */
export async function GET() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_SITE_URL!));
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/google/callback`;
  const authUrl = getAuthUrl(redirectUri, user.id);

  return NextResponse.redirect(authUrl);
}
