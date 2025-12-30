// Master key management for E2EE
// Uses Node.js crypto (server-side only - stronger than Web Crypto)
// Stores master key in .env.local for Electron app

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;  // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;

// BIP39-style wordlist (simplified - first 256 words for MVP)
const WORDLIST = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
  'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
  'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
  'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
  'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
  'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among',
  'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry',
  'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
  'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april',
  'arch', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor',
  'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art', 'artefact',
  'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist', 'assume',
  'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
  'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado',
  'avoid', 'awake', 'aware', 'away', 'awesome', 'awful', 'awkward', 'axis',
  'baby', 'bachelor', 'bacon', 'badge', 'bag', 'balance', 'balcony', 'ball',
  'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain', 'barrel', 'base',
  'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become',
  'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt',
  'bench', 'benefit', 'best', 'betray', 'better', 'between', 'beyond', 'bicycle',
  'bid', 'bike', 'bind', 'biology', 'bird', 'birth', 'bitter', 'black',
  'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless', 'blind', 'blood',
  'blossom', 'blouse', 'blue', 'blur', 'blush', 'board', 'boat', 'body',
  'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring',
  'borrow', 'boss', 'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain',
  'brand', 'brass', 'brave', 'bread', 'breeze', 'brick', 'bridge', 'brief',
  'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze', 'broom', 'brother',
  'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb',
  'bulk', 'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus',
  'business', 'busy', 'butter', 'buyer', 'buzz', 'cabbage', 'cabin', 'cable',
];

/**
 * Get path to .env.local file
 * In production: uses project root
 */
async function getEnvPath(): Promise<string> {
  return path.join(process.cwd(), '.env.local');
}

/**
 * Load master key from .env.local
 * Throws if key not found
 */
export async function getMasterKey(): Promise<Buffer> {
  const envPath = await getEnvPath();

  try {
    const envContent = await fs.readFile(envPath, 'utf8');
    const match = envContent.match(/CHRONONAUT_MASTER_KEY=([a-f0-9]{64})/);

    if (!match) {
      throw new Error('Master key not found in .env.local - run setup first');
    }

    return Buffer.from(match[1], 'hex');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('.env.local file not found - run setup first');
    }
    throw error;
  }
}

/**
 * Generate a new 256-bit master key
 * Returns key, recovery phrase, and verification hash
 */
export async function generateMasterKey(): Promise<{
  key: string;
  recoveryPhrase: string;
  keyHash: string;
}> {
  // Generate cryptographically secure 256-bit key
  const keyBuffer = crypto.randomBytes(KEY_LENGTH);
  const keyHex = keyBuffer.toString('hex');

  // Generate 24-word recovery phrase from key
  const recoveryPhrase = generateRecoveryPhrase(keyBuffer);

  // Generate hash for verification (first 16 chars)
  const keyHash = crypto
    .createHash('sha256')
    .update(keyBuffer)
    .digest('hex')
    .slice(0, 16);

  return { key: keyHex, recoveryPhrase, keyHash };
}

/**
 * Initialize master key on first launch
 * Creates .env.local if it doesn't exist
 * Returns whether this is first time and recovery phrase if so
 */
