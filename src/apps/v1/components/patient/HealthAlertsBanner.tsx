import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, TrendingDown, X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface HealthAlert {
  id: string;
  title: string;
  message: string;
  type: string;
  metadata: any;
  created_at: string;
}

export default function HealthAlertsBanner() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .in("type", ["bmi_alert", "stagnation_alert"])
      .eq("is_read", false)
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setAlerts((data as HealthAlert[]) || []));
  }, [user]);

  const dismiss = async (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const iconMap: Record<string, typeof AlertTriangle> = {
    bmi_alert: AlertTriangle,
    stagnation_alert: TrendingDown,
  };

  const colorMap: Record<string, { bg: string; border: string; icon: string }> = {
    bmi_alert: {
      bg: "bg-amber-500/5",
      border: "border-amber-500/20",
      icon: "text-amber-500",
    },
    stagnation_alert: {
      bg: "bg-blue-500/5",
      border: "border-blue-500/20",
      icon: "text-blue-500",
    },
  };

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {visible.map((alert) => {
          const Icon = iconMap[alert.type] || AlertTriangle;
          const colors = colorMap[alert.type] || colorMap.bmi_alert;

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`rounded-xl ${colors.bg} border ${colors.border} p-4 flex items-start gap-3`}
            >
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${colors.icon}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                <Link
                  to="/journey"
                  className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                >
                  Ver evolução <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <button
                onClick={() => dismiss(alert.id)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
