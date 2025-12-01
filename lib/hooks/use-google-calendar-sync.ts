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
        // Handle different error cases
        let errorMessage = "Sync failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || `HTTP ${response.status}`;
          console.warn("Google Calendar sync failed:", errorMessage);
        } catch {
          // Response wasn't JSON
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          console.warn("Google Calendar sync failed (non-JSON response):", errorMessage);
        }
        
        // Don't treat "not connected" as a hard error
        if (response.status === 400) {
          setIsConnected(false);
          return { success: false, errors: ["Google Calendar not connected"] };
        }
        
        return { success: false, errors: [errorMessage] };
      }

      const result: SyncResult = await response.json();
      setLastSyncedAt(new Date());
      setIsConnected(true);
      
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
