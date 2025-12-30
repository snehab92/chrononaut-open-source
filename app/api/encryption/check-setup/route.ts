import { NextResponse } from 'next/server';
import { initializeMasterKey } from '@/lib/encryption/master-key';

/**
 * Check encryption setup status
 * If first time, generates master key and returns recovery phrase
 * If already setup, returns key hash for verification
 */
export async function GET() {
  try {
    const result = await initializeMasterKey();

    return NextResponse.json({
      isFirstTime: result.isFirstTime,
      recoveryPhrase: result.recoveryPhrase,
      keyHash: result.keyHash,
    });
  } catch (error) {
    console.error('Encryption setup check failed:', error);

    return NextResponse.json(
      {
        error: 'Failed to initialize encryption',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
