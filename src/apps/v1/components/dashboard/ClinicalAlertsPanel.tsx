import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { useTenant } from "@v1/lib/tenantContext";
import { withTenantFilter } from "@v1/lib/tenantQueryHelpers";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, Shield, TrendingDown, Scale, UserX, Utensils,
  Activity, CheckCircle2, ChevronDown, ChevronUp, Clock,
  Flame, X
} from "lucide-react";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { toast } from "sonner";

interface ClinicalAlert {
  id: string;
  patient_id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  trigger_source: string;
  metadata: any;
  is_active: boolean;
  created_at: string;
  patient_name?: string;
}

const severityConfig: Record<string, { bg: string; badge: string; label: string; icon: any; priority: number }> = {
  critical: { bg: "border-destructive/30 bg-destructive/5", badge: "bg-destructive/20 text-destructive", label: "Crítico", icon: Flame, priority: 4 },
  high: { bg: "border-destructive/20 bg-destructive/5", badge: "bg-destructive/15 text-destructive", label: "Alto", icon: AlertTriangle, priority: 3 },
  medium: { bg: "border-warning/20 bg-warning/5", badge: "bg-warning/15 text-warning", label: "Médio", icon: Activity, priority: 2 },
  low: { bg: "border-muted bg-muted/30", badge: "bg-muted text-muted-foreground", label: "Baixo", icon: Shield, priority: 1 },
};

const alertTypeIcons: Record<string, any> = {
  low_adherence: TrendingDown,
  weight_stagnation: Scale,
  unexpected_weight_gain: Scale,
  low_checkin_frequency: Utensils,
  possible_abandonment: UserX,
  metabolic_signal: Activity,
};

export default function ClinicalAlertsPanel() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["clinical-alerts", user?.id, tenantId],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      // Fetch alerts
      const { data: alertsData, error } = await withTenantFilter(
        supabase
          .from("clinical_alerts")
          .select("*")
          .eq("nutritionist_id", user!.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(50),
        tenantId
      );

      if (error) throw error;
      if (!alertsData || alertsData.length === 0) return [];

      // Fetch patient names
      const patientIds = [...new Set(alertsData.map((a: any) => a.patient_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", patientIds);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name; });

      return alertsData.map((a: any) => ({
        ...a,
        patient_name: nameMap[a.patient_id] || "Paciente",
      })) as ClinicalAlert[];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("clinical_alerts")
        .update({ is_active: false, resolved_at: new Date().toISOString(), resolved_by: user!.id })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinical-alerts"] });
      toast.success("Alerta resolvido");
    },
  });

  const filteredAlerts = filterSeverity
    ? alerts.filter((a) => a.severity === filterSeverity)
    : alerts;

  // Sort by severity priority
  const sorted = [...filteredAlerts].sort((a, b) => {
    const pa = severityConfig[a.severity]?.priority || 0;
    const pb = severityConfig[b.severity]?.priority || 0;
    return pb - pa;
  });

  // Risk score summary
  const riskScore = alerts.reduce((sum, a) => {
    const scores: Record<string, number> = { critical: 40, high: 25, medium: 10, low: 5 };
    return sum + (scores[a.severity] || 0);
  }, 0);

  const severityCounts = {
    critical: alerts.filter(a => a.severity === "critical").length,
    high: alerts.filter(a => a.severity === "high").length,
    medium: alerts.filter(a => a.severity === "medium").length,
    low: alerts.filter(a => a.severity === "low").length,
  };

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-5 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/50 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <h2 className="font-display font-semibold">Alertas Clínicos</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          ✅ Nenhum alerta ativo. Todos os pacientes estão dentro dos parâmetros.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
          </div>
          <div>
            <h2 className="font-display font-semibold">Alertas Clínicos</h2>
            <p className="text-xs text-muted-foreground">
              {alerts.length} alerta{alerts.length !== 1 ? "s" : ""} ativo{alerts.length !== 1 ? "s" : ""} • Score de risco: {riskScore}
            </p>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Severity Summary */}
      <div className="flex gap-2 mb-4">
        {(["critical", "high", "medium", "low"] as const).map((sev) => {
          const count = severityCounts[sev];
          if (count === 0) return null;
          const config = severityConfig[sev];
          return (
            <button
              key={sev}
              onClick={() => setFilterSeverity(filterSeverity === sev ? null : sev)}
              className={`flex-1 rounded-lg border p-2 text-center transition-all ${
                filterSeverity === sev ? "ring-2 ring-primary" : ""
              } ${config.bg}`}
            >
              <p className="font-display text-lg font-bold">{count}</p>
              <p className="text-[10px] font-medium">{config.label}</p>
            </button>
          );
        })}
      </div>

      {/* Alert List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2 max-h-[400px] overflow-y-auto"
          >
            {sorted.map((alert) => {
              const config = severityConfig[alert.severity] || severityConfig.medium;
              const TypeIcon = alertTypeIcons[alert.alert_type] || Activity;

              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`rounded-lg border p-3 ${config.bg} cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => navigate(`/patients/${alert.patient_id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <TypeIcon className="w-4 h-4 mt-0.5 shrink-0 text-foreground/70" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm truncate">{alert.patient_name}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.badge}`}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{alert.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(alert.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        resolveMutation.mutate(alert.id);
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
