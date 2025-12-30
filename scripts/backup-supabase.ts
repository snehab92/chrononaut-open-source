#!/usr/bin/env node
/**
 * Supabase Database Backup Script
 *
 * Exports all 32 Supabase tables to JSON format with metadata.
 * Preserves E2E encrypted fields as-is (ciphertext).
 *
 * Usage:
 *   node scripts/backup-supabase.ts
 *
 * Environment variables required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SECRET_KEY - Secret key (NOT publishable key)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const BATCH_SIZE = 1000; // Rows per query (pagination)
const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Get today's date in YYYY-MM-DD format
const getBackupDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

// Get all table names from information_schema
const getAllTables = async (supabase: ReturnType<typeof createClient>): Promise<string[]> => {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');

  if (error) {
    console.error('Error fetching table list:', error);
    throw error;
  }

  // Filter out migration-related tables and views
  const tables = (data || [])
    .map((row: any) => row.table_name)
    .filter((name: string) => {
      return !name.startsWith('supabase_') &&
             !name.startsWith('pg_') &&
             name !== 'schema_migrations';
    });

  return tables;
};

// Export a single table to JSON
const exportTable = async (
  supabase: ReturnType<typeof createClient>,
  tableName: string,
  outputDir: string
): Promise<{ rowCount: number; error?: string }> => {
  console.log(`  Exporting table: ${tableName}...`);

  try {
    let allRows: any[] = [];
    let offset = 0;
    let hasMore = true;

    // Paginate through all rows
    while (hasMore) {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        console.error(`    Error querying ${tableName}:`, error.message);
        return { rowCount: 0, error: error.message };
      }

      if (data && data.length > 0) {
        allRows = allRows.concat(data);
        offset += BATCH_SIZE;

        // Check if we've fetched all rows
        if (data.length < BATCH_SIZE) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    // Write to JSON file
    const filePath = path.join(outputDir, `${tableName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(allRows, null, 2));

    console.log(`    ✓ Exported ${allRows.length} rows to ${tableName}.json`);
    return { rowCount: allRows.length };

  } catch (err: any) {
    console.error(`    Error exporting ${tableName}:`, err.message);
    return { rowCount: 0, error: err.message };
  }
};

// Get schema version from migrations
const getSchemaVersion = async (supabase: ReturnType<typeof createClient>): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('supabase_migrations')
      .select('version')
      .order('version', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return 'unknown';
    }

    return data[0].version;
  } catch (err) {
    return 'unknown';
  }
};

// Main backup function
const runBackup = async (): Promise<void> => {
  console.log('=== Chrononaut Database Backup ===\n');

  // Validate environment
  validateEnv();

  // Create Supabase client
  const supabase = createSupabaseClient();
  console.log('✓ Connected to Supabase\n');

  // Create backup directory
  const backupDate = getBackupDate();
  const outputDir = path.join(BACKUP_DIR, backupDate);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Backup directory: ${outputDir}\n`);

  // Get all tables
  console.log('Discovering tables...');
  const tables = await getAllTables(supabase);
  console.log(`✓ Found ${tables.length} tables\n`);

  // Get schema version
  const schemaVersion = await getSchemaVersion(supabase);

  // Export each table
  console.log('Exporting tables:\n');
  const results: Record<string, { rowCount: number; error?: string }> = {};

  for (const table of tables) {
    results[table] = await exportTable(supabase, table, outputDir);
  }

  // Create metadata file
  const metadata = {
    backupDate,
    timestamp: new Date().toISOString(),
    schemaVersion,
    totalTables: tables.length,
    tables: results,
    totalRows: Object.values(results).reduce((sum, r) => sum + r.rowCount, 0),
    errors: Object.entries(results)
      .filter(([_, r]) => r.error)
      .map(([table, r]) => ({ table, error: r.error }))
  };

  const metadataPath = path.join(outputDir, 'backup-metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  // Print summary
  console.log('\n=== Backup Summary ===');
  console.log(`Date: ${backupDate}`);
  console.log(`Schema version: ${schemaVersion}`);
  console.log(`Tables exported: ${tables.length}`);
  console.log(`Total rows: ${metadata.totalRows}`);

  if (metadata.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered:`);
    metadata.errors.forEach(({ table, error }) => {
      console.log(`  - ${table}: ${error}`);
    });
  } else {
    console.log('\n✓ Backup completed successfully!');
  }

  console.log(`\nBackup saved to: ${outputDir}`);
};

// Run the backup
runBackup().catch((error) => {
  console.error('Fatal error during backup:', error);
  process.exit(1);
});
