// Integration token encryption module
// Encrypts TickTick, Google Calendar, and Whoop OAuth/session tokens
// Uses master key from .env.local

import { encrypt, decrypt } from './crypto';

export interface IntegrationToken {
  access_token: string;
  refresh_token?: string | null;
}

export interface EncryptedIntegrationToken {
  encrypted_access_token: string;
  encrypted_refresh_token: string | null;
  encryption_version: number;
}

/**
 * Encrypt a single token string
 */
export async function encryptToken(token: string): Promise<string> {
  return encrypt(token);
}

/**
 * Decrypt a single token string
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  return decrypt(encryptedToken);
}

/**
 * Encrypt integration token (access + refresh)
 * Returns object ready to store in integration_tokens table
 */
export async function encryptIntegrationToken(
  token: IntegrationToken
): Promise<EncryptedIntegrationToken> {
  const [accessEncrypted, refreshEncrypted] = await Promise.all([
    encrypt(token.access_token),
    token.refresh_token ? encrypt(token.refresh_token) : null,
  ]);

  return {
    encrypted_access_token: accessEncrypted,
    encrypted_refresh_token: refreshEncrypted,
    encryption_version: 2, // v2 = master key encrypted
  };
}

/**
 * Decrypt integration token (access + refresh)
 * Returns plaintext tokens for use in API calls
 */
export async function decryptIntegrationToken(
  encrypted: EncryptedIntegrationToken | {
    encrypted_access_token: string;
    encrypted_refresh_token?: string | null;
  }
): Promise<IntegrationToken> {
  const [access, refresh] = await Promise.all([
    decrypt(encrypted.encrypted_access_token),
    encrypted.encrypted_refresh_token
      ? decrypt(encrypted.encrypted_refresh_token)
      : null,
  ]);

  return {
    access_token: access,
    refresh_token: refresh,
  };
}
