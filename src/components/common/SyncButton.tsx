import { useState, useCallback } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { clearRuntimeCaches, forceHardReload } from "@/lib/pwaUpdate";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

export default function SyncButton({ variant = "ghost", size = "icon" }: { variant?: "ghost" | "outline" | "default"; size?: "icon" | "sm" | "default" }) {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const queryClient = useQueryClient();

  const handleSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setStatus("idle");

    try {
      // 1. Clear React Query cache
      await queryClient.refetchQueries();
      
      // 2. Clear Service Worker/Runtime Caches
      await clearRuntimeCaches();

      setStatus("success");
      toast.success("Dados sincronizados e cache limpo!");
      
      // 3. Hard reload to ensure fresh start (optional but recommended for "clear cache")
      setTimeout(() => {
        forceHardReload();
      }, 1500);
    } catch (err) {
      console.error("[Sync] Failed:", err);
      setStatus("error");
      toast.error("Erro ao sincronizar dados. Tente novamente.");
      setSyncing(false);
    }
  }, [syncing, queryClient]);

  return (
    <div className="relative">
      <Button
        variant={variant}
        size={size}
        onClick={handleSync}
        disabled={syncing}
        className={`relative transition-all ${syncing ? "text-primary" : ""} ${status === "success" ? "text-emerald-500" : ""} ${status === "error" ? "text-destructive" : ""}`}
        title="Sincronizar dados e limpar cache"
      >
        {syncing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : status === "success" ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : status === "error" ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        {size !== "icon" && <span className="ml-2">Sincronizar</span>}
      </Button>

      <AnimatePresence>
        {syncing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-card border border-border px-2 py-1 rounded text-[10px] whitespace-nowrap shadow-lg pointer-events-none"
          >
            Sincronizando...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
