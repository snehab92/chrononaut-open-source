// Health metrics encryption module
// Encrypts Whoop health data (recovery, HRV, sleep, strain)
// Uses master key from .env.local

import { encrypt, decrypt } from './crypto';

export interface HealthMetrics {
  recovery_score?: number | null;
  hrv_rmssd?: number | null;
  resting_hr?: number | null;
  sleep_performance?: number | null;
  sleep_duration_minutes?: number | null;
  strain_score?: number | null;
}

export interface EncryptedHealthMetrics {
  encrypted_recovery_score: string | null;
  encrypted_hrv_rmssd: string | null;
  encrypted_resting_hr: string | null;
  encrypted_sleep_performance: string | null;
  encrypted_sleep_duration_minutes: string | null;
  encrypted_strain_score: string | null;
  is_encrypted: boolean;
}

/**
 * Encrypt health metrics using master key
 * Converts numbers to strings before encryption
 */
export async function encryptHealthMetrics(
  metrics: HealthMetrics
): Promise<EncryptedHealthMetrics> {
  const encrypted = await Promise.all([
    metrics.recovery_score != null
      ? encrypt(metrics.recovery_score.toString())
      : null,
    metrics.hrv_rmssd != null ? encrypt(metrics.hrv_rmssd.toString()) : null,
    metrics.resting_hr != null ? encrypt(metrics.resting_hr.toString()) : null,
    metrics.sleep_performance != null
      ? encrypt(metrics.sleep_performance.toString())
      : null,
    metrics.sleep_duration_minutes != null
      ? encrypt(metrics.sleep_duration_minutes.toString())
      : null,
    metrics.strain_score != null ? encrypt(metrics.strain_score.toString()) : null,
  ]);

  return {
    encrypted_recovery_score: encrypted[0],
    encrypted_hrv_rmssd: encrypted[1],
    encrypted_resting_hr: encrypted[2],
    encrypted_sleep_performance: encrypted[3],
    encrypted_sleep_duration_minutes: encrypted[4],
    encrypted_strain_score: encrypted[5],
    is_encrypted: true,
  };
}

/**
 * Decrypt health metrics using master key
 * Converts decrypted strings back to numbers
 */
export async function decryptHealthMetrics(
  encrypted: EncryptedHealthMetrics | {
    encrypted_recovery_score?: string | null;
    encrypted_hrv_rmssd?: string | null;
    encrypted_resting_hr?: string | null;
    encrypted_sleep_performance?: string | null;
    encrypted_sleep_duration_minutes?: string | null;
    encrypted_strain_score?: string | null;
  }
): Promise<HealthMetrics> {
  const decrypted = await Promise.all([
    encrypted.encrypted_recovery_score
      ? decrypt(encrypted.encrypted_recovery_score)
      : null,
    encrypted.encrypted_hrv_rmssd ? decrypt(encrypted.encrypted_hrv_rmssd) : null,
    encrypted.encrypted_resting_hr
      ? decrypt(encrypted.encrypted_resting_hr)
      : null,
    encrypted.encrypted_sleep_performance
      ? decrypt(encrypted.encrypted_sleep_performance)
      : null,
    encrypted.encrypted_sleep_duration_minutes
      ? decrypt(encrypted.encrypted_sleep_duration_minutes)
      : null,
    encrypted.encrypted_strain_score
      ? decrypt(encrypted.encrypted_strain_score)
      : null,
  ]);

  return {
    recovery_score: decrypted[0] ? parseFloat(decrypted[0]) : null,
    hrv_rmssd: decrypted[1] ? parseFloat(decrypted[1]) : null,
    resting_hr: decrypted[2] ? parseFloat(decrypted[2]) : null,
    sleep_performance: decrypted[3] ? parseFloat(decrypted[3]) : null,
    sleep_duration_minutes: decrypted[4] ? parseInt(decrypted[4]) : null,
    strain_score: decrypted[5] ? parseFloat(decrypted[5]) : null,
  };
}
