import { useState, useCallback } from "react";
import { fjLog } from "@/utils/dataSafety";

export type SyncStatus = "idle" | "syncing" | "success" | "error";

/**
 * Standardized hook for data synchronization status across the app.
 * Enforces syncing/success/error flow with auditable logging.
 */
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastAction, setLastAction] = useState<{ type: string; timestamp: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateStatus = useCallback((newStatus: SyncStatus, actionType?: string, error?: any) => {
    setStatus(newStatus);
    
    if (newStatus === "syncing") {
      setErrorMessage(null);
      fjLog("SYNC", `Action started: ${actionType || "unknown"}`);
    }

    if (newStatus === "success" && actionType) {
      setLastAction({
        type: actionType,
        timestamp: new Date().toISOString()
      });
      fjLog("SYNC", `Action success: ${actionType}`);
    }
    
    if (newStatus === "error") {
      const msg = error?.message || error || "Unknown error";
      setErrorMessage(msg);
      fjLog("CRITICAL", `Action failed: ${actionType || "unknown"}`, { error });
    }
  }, []);

  return {
    status,
    lastAction,
    errorMessage,
    updateStatus,
    isSyncing: status === "syncing",
    isError: status === "error",
    isSuccess: status === "success"
  };
}