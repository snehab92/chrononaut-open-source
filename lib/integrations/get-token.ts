// Centralized integration token retrieval
// Tokens are stored as plaintext in Supabase (protected by RLS)

import { createClient } from '@/lib/supabase/server';

export interface IntegrationToken {
  access_token: string;
  refresh_token: string | null;
}

/**
 * Get integration token for a provider
 *
 * @param userId - User ID
 * @param provider - Integration provider ('google_calendar', 'whoop')
 * @returns Tokens ready for API use, or null if not found
 */
export async function getIntegrationToken(
  userId: string,
  provider: string
): Promise<IntegrationToken | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('integration_tokens')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (error || !data) {
    console.error(`Token not found for provider ${provider}:`, error);
    return null;
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || null,
  };
}

/**
 * Store integration token
 *
 * @param userId - User ID
 * @param provider - Integration provider
 * @param token - Tokens to store
 * @param metadata - Additional token metadata
 */
export async function storeIntegrationToken(
  userId: string,
  provider: string,
  token: IntegrationToken,
  metadata?: {
    token_type?: string;
    scopes?: string[];
    expires_at?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('integration_tokens')
      .upsert(
        {
          user_id: userId,
          provider,
          access_token: token.access_token,
          refresh_token: token.refresh_token,
          token_type: metadata?.token_type || 'Bearer',
          scopes: metadata?.scopes || [],
          expires_at: metadata?.expires_at || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,provider',
        }
      );

    if (error) {
      console.error(`Failed to store token for ${provider}:`, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error(`Failed to store token for ${provider}:`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Storage failed',
    };
  }
}
