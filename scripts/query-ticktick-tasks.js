#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

console.log('📋 Querying TickTick Tasks...\n');

const { data: tasks, error } = await supabase
  .from('tasks')
  .select('*')
  .order('updated_at', { ascending: false })
  .limit(5);

if (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

console.log(`✅ Found ${tasks?.length || 0} tasks\n`);

if (!tasks || tasks.length === 0) {
  console.log('⚠️  No tasks found.');
  process.exit(0);
}

// Show TickTick-specific fields
console.log('📊 TickTick Fields Captured:\n');
console.log('Fields in tasks table:');
const firstTask = tasks[0];
const ticktickFields = [
  'ticktick_id',
  'ticktick_list_id', 
  'ticktick_list_name',
  'ticktick_section_name',
  'sync_status',
  'last_synced_at'
];

ticktickFields.forEach(field => {
  const value = firstTask[field];
  console.log(`  ${field}: ${value !== null && value !== undefined ? JSON.stringify(value) : 'null'}`);
});

console.log('\n📝 Sample Tasks:\n');
tasks.forEach((task, i) => {
  console.log(`${i + 1}. ${task.title}`);
  console.log(`   TickTick ID: ${task.ticktick_id || 'N/A'}`);
  console.log(`   List: ${task.ticktick_list_name || task.ticktick_list_id || 'N/A'}`);
  console.log(`   Section: ${task.ticktick_section_name || 'N/A'}`);
  console.log(`   Priority: ${task.priority}`);
  console.log(`   Due: ${task.due_date || 'None'}`);
  console.log(`   Completed: ${task.completed}`);
  console.log(`   Last Synced: ${task.last_synced_at || 'Never'}`);
  console.log('');
});
