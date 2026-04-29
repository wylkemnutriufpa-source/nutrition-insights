import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, Activity, AlertOctagon } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type HealthStatus = "ok" | "warning" | "critical";

export default function SystemHealthBadge() {
  const { isPatient, loading } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [latency, setLatency] = useState<number | null>(null);
  const navigate = useNavigate();

  if (loading || isPatient) return null;

  const { data: lastDiag } = useQuery({
    queryKey: ["latest-system-diagnostic"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("system_diagnostic_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Sync every minute
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

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

  const getStatus = (): HealthStatus => {
    if (!isOnline) return "critical";
    if (latency && latency > 1000) return "warning";
    
    if (lastDiag) {
      if (lastDiag.critical_count > 0) return "critical";
      if (lastDiag.health_score < 80 || lastDiag.warning_count > 5) return "warning";
      return "ok";
    }
    
    return "ok";
  };

  const status = getStatus();

  const statusConfig = {
    ok: {
      color: "bg-emerald-500",
      label: "Estável",
      icon: CheckCircle2,
      textColor: "text-emerald-500",
      glow: "bg-emerald-500/50"
    },
    warning: {
      color: "bg-amber-500",
      label: "Atenção",
      icon: AlertTriangle,
      textColor: "text-amber-500",
      glow: "bg-amber-500/50"
    },
    critical: {
      color: "bg-destructive",
      label: "Crítico",
      icon: AlertOctagon,
      textColor: "text-destructive",
      glow: "bg-destructive/50"
    }
  };

  const current = statusConfig[status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => navigate("/system-diagnostics")}
          className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-card border border-border hover:bg-muted transition-all"
        >
          <div className="relative">
            <motion.div
              className={`w-2 h-2 rounded-full ${current.color}`}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {status === "ok" && (
              <motion.div
                className={`absolute inset-0 rounded-full ${current.color}`}
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
              />
            )}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:inline ${current.textColor}`}>
            Sistema {current.label}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs p-3">
        <div className="space-y-2 min-w-[150px]">
          <div className="flex items-center justify-between border-b border-border pb-1 mb-1">
            <span className="font-semibold">Status Geral</span>
            <Badge variant={status === "ok" ? "default" : status === "warning" ? "secondary" : "destructive"} className="text-[9px] h-4">
              {current.label.toUpperCase()}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                {isOnline ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                <span>Conexão</span>
              </div>
              <span className="text-muted-foreground">{isOnline ? "Online" : "Offline"}</span>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-sky-500" />
                <span>Latência</span>
              </div>
              <span className="text-muted-foreground">{latency ? `${latency}ms` : "---"}</span>
            </div>

            {lastDiag && (
              <div className="flex items-center justify-between gap-4 border-t border-border pt-1 mt-1">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-primary" />
                  <span>Último Teste</span>
                </div>
                <span className="text-muted-foreground">{lastDiag.health_score}%</span>
              </div>
            )}
          </div>
          
          <p className="text-[9px] opacity-70 mt-2 text-center">Clique para diagnósticos detalhados</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

