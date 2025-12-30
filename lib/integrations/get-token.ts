// Centralized integration token retrieval with auto-decryption
// Handles backward compatibility: v1 (plaintext) → v2 (encrypted) migration on read

import { createClient } from '@/lib/supabase/server';
import { decryptIntegrationToken, encryptIntegrationToken } from '@/lib/encryption/tokens';
import type { IntegrationToken } from '@/lib/encryption/tokens';

/**
 * Get integration token for a provider
 * Automatically migrates v1 (plaintext) to v2 (encrypted) on first read
 *
 * @param userId - User ID
 * @param provider - Integration provider ('ticktick', 'google_calendar', 'whoop')
 * @returns Decrypted tokens ready for API use, or null if not found
 */
export async function getIntegrationToken(
  userId: string,
  provider: string
): Promise<IntegrationToken | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('integration_tokens')
    .select('encrypted_access_token, encrypted_refresh_token, encryption_version')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (error || !data) {
    console.error(`Token not found for provider ${provider}:`, error);
    return null;
  }

  // Handle v1 tokens (plaintext - SECURITY VULNERABILITY)
  if (!data.encryption_version || data.encryption_version === 1) {
    console.log(`[MIGRATION] Found v1 plaintext token for ${provider}, migrating to v2...`);

    // Tokens are actually plaintext despite column name
    const plaintextTokens: IntegrationToken = {
      access_token: data.encrypted_access_token, // Actually plaintext
      refresh_token: data.encrypted_refresh_token || null,
    };

    try {
      // Encrypt with master key (v2)
      const encrypted = await encryptIntegrationToken(plaintextTokens);

      // Update database with encrypted version
      const { error: updateError } = await supabase
        .from('integration_tokens')
        .update({
          encrypted_access_token: encrypted.encrypted_access_token,
          encrypted_refresh_token: encrypted.encrypted_refresh_token,
          encryption_version: 2,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('provider', provider);

      if (updateError) {
        console.error(`Failed to migrate token for ${provider}:`, updateError);
        // Return plaintext anyway (migration will retry next time)
        return plaintextTokens;
      }

      console.log(`[MIGRATION] Successfully migrated ${provider} token to v2`);
      return plaintextTokens;
    } catch (encryptError) {
      console.error(`Encryption failed during migration for ${provider}:`, encryptError);
      // Return plaintext (migration will retry next time)
      return plaintextTokens;
    }
  }

  // Handle v2 tokens (encrypted with master key)
  try {
    const decrypted = await decryptIntegrationToken({
      encrypted_access_token: data.encrypted_access_token,
      encrypted_refresh_token: data.encrypted_refresh_token,
    });

    return decrypted;
  } catch (decryptError) {
    console.error(`Failed to decrypt token for ${provider}:`, decryptError);
    return null;
  }
}

/**
 * Store integration token (always as v2 encrypted)
 *
 * @param userId - User ID
 * @param provider - Integration provider
 * @param token - Plaintext tokens to encrypt and store
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
    // Encrypt tokens with master key
    const encrypted = await encryptIntegrationToken(token);

    // Store in database
    const { error } = await supabase
      .from('integration_tokens')
      .upsert(
        {
          user_id: userId,
          provider,
          encrypted_access_token: encrypted.encrypted_access_token,
          encrypted_refresh_token: encrypted.encrypted_refresh_token,
          encryption_version: 2,
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
  } catch (encryptError) {
    console.error(`Encryption failed for ${provider}:`, encryptError);
    return {
      success: false,
      error: encryptError instanceof Error ? encryptError.message : 'Encryption failed',
    };
  }
}
