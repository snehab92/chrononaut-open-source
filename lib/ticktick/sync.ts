/**
 * TickTick Sync Engine
 * 
 * Handles bidirectional sync between TickTick and Supabase tasks table.
 * 
 * Sync Strategy:
 * - Pull: Fetch all tasks from TickTick, upsert to Supabase
 * - Push: When local changes occur, push to TickTick
 * - Conflicts: Last-write-wins based on modifiedTime
 * 
 * Sync Status:
 * - 'synced': Local and remote are in sync
 * - 'pending_push': Local change needs to push to TickTick
 * - 'pending_pull': Remote change needs to pull to local
 * - 'conflict': Both changed, needs resolution
 * - 'error': Sync failed, needs retry
 */

import { TickTickClient, TickTickTask } from './client';
import { createClient } from '@/lib/supabase/server';

// Types
export type SyncStatus = 'synced' | 'pending_push' | 'pending_pull' | 'conflict' | 'error';
export type TriggerType = 'manual' | 'scheduled' | 'page_focus' | 'action' | 'user_action' | 'initial_connect';
export type SyncTrigger = TriggerType; // Alias for API route compatibility

export interface LocalTask {
  id: string;
  user_id: string;
  ticktick_id: string | null;
  ticktick_list_id: string | null;
  sync_status: SyncStatus;
  last_synced_at: string | null;
  title: string;
  content: string | null;
  priority: number;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface SyncResult {
  success: boolean;
  pulled: number;
  pushed: number;
  conflicts: number;
  errors: string[];
  logId?: string;
}

/**
 * Log sync operation start
 */
async function logSyncStart(
  userId: string,
  direction: 'pull' | 'push' | 'both',
  triggerType: TriggerType
): Promise<string | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('sync_log')
    .insert({
      user_id: userId,
      provider: 'ticktick',
      direction,
      trigger_type: triggerType,
      status: 'started',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create sync log:', error);
    return null;
  }
  
  return data.id;
}

/**
 * Log sync operation completion
 */
async function logSyncComplete(
  logId: string | null,
  result: SyncResult,
  startTime: number
): Promise<void> {
  if (!logId) return;
  
  const supabase = await createClient();
  const duration = Date.now() - startTime;
  
  await supabase
    .from('sync_log')
    .update({
      status: result.success ? 'success' : (result.errors.length > 0 ? 'partial' : 'failed'),
      pulled_count: result.pulled,
      pushed_count: result.pushed,
      conflict_count: result.conflicts,
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      error_message: result.errors.length > 0 ? result.errors[0] : null,
      error_details: result.errors.length > 0 ? { errors: result.errors } : {},
    })
    .eq('id', logId);
}

/**
 * Pull tasks from TickTick and sync to Supabase
 * This is the main "import" direction
 */
export async function pullTasksFromTickTick(
  userId: string,
  client: TickTickClient,
  triggerType: TriggerType = 'manual'
): Promise<SyncResult> {
  const startTime = Date.now();
  const logId = await logSyncStart(userId, 'pull', triggerType);
  
  const supabase = await createClient();
  const result: SyncResult = {
    success: true,
    pulled: 0,
    pushed: 0,
    conflicts: 0,
    errors: [],
    logId: logId || undefined,
  };

  try {
    // 1. Fetch all tasks from TickTick
    const ticktickData = await client.getAllTasks();
    const remoteTasks = ticktickData.syncTaskBean.update;

    // 2. Get existing local tasks with ticktick_ids
    const { data: localTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .not('ticktick_id', 'is', null);

    if (fetchError) {
      result.errors.push(`Failed to fetch local tasks: ${fetchError.message}`);
      result.success = false;
      await logSyncComplete(logId, result, startTime);
      return result;
    }

    // Create lookup map of local tasks by ticktick_id
    const localTaskMap = new Map<string, LocalTask>();
    (localTasks || []).forEach((task: LocalTask) => {
      if (task.ticktick_id) {
        localTaskMap.set(task.ticktick_id, task);
      }
    });

    // 3. Process each remote task
    for (const remoteTask of remoteTasks) {
      try {
        const localTask = localTaskMap.get(remoteTask.id);
        
        if (!localTask) {
          // NEW: Task doesn't exist locally, create it
          const { error: insertError } = await supabase
            .from('tasks')
            .insert({
              user_id: userId,
              ticktick_id: remoteTask.id,
              ticktick_list_id: remoteTask.projectId,
              title: remoteTask.title,
              content: remoteTask.content || remoteTask.desc || null,
              priority: mapTickTickPriority(remoteTask.priority),
              due_date: remoteTask.dueDate || null,
              completed: remoteTask.status === 2,
              completed_at: remoteTask.status === 2 ? new Date().toISOString() : null,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            });

          if (insertError) {
            result.errors.push(`Failed to insert task ${remoteTask.id}: ${insertError.message}`);
          } else {
            result.pulled++;
          }
        } else {
          // EXISTS: Check for conflicts using last-write-wins
          const remoteModified = new Date(remoteTask.modifiedTime || 0);
          const localModified = new Date(localTask.updated_at);

          if (localTask.sync_status === 'pending_push') {
            // Local has pending changes - check if remote is newer
            if (remoteModified > localModified) {
              // Remote wins - conflict, but we use last-write-wins
              result.conflicts++;
              // Update local with remote data
              await updateLocalFromRemote(supabase, localTask.id, remoteTask);
              result.pulled++;
            }
            // Otherwise local wins - we'll push later
          } else {
            // No pending local changes - safe to update from remote
            const needsUpdate = hasRemoteChanges(localTask, remoteTask);
            
            if (needsUpdate) {
              await updateLocalFromRemote(supabase, localTask.id, remoteTask);
              result.pulled++;
            }
          }
        }
      } catch (taskError) {
        result.errors.push(`Error processing task ${remoteTask.id}: ${String(taskError)}`);
      }
    }

    // 4. Mark tasks deleted in TickTick (exist locally but not in remote)
    const remoteTaskIds = new Set(remoteTasks.map((t: TickTickTask) => t.id));
    for (const [ticktickId, localTask] of localTaskMap) {
      if (!remoteTaskIds.has(ticktickId) && !localTask.completed) {
        // Task was deleted in TickTick (or completed there)
        // Mark as completed locally rather than deleting
        await supabase
          .from('tasks')
          .update({ 
            completed: true, 
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', localTask.id);
      }
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`Sync failed: ${String(error)}`);
  }

  await logSyncComplete(logId, result, startTime);
  return result;
}

/**
 * Push local changes to TickTick
 * Currently supports: complete task, update due date
 */
export async function pushLocalChanges(
  userId: string,
  client: TickTickClient,
  triggerType: TriggerType = 'manual'
): Promise<SyncResult> {
  const startTime = Date.now();
  const logId = await logSyncStart(userId, 'push', triggerType);
  
  const supabase = await createClient();
  const result: SyncResult = {
    success: true,
    pulled: 0,
    pushed: 0,
    conflicts: 0,
    errors: [],
    logId: logId || undefined,
  };

  try {
    // Get tasks with pending_push status
    const { data: pendingTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('sync_status', 'pending_push')
      .not('ticktick_id', 'is', null);

    if (fetchError) {
      result.errors.push(`Failed to fetch pending tasks: ${fetchError.message}`);
      result.success = false;
      await logSyncComplete(logId, result, startTime);
      return result;
    }

    for (const task of pendingTasks || []) {
      try {
        if (task.completed) {
          // Push completion to TickTick
          await client.completeTask(task.ticktick_list_id, task.ticktick_id);
        }
        // Note: Due date updates are handled immediately in the API route
        // This is for batch sync of accumulated changes

        // Mark as synced
        await supabase
          .from('tasks')
          .update({ 
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', task.id);

        result.pushed++;
      } catch (pushError) {
        result.errors.push(`Failed to push task ${task.id}: ${String(pushError)}`);
        
        // Mark as error
        await supabase
          .from('tasks')
          .update({ sync_status: 'error' })
          .eq('id', task.id);
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`Push failed: ${String(error)}`);
  }

  await logSyncComplete(logId, result, startTime);
  return result;
}

/**
 * Full bidirectional sync
 */
export async function syncTasks(
  userId: string,
  client: TickTickClient,
  triggerType: TriggerType = 'manual'
): Promise<SyncResult> {
  const startTime = Date.now();
  const logId = await logSyncStart(userId, 'both', triggerType);
  
  // Pull first (get latest from TickTick)
  const pullResult = await pullTasksFromTickTick(userId, client, triggerType);
  
  // Then push any local changes
  const pushResult = await pushLocalChanges(userId, client, triggerType);

  const result: SyncResult = {
    success: pullResult.success && pushResult.success,
    pulled: pullResult.pulled,
    pushed: pushResult.pushed,
    conflicts: pullResult.conflicts + pushResult.conflicts,
    errors: [...pullResult.errors, ...pushResult.errors],
    logId: logId || undefined,
  };

  await logSyncComplete(logId, result, startTime);
  return result;
}

/**
 * Mark a local task for sync after local modification
 */
export async function markTaskForSync(taskId: string): Promise<void> {
  const supabase = await createClient();
  
  await supabase
    .from('tasks')
    .update({ 
      sync_status: 'pending_push',
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId);
}

// Helper functions

function mapTickTickPriority(ticktickPriority: number): number {
  // TickTick: 0=none, 1=low, 3=medium, 5=high
  // Local: 0=none, 1=low, 2=medium, 3=high, 4=urgent
  switch (ticktickPriority) {
    case 5: return 3; // high
    case 3: return 2; // medium
    case 1: return 1; // low
    default: return 0; // none
  }
}

function hasRemoteChanges(local: LocalTask, remote: TickTickTask): boolean {
  return (
    local.title !== remote.title ||
    local.completed !== (remote.status === 2) ||
    local.due_date !== remote.dueDate ||
    mapTickTickPriority(remote.priority) !== local.priority
  );
}

async function updateLocalFromRemote(
  supabase: any,
  localTaskId: string,
  remote: TickTickTask
): Promise<void> {
  await supabase
    .from('tasks')
    .update({
      title: remote.title,
      content: remote.content || remote.desc || null,
      priority: mapTickTickPriority(remote.priority),
      due_date: remote.dueDate || null,
      completed: remote.status === 2,
      completed_at: remote.status === 2 ? new Date().toISOString() : null,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
    })
    .eq('id', localTaskId);
}