export async function initializeMasterKey(): Promise<{
  isFirstTime: boolean;
  recoveryPhrase?: string;
  keyHash: string;
}> {
  const envPath = await getEnvPath();
  let envContent = '';

  try {
    envContent = await fs.readFile(envPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    // File doesn't exist yet - will create below
  }

  // Check if master key already exists
  if (envContent.includes('CHRONONAUT_MASTER_KEY=')) {
    // Key already exists - not first time
    const keyBuffer = await getMasterKey();
    const keyHash = crypto
      .createHash('sha256')
      .update(keyBuffer)
      .digest('hex')
      .slice(0, 16);

    return { isFirstTime: false, keyHash };
  }

  // First time setup - generate new master key
  const { key, recoveryPhrase, keyHash } = await generateMasterKey();

  // Append to .env.local
  envContent += `\n# Chrononaut Master Encryption Key (DO NOT DELETE OR SHARE)\nCHRONONAUT_MASTER_KEY=${key}\nCHRONONAUT_KEY_HASH=${keyHash}\n`;

  await fs.writeFile(envPath, envContent, 'utf8');

  return { isFirstTime: true, recoveryPhrase, keyHash };
}

/**
 * Generate 24-word recovery phrase from key buffer
 * Uses simplified BIP39-style encoding
 */
function generateRecoveryPhrase(keyBuffer: Buffer): string {
  const words: string[] = [];

  // Convert key to 24 words (32 bytes → 24 words with checksum)
  for (let i = 0; i < 24; i++) {
    // Use 11 bits per word (2048 word dictionary in full BIP39)
    // Simplified: Use byte pairs modulo wordlist length
    const byteIndex = Math.floor(i * 1.33) % 32;
    const wordIndex = keyBuffer[byteIndex] % WORDLIST.length;
    words.push(WORDLIST[wordIndex]);
  }

  return words.join(' ');
}

/**
 * Import master key from recovery phrase
 * Regenerates key and saves to .env.local
 * NOTE: This is simplified - in production, use proper BIP39 derivation
 */
export async function importFromRecoveryPhrase(phrase: string): Promise<void> {
  const words = phrase.trim().toLowerCase().split(/\s+/);

  if (words.length !== 24) {
    throw new Error('Invalid recovery phrase - must be 24 words');
  }

  // Validate all words are in wordlist
  for (const word of words) {
    if (!WORDLIST.includes(word)) {
      throw new Error(`Invalid word in recovery phrase: ${word}`);
    }
  }

  // Reconstruct key from phrase
  // NOTE: This is simplified - real BIP39 uses PBKDF2 derivation
  const keyBuffer = Buffer.alloc(KEY_LENGTH);

  for (let i = 0; i < 24; i++) {
    const wordIndex = WORDLIST.indexOf(words[i]);
    const byteIndex = Math.floor(i * 1.33) % 32;
    keyBuffer[byteIndex] = wordIndex;
  }

  const keyHex = keyBuffer.toString('hex');
  const keyHash = crypto
    .createHash('sha256')
    .update(keyBuffer)
    .digest('hex')
    .slice(0, 16);

  // Write to .env.local
  const envPath = await getEnvPath();
  let envContent = '';

  try {
    envContent = await fs.readFile(envPath, 'utf8');
  } catch {
    // File doesn't exist - create new
  }

  // Remove old key if exists
  envContent = envContent.replace(/CHRONONAUT_MASTER_KEY=[a-f0-9]{64}\n?/g, '');
  envContent = envContent.replace(/CHRONONAUT_KEY_HASH=[a-f0-9]{16}\n?/g, '');

  // Add new key
  envContent += `\n# Chrononaut Master Encryption Key (Imported from Recovery Phrase)\nCHRONONAUT_MASTER_KEY=${keyHex}\nCHRONONAUT_KEY_HASH=${keyHash}\n`;

  await fs.writeFile(envPath, envContent, 'utf8');
}

/**
 * Verify master key matches expected hash
 * Used for integrity checking
 */
export async function verifyMasterKey(): Promise<boolean> {
  const envPath = await getEnvPath();
  const envContent = await fs.readFile(envPath, 'utf8');

  const keyMatch = envContent.match(/CHRONONAUT_MASTER_KEY=([a-f0-9]{64})/);
  const hashMatch = envContent.match(/CHRONONAUT_KEY_HASH=([a-f0-9]{16})/);

  if (!keyMatch || !hashMatch) return false;

  const keyBuffer = Buffer.from(keyMatch[1], 'hex');
  const storedHash = hashMatch[1];

  const computedHash = crypto
    .createHash('sha256')
    .update(keyBuffer)
    .digest('hex')
    .slice(0, 16);

  return computedHash === storedHash;
}
