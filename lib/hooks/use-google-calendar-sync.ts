"use client";

import { useState, useCallback, useRef } from "react";

interface SyncResult {
  success: boolean;
  synced?: {
    pulled: number;
    updated: number;
    deleted: number;
  };
  errors?: string[];
}

export function useGoogleCalendarSync() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const syncInProgressRef = useRef(false);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/integrations/google/sync");
      const connected = response.ok;
      setIsConnected(connected);
      return connected;
    } catch {
      setIsConnected(false);
      return false;
    }
  }, []);

  const manualSync = useCallback(async (trigger: string = "manual"): Promise<SyncResult | null> => {
    // Prevent concurrent syncs
    if (syncInProgressRef.current) {
      console.log("Google Calendar sync already in progress, skipping");
      return null;
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      const response = await fetch(`/api/integrations/google/sync?trigger=${trigger}`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Google Calendar sync failed:", error);
        return { success: false, errors: [error.error || "Sync failed"] };
      }

      const result: SyncResult = await response.json();
      setLastSyncedAt(new Date());
      
      console.log("Google Calendar sync complete:", result.synced);
      return result;
    } catch (error) {
      console.error("Google Calendar sync error:", error);
      return { success: false, errors: [String(error)] };
    } finally {
      setIsSyncing(false);
      syncInProgressRef.current = false;
    }
  }, []);

  return {
    isConnected,
    isSyncing,
    lastSyncedAt,
    checkConnection,
    manualSync,
  };
}
