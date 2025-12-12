"use client";

import { useEffect, useCallback, useRef } from "react";
import { useTickTickSync } from "@/lib/hooks/use-ticktick-sync";
import { useGoogleCalendarSync } from "@/lib/hooks/use-google-calendar-sync";
import { useTaskContext } from "./task-context";
import { useCalendarContext } from "./calendar-context";
import { RefreshCw } from "lucide-react";

/**
 * CombinedSyncStatus - Handles sync for both TickTick and Google Calendar
 * 
 * - 60-second polling for both
 * - Sync on page focus
 * - Sync on mount
 */
export function CombinedSyncStatus() {
  const ticktick = useTickTickSync();
  const gcal = useGoogleCalendarSync();
  
  const { refreshTasks } = useTaskContext();
  const { refreshEvents } = useCalendarContext();
  
  const initialSyncDone = useRef(false);

  // Combined sync function
  const syncAll = useCallback(async (trigger: string = "manual") => {
    const results = await Promise.allSettled([
      ticktick.isConnected ? ticktick.manualSync(trigger) : Promise.resolve(null),
      gcal.isConnected ? gcal.manualSync(trigger) : Promise.resolve(null),
    ]);
    
    // Refresh data after sync
    await Promise.allSettled([
      refreshTasks(),
      refreshEvents(),
    ]);

    return results;
  }, [ticktick, gcal, refreshTasks, refreshEvents]);

  // Initial connection check and sync on mount
  useEffect(() => {
    if (initialSyncDone.current) return;
    
    const initSync = async () => {
      initialSyncDone.current = true;
      
      // Check connections
      const [ticktickConnected, gcalConnected] = await Promise.all([
        ticktick.checkConnection(),
        gcal.checkConnection(),
      ]);

      // Small delay for page render, then sync
      setTimeout(async () => {
        if (ticktickConnected || gcalConnected) {
          await syncAll("initial");
        }
      }, 500);
    };
    
    initSync();
  }, [ticktick.checkConnection, gcal.checkConnection, syncAll]);

  // 60-second polling
  useEffect(() => {
    const hasConnections = ticktick.isConnected || gcal.isConnected;
    if (!hasConnections) return;

    const interval = setInterval(async () => {
      console.log("Scheduled sync - 60s interval");
      await syncAll("scheduled");
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [ticktick.isConnected, gcal.isConnected, syncAll]);

  // Sync on page focus
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        const hasConnections = ticktick.isConnected || gcal.isConnected;
        if (hasConnections) {
          console.log("Page focused - triggering sync");
          await syncAll("page_focus");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [ticktick.isConnected, gcal.isConnected, syncAll]);

  // Determine overall sync state
  const isSyncing = ticktick.isSyncing || gcal.isSyncing;
  const lastSyncedAt = getLatestDate(ticktick.lastSyncedAt, gcal.lastSyncedAt);
  const hasAnyConnection = ticktick.isConnected || gcal.isConnected;

  if (!hasAnyConnection) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => syncAll("manual")}
        disabled={isSyncing}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
          transition-all duration-300
          ${isSyncing 
            ? "bg-[#E8DCC4] text-[#5C7A6B]" 
            : "bg-[#F5F0E6] text-[#8B9A8F] hover:bg-[#E8DCC4] hover:text-[#5C7A6B]"
          }`}
        title={lastSyncedAt ? `Last synced: ${formatLastSync(lastSyncedAt)}` : "Click to sync"}
      >
        <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
        {isSyncing ? "Syncing..." : formatLastSync(lastSyncedAt)}
      </button>
    </div>
  );
}

function getLatestDate(a: Date | null, b: Date | null): Date | null {
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function formatLastSync(date: Date | null): string {
  if (!date) return "Sync";
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
