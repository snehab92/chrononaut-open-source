"use client";

import { useEffect } from "react";
import { useTickTickSync } from "@/lib/hooks/use-ticktick-sync";
import { RefreshCw } from "lucide-react";

interface SyncProviderProps {
  children: React.ReactNode;
}

/**
 * SyncProvider - Wraps dashboard with background sync functionality
 * 
 * Features:
 * - Triggers initial sync on mount (if connected)
 * - Shows sync status indicator
 * - Handles 60-sec polling and page focus sync via hook
 */
export function SyncProvider({ children }: SyncProviderProps) {
  const { 
    isConnected, 
    isSyncing, 
    lastSyncedAt, 
    manualSync,
    checkConnection 
  } = useTickTickSync();

  // Initial sync on mount
  useEffect(() => {
    const initSync = async () => {
      const connected = await checkConnection();
      if (connected) {
        // Small delay to let page render first
        setTimeout(() => {
          manualSync();
        }, 500);
      }
    };
    
    initSync();
  }, [checkConnection, manualSync]);

  return (
    <div className="relative">
      {/* Sync status indicator - top right */}
      {isConnected && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => manualSync()}
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
      )}
      
      {children}
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
