/**
 * useTickTickSync - Client-side sync hook
 * 
 * Features:
 * - 60-second background polling
 * - Sync on page focus (when returning to tab)
 * - Immediate sync on user actions
 * - Exposes sync status for UI feedback
 */

'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const SYNC_INTERVAL_MS = 60 * 1000; // 60 seconds
const MIN_SYNC_GAP_MS = 5 * 1000; // Prevent sync spam (min 5 sec between syncs)

export interface SyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  lastSyncResult: {
    success: boolean;
    pulled: number;
    pushed: number;
  } | null;
  error: string | null;
}

export function useTickTickSync() {
  const [syncState, setSyncState] = useState<SyncState>({
    isConnected: false,
    isSyncing: false,
    lastSyncedAt: null,
    lastSyncResult: null,
    error: null,
  });

  const lastSyncTime = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if TickTick is connected
  const checkConnection = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setSyncState(prev => ({ ...prev, isConnected: false }));
      return false;
    }

    const { data: token } = await supabase
      .from('integration_tokens')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'ticktick')
      .single();

    const connected = !!token;
    setSyncState(prev => ({ ...prev, isConnected: connected }));
    return connected;
  }, []);

  // Trigger sync via API
  const triggerSync = useCallback(async (trigger: string = 'manual') => {
    // Prevent sync spam
    const now = Date.now();
    if (now - lastSyncTime.current < MIN_SYNC_GAP_MS) {
      console.log('Sync skipped - too soon since last sync');
      return;
    }

    setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));
    lastSyncTime.current = now;

    try {
      const response = await fetch(`/api/integrations/ticktick/sync?trigger=${trigger}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const result = await response.json();

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: new Date(),
        lastSyncResult: {
          success: result.success,
          pulled: result.synced?.pulled || 0,
          pushed: result.synced?.pushed || 0,
        },
        error: result.errors?.length > 0 ? result.errors[0] : null,
      }));

      return result;
    } catch (error) {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: String(error),
      }));
      return null;
    }
  }, []);

  // Sync on page focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && syncState.isConnected) {
        console.log('Page focused - triggering sync');
        triggerSync('page_focus');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [syncState.isConnected, triggerSync]);

  // 60-second polling
  useEffect(() => {
    if (!syncState.isConnected) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start polling
    intervalRef.current = setInterval(() => {
      console.log('Scheduled sync - 60s interval');
      triggerSync('scheduled');
    }, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [syncState.isConnected, triggerSync]);

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Manual sync trigger for UI buttons
  const manualSync = useCallback(() => {
    return triggerSync('manual');
  }, [triggerSync]);

  // Sync after user action (complete task, update due date)
  const syncAfterAction = useCallback(() => {
    return triggerSync('user_action');
  }, [triggerSync]);

  return {
    ...syncState,
    manualSync,
    syncAfterAction,
    checkConnection,
  };
}
