import { useState, useCallback } from "react";

export type SyncStatus = "idle" | "syncing" | "success" | "error";

/**
 * Standardized hook for data synchronization status across the app.
 */
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastAction, setLastAction] = useState<{ type: string; timestamp: string } | null>(null);

  const updateStatus = useCallback((newStatus: SyncStatus, actionType?: string) => {
    setStatus(newStatus);
    if (newStatus === "success" && actionType) {
      setLastAction({
        type: actionType,
        timestamp: new Date().toISOString()
      });
    }
  }, []);

  return {
    status,
    lastAction,
    updateStatus,
    isSyncing: status === "syncing",
    isError: status === "error",
    isSuccess: status === "success"
  };
}
