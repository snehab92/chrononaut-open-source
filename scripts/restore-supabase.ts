#!/usr/bin/env node
/**
 * Supabase Database Restore Script
 *
 * Restores database from a backup created by backup-supabase.ts
 * DESTRUCTIVE OPERATION - Use with caution!
 *
 * Usage:
 *   node scripts/restore-supabase.ts 2025-01-15
 *   node scripts/restore-supabase.ts 2025-01-15 --dry-run
 *
 * Environment variables required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SECRET_KEY - Secret key (NOT publishable key)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Configuration
const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Table restore order (respecting foreign key dependencies)
const TABLE_RESTORE_ORDER = [
  // Foundation (no dependencies)
  'profiles',
  'strength_definitions',

  // Core data (depends on profiles)
  'folders',
  'notes',
  'tasks',
  'journal_entries',
  'health_metrics',
  'workouts',
  'meditation_logs',
  'calendar_events',
  'integration_tokens',

  // Relational data (depends on core)
  'ai_context_collections',
  'ai_context_notes',
  'ai_conversations',
  'ai_messages',
  'ai_insights',
  'strength_assessments',
  'executive_function_scores',
  'self_compassion_scores',
  'strengths_responses',
  'values_alignment_results',
  'assessment_insights',
  'assessment_reminders',
  'meeting_notes',
  'time_blocks',
  'folder_views',
  'folder_templates',
  'about_me_files',
  'agent_instructions',

  // Logging/Audit (least critical)
  'cue_rules',
  'cue_instances',
  'audit_log',
  'sync_log',
  'token_usage',
  'token_usage_daily',
  'computed_patterns',
  'context_summaries',
  'daily_commitments',
  'ai_response_cache'
];

// Validate environment variables
const validateEnv = (): void => {
  if (!process.env.SUPABASE_URL) {
    console.error('ERROR: SUPABASE_URL environment variable is required');
    process.exit(1);
  }
  if (!process.env.SUPABASE_SECRET_KEY) {
    console.error('ERROR: SUPABASE_SECRET_KEY environment variable is required');
    process.exit(1);
  }
};

// Create Supabase client with secret key (bypasses RLS)
const createSupabaseClient = () => {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

// Prompt user for confirmation
const promptConfirmation = (message: string): Promise<boolean> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
};

// Restore a single table
const restoreTable = async (
  supabase: ReturnType<typeof createClient>,
  tableName: string,
  backupDir: string,
  dryRun: boolean
): Promise<{ success: boolean; rowsRestored: number; error?: string }> => {
  console.log(`  Restoring table: ${tableName}...`);

  try {
    const filePath = path.join(backupDir, `${tableName}.json`);

    if (!fs.existsSync(filePath)) {
      console.log(`    ⚠️  Backup file not found: ${tableName}.json (skipping)`);
      return { success: true, rowsRestored: 0 };
    }

    // Read backup data
    const backupData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (!Array.isArray(backupData) || backupData.length === 0) {
      console.log(`    ⚠️  No data in backup for ${tableName} (empty table)`);
      return { success: true, rowsRestored: 0 };
    }

    if (dryRun) {
      console.log(`    [DRY RUN] Would restore ${backupData.length} rows`);
      return { success: true, rowsRestored: backupData.length };
    }

    // Step 1: Delete existing data (CASCADE will handle dependencies)
    console.log(`    Deleting existing data...`);
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (deleteError) {
      console.error(`    Error deleting from ${tableName}:`, deleteError.message);
      return { success: false, rowsRestored: 0, error: deleteError.message };
    }

    // Step 2: Insert backup data in batches
    console.log(`    Inserting ${backupData.length} rows...`);
    const batchSize = 500;
    let totalInserted = 0;

    for (let i = 0; i < backupData.length; i += batchSize) {
      const batch = backupData.slice(i, i + batchSize);

      const { error: insertError } = await supabase
        .from(tableName)
        .insert(batch);

      if (insertError) {
        console.error(`    Error inserting into ${tableName}:`, insertError.message);
        return { success: false, rowsRestored: totalInserted, error: insertError.message };
      }

      totalInserted += batch.length;
    }

    console.log(`    ✓ Restored ${totalInserted} rows`);
    return { success: true, rowsRestored: totalInserted };

  } catch (err: any) {
    console.error(`    Error restoring ${tableName}:`, err.message);
    return { success: false, rowsRestored: 0, error: err.message };
  }
};

// Main restore function
const runRestore = async (backupDate: string, dryRun: boolean): Promise<void> => {
  console.log('=== Chrononaut Database Restore ===\n');

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  // Validate environment
  validateEnv();

  // Check if backup exists
  const backupDir = path.join(BACKUP_DIR, backupDate);
  if (!fs.existsSync(backupDir)) {
    console.error(`ERROR: Backup not found for date ${backupDate}`);
    console.error(`Expected directory: ${backupDir}`);
    process.exit(1);
  }

  // Read metadata
  const metadataPath = path.join(backupDir, 'backup-metadata.json');
  if (!fs.existsSync(metadataPath)) {
    console.error(`ERROR: Backup metadata not found: ${metadataPath}`);
    process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  console.log(`Backup date: ${metadata.backupDate}`);
  console.log(`Backup timestamp: ${metadata.timestamp}`);
  console.log(`Schema version: ${metadata.schemaVersion}`);
  console.log(`Total tables: ${metadata.totalTables}`);
  console.log(`Total rows: ${metadata.totalRows}\n`);

  // Warning and confirmation
  if (!dryRun) {
    console.log('⚠️  WARNING: This is a DESTRUCTIVE operation!');
    console.log('⚠️  All existing data will be DELETED and replaced with the backup.');
    console.log('');

    const confirmed = await promptConfirmation('Are you sure you want to continue?');
    if (!confirmed) {
      console.log('\nRestore cancelled.');
      process.exit(0);
    }
    console.log('');
  }

  // Create Supabase client
  const supabase = createSupabaseClient();
  console.log('✓ Connected to Supabase\n');

  // Get list of tables to restore (from backup directory)
  const tablesToRestore = TABLE_RESTORE_ORDER.filter((table) => {
    const filePath = path.join(backupDir, `${table}.json`);
    return fs.existsSync(filePath);
  });

  console.log(`Tables to restore: ${tablesToRestore.length}\n`);

  // Restore each table in order
  console.log('Restoring tables:\n');
  const results: Record<string, { success: boolean; rowsRestored: number; error?: string }> = {};

  for (const table of tablesToRestore) {
    results[table] = await restoreTable(supabase, table, backupDir, dryRun);

    if (!results[table].success) {
      console.error(`\n⚠️  Failed to restore ${table}. Stopping restore.`);
      console.error('Database may be in an inconsistent state!');
      process.exit(1);
    }
  }

  // Verify row counts
  console.log('\n=== Restore Summary ===');
  let totalRestored = 0;
  let mismatches = 0;

  for (const table of tablesToRestore) {
    const restored = results[table]?.rowsRestored || 0;
    const expected = metadata.tables[table]?.rowCount || 0;

    totalRestored += restored;

    if (restored !== expected) {
      console.log(`⚠️  ${table}: restored ${restored} rows (expected ${expected})`);
      mismatches++;
    }
  }

  console.log(`\nTotal rows restored: ${totalRestored}`);
  console.log(`Expected rows: ${metadata.totalRows}`);

  if (mismatches > 0) {
    console.log(`\n⚠️  ${mismatches} table(s) had row count mismatches`);
  }

  if (dryRun) {
    console.log('\n✓ Dry run completed successfully!');
    console.log('Run without --dry-run to perform actual restore.');
  } else {
    console.log('\n✓ Restore completed successfully!');
  }
};

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/restore-supabase.ts <backup-date> [--dry-run]');
  console.error('Example: node scripts/restore-supabase.ts 2025-01-15');
  process.exit(1);
}

const backupDate = args[0];
const dryRun = args.includes('--dry-run');

// Validate date format
if (!/^\d{4}-\d{2}-\d{2}$/.test(backupDate)) {
  console.error('ERROR: Invalid date format. Use YYYY-MM-DD');
  process.exit(1);
}

// Run the restore
runRestore(backupDate, dryRun).catch((error) => {
  console.error('Fatal error during restore:', error);
  process.exit(1);
});
