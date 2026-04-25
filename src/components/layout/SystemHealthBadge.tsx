import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";

export default function SystemHealthBadge() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [latency, setLatency] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Simple latency check
    const checkLatency = async () => {
      const start = Date.now();
      try {
        await fetch("/favicon.ico", { method: "HEAD", cache: "no-store" });
        setLatency(Date.now() - start);
      } catch {
        setLatency(null);
      }
    };

    const interval = setInterval(checkLatency, 30000);
    checkLatency();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const isHealthy = isOnline && (latency === null || latency < 500);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => navigate("/system-diagnostics")}
          className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-card border border-border hover:bg-muted transition-all"
        >
          <div className="relative">
            <motion.div
              className={`w-2 h-2 rounded-full ${isHealthy ? "bg-emerald-500" : "bg-amber-500"}`}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {isHealthy && (
              <motion.div
                className="absolute inset-0 rounded-full bg-emerald-500"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
              />
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:inline">
            Sistema {isHealthy ? "Estável" : "Instável"}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isOnline ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
            <span>Conexão: {isOnline ? "Online" : "Offline"}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-sky-500" />
            <span>Latência: {latency ? `${latency}ms` : "---"}</span>
          </div>
          <p className="text-[9px] opacity-70 mt-1">Clique para diagnósticos detalhados</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
