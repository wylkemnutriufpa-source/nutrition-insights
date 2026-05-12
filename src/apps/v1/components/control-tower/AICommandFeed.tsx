import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { useTenant } from "@v1/lib/tenantContext";
import { withTenantFilter } from "@v1/lib/tenantQueryHelpers";
import { cn } from "@v1/lib/utils";
import { Brain, TrendingDown, Target, Zap, Shield, Activity, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FeedEvent {
  id: string;
  type: string;
  message: string;
  icon: React.ElementType;
  color: string;
  timestamp: string;
}

const EVENT_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  adherence_drop: { icon: TrendingDown, color: "text-red-400" },
  milestone: { icon: Target, color: "text-amber-400" },
  behavioral_risk: { icon: Brain, color: "text-violet-400" },
  therapeutic_adjust: { icon: Zap, color: "text-sky-400" },
  recovery: { icon: Shield, color: "text-orange-400" },
  stability: { icon: CheckCircle, color: "text-emerald-400" },
  alert: { icon: Activity, color: "text-rose-400" },
};

export default function AICommandFeed() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const feed: FeedEvent[] = [];

        // Get recent alerts
        const { data: alerts } = await withTenantFilter((supabase as any)
          .from("clinical_alerts")
          .select("id, title, alert_type, severity, created_at")
          .eq("nutritionist_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(10), tenantId);

        for (const a of (alerts ?? [])) {
          const cfg = a.severity === "critical" ? EVENT_ICONS.alert : EVENT_ICONS.behavioral_risk;
          feed.push({
            id: `alert-${a.id}`,
            type: a.alert_type,
            message: a.title,
            icon: cfg.icon,
            color: cfg.color,
            timestamp: a.created_at,
          });
        }

        // Get recent automation runs
        const { data: runs } = await withTenantFilter((supabase as any)
          .from("automation_runs")
          .select("id, status, executed_at, trigger_data")
          .eq("nutritionist_id", user!.id)
          .order("executed_at", { ascending: false })
          .limit(8), tenantId);

        for (const r of (runs ?? [])) {
          feed.push({
            id: `run-${r.id}`,
            type: "automation",
            message: r.status === "success" ? "Protocolo de automação executado" : "Automação processada",
            icon: Zap,
            color: "text-violet-400",
            timestamp: r.executed_at,
          });
        }

        // Get recent behavioral recovery actions
        const { data: recoveries } = await withTenantFilter((supabase as any)
          .from("behavioral_recovery_actions")
          .select("id, clinical_reason, created_at")
          .order("created_at", { ascending: false })
          .limit(5), tenantId);

        for (const rec of (recoveries ?? [])) {
          feed.push({
            id: `rec-${rec.id}`,
            type: "recovery",
            message: rec.clinical_reason?.substring(0, 80) || "Protocolo de recuperação ativado",
            icon: Shield,
            color: "text-orange-400",
            timestamp: rec.created_at,
          });
        }

        // Sort by timestamp
        feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setEvents(feed.slice(0, 15));
      } catch (e) {
        console.error("AI feed error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-[400px] overflow-y-auto scrollbar-hide pr-1">
      {events.length === 0 && (
        <p className="text-xs text-white/30 text-center py-8">Nenhuma atividade recente</p>
      )}
      <AnimatePresence>
        {events.map((ev, i) => (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors"
          >
            <div className={cn("w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5")}>
              <ev.icon className={cn("w-3.5 h-3.5", ev.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/80 leading-snug line-clamp-2">{ev.message}</p>
              <p className="text-[10px] text-white/25 mt-0.5">
                {formatDistanceToNow(new Date(ev.timestamp), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
            <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 animate-pulse", ev.color.replace("text-", "bg-"))} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
