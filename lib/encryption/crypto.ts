// Core AES-256-GCM encryption primitives
// Uses Node.js crypto with master key from .env.local
// Format: iv.authTag.ciphertext (all base64-encoded)

import crypto from 'crypto';
import { getMasterKey } from './master-key';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Encrypt plaintext string using master key
 * Returns: "iv.authTag.ciphertext" (base64)
 */
export async function encrypt(plaintext: string): Promise<string> {
  const masterKey = await getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Format: iv.authTag.ciphertext (all base64)
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted}`;
}

/**
 * Decrypt ciphertext using master key
 * Input: "iv.authTag.ciphertext" (base64)
 * Returns: plaintext string
 * Throws: If authentication fails (tampered data)
 */
export async function decrypt(ciphertext: string): Promise<string> {
  const masterKey = await getMasterKey();
  const parts = ciphertext.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format - expected iv.authTag.ciphertext');
  }

  const [ivB64, authTagB64, encryptedB64] = parts;

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt multiple strings in parallel
 * More efficient than calling encrypt() in a loop
 */
export async function encryptBatch(plaintexts: string[]): Promise<string[]> {
  return Promise.all(plaintexts.map(text => encrypt(text)));
}

/**
 * Decrypt multiple ciphertexts in parallel
 * More efficient than calling decrypt() in a loop
 */
export async function decryptBatch(ciphertexts: string[]): Promise<string[]> {
  return Promise.all(ciphertexts.map(text => decrypt(text)));
}

/**
 * Encrypt object fields
 * Useful for encrypting multiple fields of a database record
 */
export async function encryptObject<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): Promise<Record<string, string>> {
  const encrypted: Record<string, string> = {};

  const values = fieldsToEncrypt.map(field => {
    const value = obj[field];
    return value != null ? String(value) : '';
  });

  const encryptedValues = await encryptBatch(values);

  fieldsToEncrypt.forEach((field, index) => {
    encrypted[`encrypted_${String(field)}`] = encryptedValues[index];
  });

  return encrypted;
}

/**
 * Decrypt object fields
 * Reverses encryptObject() - useful for database records
 */
export async function decryptObject<T extends Record<string, any>>(
  encryptedObj: T,
  fieldsToDecrypt: string[]
): Promise<Record<string, string>> {
  const decrypted: Record<string, string> = {};

  const ciphertexts = fieldsToDecrypt.map(field => {
    const encryptedField = `encrypted_${field}`;
    return encryptedObj[encryptedField] || '';
  });

  const decryptedValues = await decryptBatch(ciphertexts.filter(Boolean));

  fieldsToDecrypt.forEach((field, index) => {
    decrypted[field] = decryptedValues[index] || '';
  });

  return decrypted;
}

/**
 * Check if a string is encrypted (has correct format)
 * Returns true if string matches "base64.base64.base64" pattern
 */
export function isEncrypted(text: string): boolean {
  const parts = text.split('.');
  if (parts.length !== 3) return false;

  // Check if all parts are valid base64
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return parts.every(part => base64Regex.test(part));
}
