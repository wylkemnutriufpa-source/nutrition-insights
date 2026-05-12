import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw, Check, AlertTriangle } from "lucide-react";
import { offlineQueue, type SyncStatus } from "@v1/lib/offlineSync";
import { Button } from "@v1/components/ui/button";

export default function OfflineSyncBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [pendingCount, setPendingCount] = useState(offlineQueue.getPendingCount());
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const unsub = offlineQueue.subscribe((status, pending) => {
      setSyncStatus(status);
      setPendingCount(pending);
      if (status === "idle" && pending === 0) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 3000);
      }
    });

    // Check pending on mount
    setPendingCount(offlineQueue.getPendingCount());

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsub();
    };
  }, []);

  const handleManualSync = async () => {
    await offlineQueue.sync();
  };

  const showBanner = !isOnline || pendingCount > 0 || syncStatus === "syncing" || justSynced;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className={`flex items-center justify-between px-4 py-2 text-xs font-medium rounded-lg mx-4 mt-2 ${
            !isOnline
              ? "bg-warning/10 text-warning border border-warning/20"
              : syncStatus === "syncing"
              ? "bg-primary/10 text-primary border border-primary/20"
              : syncStatus === "error"
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : justSynced
              ? "bg-success/10 text-success border border-success/20"
              : "bg-muted text-muted-foreground border border-border"
          }`}>
            <div className="flex items-center gap-2">
              {!isOnline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Modo offline — {pendingCount} {pendingCount === 1 ? "ação pendente" : "ações pendentes"}</span>
                </>
              ) : syncStatus === "syncing" ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sincronizando...</span>
                </>
              ) : syncStatus === "error" ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{pendingCount} {pendingCount === 1 ? "ação" : "ações"} não sincronizada(s)</span>
                </>
              ) : justSynced ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Tudo sincronizado!</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{pendingCount} pendente(s)</span>
                </>
              )}
            </div>
            {isOnline && pendingCount > 0 && syncStatus !== "syncing" && (
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={handleManualSync}>
                Sincronizar
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
