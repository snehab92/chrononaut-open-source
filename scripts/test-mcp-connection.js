#!/usr/bin/env node
/**
 * Test script to verify MCP connection and Supabase database access
 * Run with: node scripts/test-mcp-connection.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envFile = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envFile, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const [, key, value] = match;
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const accessToken = envVars.SUPABASE_ACCESS_TOKEN;

console.log('🔍 Testing Supabase Connection...\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log(`   ✅ SUPABASE_URL: ${supabaseUrl ? 'Found' : '❌ Missing'}`);
console.log(`   ✅ SUPABASE_KEY: ${supabaseKey ? 'Found' : '❌ Missing'}`);
console.log(`   ✅ ACCESS_TOKEN: ${accessToken ? `Found (${accessToken.substring(0, 20)}...)` : '❌ Missing'}\n`);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required Supabase environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Test 1: Check integration_tokens table for Google Calendar
console.log('2. Checking Google Calendar Integration:');
try {
  const { data: tokens, error } = await supabase
    .from('integration_tokens')
    .select('*')
    .eq('provider', 'google_calendar')
    .limit(5);

  if (error) {
    console.log(`   ❌ Error querying integration_tokens: ${error.message}`);
  } else {
    console.log(`   ✅ Found ${tokens?.length || 0} Google Calendar token(s)`);
    if (tokens && tokens.length > 0) {
      tokens.forEach((token, i) => {
        console.log(`   Token ${i + 1}:`);
        console.log(`     - User ID: ${token.user_id}`);
        console.log(`     - Has Access Token: ${token.encrypted_access_token ? 'Yes' : 'No'}`);
        console.log(`     - Has Refresh Token: ${token.encrypted_refresh_token ? 'Yes' : 'No'}`);
        console.log(`     - Expires At: ${token.expires_at || 'Not set'}`);
        console.log(`     - Created: ${token.created_at}`);
        console.log(`     - Updated: ${token.updated_at}`);
      });
    }
  }
} catch (err) {
  console.log(`   ❌ Exception: ${err.message}`);
}

console.log('');

// Test 2: Check calendar_events table
console.log('3. Checking Calendar Events:');
try {
  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('id, title, start_time, status, last_synced_at')
    .order('start_time', { ascending: false })
    .limit(5);

  if (error) {
    console.log(`   ❌ Error querying calendar_events: ${error.message}`);
  } else {
    console.log(`   ✅ Found ${events?.length || 0} calendar event(s)`);
    if (events && events.length > 0) {
      events.forEach((event, i) => {
        console.log(`   Event ${i + 1}: ${event.title}`);
        console.log(`     - Start: ${event.start_time}`);
        console.log(`     - Status: ${event.status}`);
        console.log(`     - Last Synced: ${event.last_synced_at || 'Never'}`);
      });
    } else {
      console.log('   ⚠️  No events found - sync may not have run');
    }
  }
} catch (err) {
  console.log(`   ❌ Exception: ${err.message}`);
}

console.log('');

// Test 3: Check sync_log for Google Calendar
console.log('4. Checking Sync Logs:');
try {
  const { data: logs, error } = await supabase
    .from('sync_log')
    .select('*')
    .eq('provider', 'google_calendar')
    .order('completed_at', { ascending: false })
    .limit(5);

  if (error) {
    console.log(`   ❌ Error querying sync_log: ${error.message}`);
  } else {
    console.log(`   ✅ Found ${logs?.length || 0} sync log entry/entries`);
    if (logs && logs.length > 0) {
      logs.forEach((log, i) => {
        console.log(`   Sync ${i + 1}:`);
        console.log(`     - Status: ${log.status}`);
        console.log(`     - Trigger: ${log.trigger_type}`);
        console.log(`     - Pulled: ${log.pulled_count || 0}`);
        console.log(`     - Completed: ${log.completed_at}`);
        if (log.error_message) {
          console.log(`     - ❌ Error: ${log.error_message}`);
        }
      });
    } else {
      console.log('   ⚠️  No sync logs found - integration may not have synced yet');
    }
  }
} catch (err) {
  console.log(`   ❌ Exception: ${err.message}`);
}

console.log('\n✅ Test complete!');





