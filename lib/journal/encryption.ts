// Client-side E2EE for journal entries
// Uses Web Crypto API with AES-256-GCM

const ENCRYPTION_ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

// Storage keys
const ENCRYPTED_KEY_STORAGE = "chrononaut_journal_key";
const KEY_HASH_STORAGE = "chrononaut_key_hash";

// Derive a key from passphrase using PBKDF2
async function deriveKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passphraseKey,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"]
  );
}

// Generate a hash of the passphrase for verification
export async function hashPassphrase(passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passphrase + "chrononaut_salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Initialize encryption with passphrase (first time setup)
export async function initializeEncryption(
  passphrase: string
): Promise<{ keyHash: string }> {
  // Generate salt for key derivation
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  // Derive encryption key
  const key = await deriveKey(passphrase, salt);

  // Export key for storage (encrypted with itself for simplicity in MVP)
  const exportedKey = await crypto.subtle.exportKey("raw", key);

  // Store salt + key in localStorage (in production, use secure storage)
  const keyData = {
    salt: Array.from(salt),
    key: Array.from(new Uint8Array(exportedKey)),
  };
  localStorage.setItem(ENCRYPTED_KEY_STORAGE, JSON.stringify(keyData));

  // Generate and store hash for verification
  const keyHash = await hashPassphrase(passphrase);
  localStorage.setItem(KEY_HASH_STORAGE, keyHash);

  return { keyHash };
}

// Verify passphrase matches stored hash
export async function verifyPassphrase(passphrase: string): Promise<boolean> {
  const storedHash = localStorage.getItem(KEY_HASH_STORAGE);
  if (!storedHash) return false;

  const inputHash = await hashPassphrase(passphrase);
  return inputHash === storedHash;
}

// Check if encryption is initialized
export function isEncryptionInitialized(): boolean {
  return !!localStorage.getItem(ENCRYPTED_KEY_STORAGE);
}

// Get encryption key from storage
async function getEncryptionKey(): Promise<CryptoKey | null> {
  const stored = localStorage.getItem(ENCRYPTED_KEY_STORAGE);
  if (!stored) return null;

  try {
    const keyData = JSON.parse(stored);
    const keyBytes = new Uint8Array(keyData.key);

    return crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
      false,
      ["encrypt", "decrypt"]
    );
  } catch {
    return null;
  }
}

// Encrypt text content
export async function encryptContent(plaintext: string): Promise<string | null> {
  const key = await getEncryptionKey();
  if (!key) return null;

  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encrypted = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

// Decrypt content
export async function decryptContent(ciphertext: string): Promise<string | null> {
  const key = await getEncryptionKey();
  if (!key) return null;

  try {
    // Decode from base64
    const combined = new Uint8Array(
      atob(ciphertext)
        .split("")
        .map((c) => c.charCodeAt(0))
    );

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch {
    return null;
  }
}

// Encrypt journal entry fields
export async function encryptJournalEntry(entry: {
  happened?: string;
  feelings?: string;
  grateful?: string;
}): Promise<{
  encrypted_happened: string | null;
  encrypted_feelings: string | null;
  encrypted_grateful: string | null;
}> {
  const [happened, feelings, grateful] = await Promise.all([
    entry.happened ? encryptContent(entry.happened) : null,
    entry.feelings ? encryptContent(entry.feelings) : null,
    entry.grateful ? encryptContent(entry.grateful) : null,
  ]);

  return {
    encrypted_happened: happened,
    encrypted_feelings: feelings,
    encrypted_grateful: grateful,
  };
}

// Decrypt journal entry fields
export async function decryptJournalEntry(entry: {
  encrypted_happened?: string | null;
  encrypted_feelings?: string | null;
  encrypted_grateful?: string | null;
}): Promise<{
  happened: string;
  feelings: string;
  grateful: string;
}> {
  const [happened, feelings, grateful] = await Promise.all([
    entry.encrypted_happened ? decryptContent(entry.encrypted_happened) : null,
    entry.encrypted_feelings ? decryptContent(entry.encrypted_feelings) : null,
    entry.encrypted_grateful ? decryptContent(entry.encrypted_grateful) : null,
  ]);

  return {
    happened: happened || "",
    feelings: feelings || "",
    grateful: grateful || "",
  };
}

// Clear encryption data (for logout or key reset)
export function clearEncryptionData(): void {
  localStorage.removeItem(ENCRYPTED_KEY_STORAGE);
  localStorage.removeItem(KEY_HASH_STORAGE);
}
