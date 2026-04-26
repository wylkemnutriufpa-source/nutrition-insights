import { useState, useCallback, useEffect } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle, Loader2, History, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { clearRuntimeCaches, forceHardReload } from "@/lib/pwaUpdate";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SyncHistoryItem {
  timestamp: string;
  status: "success" | "error";
  message: string;
}

export default function SyncButton({ variant = "ghost", size = "icon" }: { variant?: "ghost" | "outline" | "default"; size?: "icon" | "sm" | "default" }) {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [lastSync, setLastSync] = useState<string | null>(() => localStorage.getItem("last_sync_time"));
  const [history, setHistory] = useState<SyncHistoryItem[]>(() => {
    const saved = localStorage.getItem("sync_history");
    return saved ? JSON.parse(saved) : [];
  });
  
  const queryClient = useQueryClient();

  useEffect(() => {
    if (lastSync) localStorage.setItem("last_sync_time", lastSync);
    localStorage.setItem("sync_history", JSON.stringify(history.slice(0, 5)));
  }, [lastSync, history]);

  const addHistory = (status: "success" | "error", message: string) => {
    const now = new Date().toISOString();
    const newItem: SyncHistoryItem = { timestamp: now, status, message };
    setHistory(prev => [newItem, ...prev].slice(0, 5));
    if (status === "success") setLastSync(now);
  };

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
      addHistory("success", "Sincronização completa");
      toast.success("Dados sincronizados e cache limpo!");
      
      // 3. Hard reload to ensure fresh start (optional but recommended for "clear cache")
      setTimeout(() => {
        forceHardReload();
      }, 1500);
    } catch (err) {
      console.error("[Sync] Failed:", err);
      setStatus("error");
      addHistory("error", "Erro ao limpar cache");
      toast.error("Erro ao sincronizar dados. Tente novamente.");
      setSyncing(false);
    }
  }, [syncing, queryClient]);

  const formatTime = (dateStr: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(dateStr));
  };

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={`relative transition-all ${syncing ? "text-primary" : ""} ${status === "success" ? "text-emerald-500" : ""} ${status === "error" ? "text-destructive" : ""}`}
            title="Sincronizar dados e histórico"
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
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-3" align="end">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
              <History className="w-3.5 h-3.5" /> Sincronização
            </h4>
            {lastSync && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatTime(lastSync)}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handleSync} 
              disabled={syncing} 
              className="w-full h-8 text-xs gradient-primary"
            >
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
              Sincronizar Agora
            </Button>

            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] font-medium text-muted-foreground">Histórico recente:</p>
              {history.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic text-center py-2">Sem registros</p>
              ) : (
                <div className="space-y-1.5">
                  {history.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-[10px] border-l-2 pl-2 py-0.5" 
                      style={{ borderLeftColor: item.status === "success" ? "rgb(16 185 129)" : "rgb(239 68 68)" }}>
                      <div className="flex-1">
                        <p className="font-medium">{item.message}</p>
                        <p className="text-[9px] opacity-60">{formatTime(item.timestamp)}</p>
                      </div>
                      {item.status === "success" ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <AnimatePresence>
        {syncing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-12 right-4 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-[10px] font-bold shadow-xl z-50 flex items-center gap-2"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Atualizando sistema...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
