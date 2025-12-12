"use client";

import { useEffect } from "react";
import { useTickTickSync } from "@/lib/hooks/use-ticktick-sync";
import { useTaskContext } from "./task-context";
import { RefreshCw } from "lucide-react";

/**
 * SyncStatus - Shows sync indicator and handles background sync
 * 
 * Must be used inside TaskProvider to refresh tasks after sync
 */
export function SyncStatus() {
  const { 
    isConnected, 
    isSyncing, 
    lastSyncedAt, 
    manualSync,
    checkConnection 
  } = useTickTickSync();
  
  const { refreshTasks } = useTaskContext();

  // Wrap manualSync to refresh tasks after
  const syncAndRefresh = async () => {
    const result = await manualSync();
    if (result?.success) {
      await refreshTasks();
    }
    return result;
  };

  // Initial sync on mount
  useEffect(() => {
    const initSync = async () => {
      const connected = await checkConnection();
      if (connected) {
        // Small delay to let page render first
        setTimeout(async () => {
          await manualSync();
          await refreshTasks();
        }, 500);
      }
    };
    
    initSync();
  }, [checkConnection, manualSync, refreshTasks]);

  // Set up polling that refreshes tasks
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(async () => {
      console.log('Scheduled sync - 60s interval');
      await manualSync();
      await refreshTasks();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [isConnected, manualSync, refreshTasks]);

  // Sync on page focus
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isConnected) {
        console.log('Page focused - triggering sync');
        await manualSync();
        await refreshTasks();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isConnected, manualSync, refreshTasks]);

  if (!isConnected) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={syncAndRefresh}
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
