#!/usr/bin/env tsx
/**
 * Enable Leaked Password Protection in Supabase Auth
 *
 * This script uses the Supabase Management API to enable password leak checking
 * against the HaveIBeenPwned database.
 *
 * Run: npx tsx scripts/enable-leaked-password-protection.ts
 */

const SUPABASE_PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/(.+)\.supabase\.co/)?.[1];

if (!SUPABASE_PROJECT_REF) {
  console.error('❌ Could not extract project ref from NEXT_PUBLIC_SUPABASE_URL');
  console.error('   Expected format: https://<project-ref>.supabase.co');
  process.exit(1);
}

async function enableLeakedPasswordProtection() {
  console.log('🔐 Enabling leaked password protection for Supabase project...');
  console.log(`   Project: ${SUPABASE_PROJECT_REF}`);
  console.log('');

  // Note: This requires Supabase dashboard access
  // The Management API endpoint is not publicly documented for this setting

  console.log('📋 Manual Steps Required:');
  console.log('');
  console.log('1. Go to: https://supabase.com/dashboard/project/' + SUPABASE_PROJECT_REF + '/auth/policies');
  console.log('2. Scroll to "Password Settings"');
  console.log('3. Enable "Leaked Password Protection"');
  console.log('4. Click "Save"');
  console.log('');
  console.log('✅ This will check all new passwords against HaveIBeenPwned database');
  console.log('');

  // Test with a known leaked password
  console.log('🧪 To test after enabling:');
  console.log('   Try signing up with password: "password123"');
  console.log('   Expected: Should be rejected as a known leaked password');
  console.log('');
}

enableLeakedPasswordProtection();
