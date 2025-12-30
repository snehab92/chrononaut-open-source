// Journal encryption v2 - Uses master key instead of passphrase
// Replaces the old client-side passphrase system with server-side master key encryption
// This enables AI agents to access encrypted journal data

import { encrypt, decrypt, encryptBatch, decryptBatch } from '@/lib/encryption/crypto';

export interface JournalEntry {
  happened?: string;
  feelings?: string;
  grateful?: string;
  ai_insights?: string;
}

export interface EncryptedJournalEntry {
  encrypted_happened: string | null;
  encrypted_feelings: string | null;
  encrypted_grateful: string | null;
  encrypted_ai_insights: string | null;
  encryption_version: number;
}

/**
 * Encrypt journal entry fields using master key
 * Returns encrypted fields ready for database storage
 */
export async function encryptJournalEntry(
  entry: JournalEntry
): Promise<EncryptedJournalEntry> {
  // Prepare plaintext array (empty strings for null values)
  const plaintexts = [
    entry.happened || '',
    entry.feelings || '',
    entry.grateful || '',
    entry.ai_insights || '',
  ];

  // Encrypt all fields in parallel
  const encrypted = await encryptBatch(plaintexts);

  return {
    encrypted_happened: entry.happened ? encrypted[0] : null,
    encrypted_feelings: entry.feelings ? encrypted[1] : null,
    encrypted_grateful: entry.grateful ? encrypted[2] : null,
    encrypted_ai_insights: entry.ai_insights ? encrypted[3] : null,
    encryption_version: 2, // v2 = master key
  };
}

/**
 * Decrypt journal entry fields using master key
 * Returns plaintext fields for display or AI processing
 */
export async function decryptJournalEntry(
  encrypted: EncryptedJournalEntry | {
    encrypted_happened?: string | null;
    encrypted_feelings?: string | null;
    encrypted_grateful?: string | null;
    encrypted_ai_insights?: string | null;
  }
): Promise<JournalEntry> {
  // Collect non-null ciphertexts
  const ciphertexts = [
    encrypted.encrypted_happened,
    encrypted.encrypted_feelings,
    encrypted.encrypted_grateful,
    encrypted.encrypted_ai_insights,
  ].filter((text): text is string => text !== null && text !== undefined);

  if (ciphertexts.length === 0) {
    return {
      happened: '',
      feelings: '',
      grateful: '',
      ai_insights: '',
    };
  }

  // Decrypt all fields in parallel
  const decrypted = await decryptBatch(ciphertexts);

  let index = 0;
  return {
    happened: encrypted.encrypted_happened ? decrypted[index++] || '' : '',
    feelings: encrypted.encrypted_feelings ? decrypted[index++] || '' : '',
    grateful: encrypted.encrypted_grateful ? decrypted[index++] || '' : '',
    ai_insights: encrypted.encrypted_ai_insights ? decrypted[index++] || '' : '',
  };
}

/**
 * Decrypt multiple journal entries in batch
 * Efficient for loading multiple entries at once (e.g., for AI context)
 */
export async function decryptJournalEntries(
  entries: Array<{
    entry_date: string;
    encrypted_happened?: string | null;
    encrypted_feelings?: string | null;
    encrypted_grateful?: string | null;
    encrypted_ai_insights?: string | null;
  }>
): Promise<Array<{
  entry_date: string;
  happened: string;
  feelings: string;
  grateful: string;
  ai_insights: string;
}>> {
  return Promise.all(
    entries.map(async (entry) => {
      const decrypted = await decryptJournalEntry(entry);
      return {
        entry_date: entry.entry_date,
        happened: decrypted.happened || '',
        feelings: decrypted.feelings || '',
        grateful: decrypted.grateful || '',
        ai_insights: decrypted.ai_insights || '',
      };
    })
  );
}
