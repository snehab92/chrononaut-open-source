"use client";

import { useEffect, useCallback, useRef } from "react";
import { useGoogleCalendarSync } from "@/lib/hooks/use-google-calendar-sync";
import { useWhoopSync } from "@/lib/hooks/use-whoop-sync";
import { useTaskContext } from "./task-context";
import { useCalendarContext } from "./calendar-context";
import { RefreshCw } from "lucide-react";

/**
 * CombinedSyncStatus - Handles sync for Google Calendar and Whoop
 *
 * - 60-second polling for Google Calendar
 * - Manual sync for Whoop
 * - Sync on page focus
 * - Sync on mount
 */
export function CombinedSyncStatus() {
  const gcal = useGoogleCalendarSync();
  const whoop = useWhoopSync();

  const { refreshTasks } = useTaskContext();
  const { refreshEvents } = useCalendarContext();

  const initialSyncDone = useRef(false);

  // Combined sync function
  const syncAll = useCallback(async (
    trigger: string = "manual",
    options?: { forceGcal?: boolean; forceWhoop?: boolean }
  ) => {
    const shouldSyncGcal = options?.forceGcal || gcal.isConnected;
    const shouldSyncWhoop = options?.forceWhoop || whoop.isConnected;

    const results = await Promise.allSettled([
      shouldSyncGcal ? gcal.manualSync(trigger) : Promise.resolve(null),
      shouldSyncWhoop ? whoop.manualSync() : Promise.resolve(null),
    ]);

    // Refresh data after sync
    await Promise.allSettled([
      refreshTasks(),
      refreshEvents(),
    ]);

    return results;
  }, [gcal, whoop, refreshTasks, refreshEvents]);

  // Initial connection check and sync on mount
  useEffect(() => {
    if (initialSyncDone.current) return;

    const initSync = async () => {
      initialSyncDone.current = true;

      // Check connections
      const [gcalConnected, whoopConnected] = await Promise.all([
        gcal.checkConnection(),
        whoop.checkConnection(),
      ]);

      // Small delay for page render, then sync
      setTimeout(async () => {
        if (gcalConnected || whoopConnected) {
          await syncAll("initial", {
            forceGcal: gcalConnected,
            forceWhoop: whoopConnected,
          });
        }
      }, 500);
    };

    initSync();
  }, [gcal.checkConnection, whoop.checkConnection, syncAll]);

  // 60-second polling (Google Calendar only - Whoop is manual only)
  useEffect(() => {
    if (!gcal.isConnected) return;

    const interval = setInterval(async () => {
      console.log("Scheduled sync - 60s interval");
      await syncAll("scheduled");
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [gcal.isConnected, syncAll]);

  // Sync on page focus
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        const hasConnections = gcal.isConnected || whoop.isConnected;
        if (hasConnections) {
          console.log("Page focused - triggering sync");
          await syncAll("page_focus");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [gcal.isConnected, whoop.isConnected, syncAll]);

  // Determine overall sync state
  const isSyncing = gcal.isSyncing || whoop.isSyncing;
  const lastSyncedAt = getLatestDate(gcal.lastSyncedAt, whoop.lastSyncedAt);
  const hasAnyConnection = gcal.isConnected || whoop.isConnected;

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
