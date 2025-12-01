/**
 * useWhoopSync - Client-side Whoop sync hook
 *
 * Features:
 * - Manual sync trigger
 * - Connection status tracking
 * - Sync status for UI feedback
 */

'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface WhoopSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  lastSyncResult: {
    success: boolean;
    healthMetrics: number;
    workouts: number;
  } | null;
  error: string | null;
}

export function useWhoopSync() {
  const [syncState, setSyncState] = useState<WhoopSyncState>({
    isConnected: false,
    isSyncing: false,
    lastSyncedAt: null,
    lastSyncResult: null,
    error: null,
  });

  // Check if Whoop is connected
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
      .eq('provider', 'whoop')
      .single();

    const connected = !!token;
    setSyncState(prev => ({ ...prev, isConnected: connected }));
    return connected;
  }, []);

  // Manual sync
  const manualSync = useCallback(async () => {
    setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const response = await fetch('/api/integrations/whoop/sync', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: new Date(),
        lastSyncResult: {
          success: data.success,
          healthMetrics: data.synced?.healthMetrics || 0,
          workouts: data.synced?.workouts || 0,
        },
        error: data.errors ? data.errors.join(', ') : null,
      }));

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  return {
    ...syncState,
    checkConnection,
    manualSync,
  };
}
