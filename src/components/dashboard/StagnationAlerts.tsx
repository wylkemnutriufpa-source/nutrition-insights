import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, TrendingDown, Scale, Activity,
  MessageSquare, Calendar, ArrowRight, Zap
} from "lucide-react";

interface StagnationAlert {
  id: string;
  patientId: string;
  patientName: string;
  type: "weight_plateau" | "adherence_drop" | "no_meals" | "missed_checkins" | "streak_lost";
  severity: "warning" | "critical";
  message: string;
  suggestion: string;
  daysDetected: number;
}

const alertConfig = {
  weight_plateau: { icon: Scale, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  adherence_drop: { icon: TrendingDown, color: "text-orange-500", bg: "bg-orange-500/10" },
  no_meals: { icon: Activity, color: "text-red-500", bg: "bg-red-500/10" },
  missed_checkins: { icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10" },
  streak_lost: { icon: Zap, color: "text-purple-500", bg: "bg-purple-500/10" },
};

export default function StagnationAlerts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<StagnationAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    detectAlerts();
  }, [user]);

  const detectAlerts = async () => {
    if (!user) return;
    const detected: StagnationAlert[] = [];

    // Get all patients
    const { data: patients } = await supabase
      .from("nutritionist_patients")
      .select("patient_id")
      .eq("nutritionist_id", user.id)
      .eq("status", "active");

    if (!patients?.length) { setLoading(false); return; }
    const patientIds = patients.map(p => p.patient_id);

    // Get profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", patientIds);

    const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name || "Paciente"]));

    // Check weight plateau (same weight ±0.3kg for 14+ days)
    const { data: checkins } = await supabase
      .from("patient_checkins")
      .select("patient_id, weight, created_at")
      .in("patient_id", patientIds)
      .order("created_at", { ascending: false })
      .limit(500);

    const checkinsByPatient = new Map<string, any[]>();
    (checkins || []).forEach(c => {
      if (!checkinsByPatient.has(c.patient_id)) checkinsByPatient.set(c.patient_id, []);
      checkinsByPatient.get(c.patient_id)!.push(c);
    });

    checkinsByPatient.forEach((records, patientId) => {
      if (records.length < 3) return;
      const recent = records.slice(0, 5);
      const weights = recent.filter(r => r.weight).map(r => r.weight);
      if (weights.length < 3) return;

      const variance = Math.max(...weights) - Math.min(...weights);
      const daySpan = Math.ceil(
        (new Date(recent[0].created_at).getTime() - new Date(recent[recent.length - 1].created_at).getTime()) / 86400000
      );

      if (variance <= 0.5 && daySpan >= 14) {
        detected.push({
          id: `plateau-${patientId}`,
          patientId,
          patientName: nameMap.get(patientId) || "Paciente",
          type: "weight_plateau",
          severity: daySpan > 21 ? "critical" : "warning",
          message: `Platô de peso há ${daySpan} dias (variação de ${variance.toFixed(1)}kg)`,
          suggestion: "Considere ajustar o plano alimentar ou adicionar estratégias como refeed ou ciclagem calórica.",
          daysDetected: daySpan,
        });
      }
    });

    // Check adherence drop (checklist completion < 30% last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    for (const patientId of patientIds) {
      const { data: tasks } = await supabase
        .from("checklist_tasks")
        .select("completed")
        .eq("patient_id", patientId)
        .gte("date", sevenDaysAgo);

      if (!tasks?.length) continue;
      const completionRate = tasks.filter(t => t.completed).length / tasks.length;

      if (completionRate < 0.3 && tasks.length > 5) {
        detected.push({
          id: `adherence-${patientId}`,
          patientId,
          patientName: nameMap.get(patientId) || "Paciente",
          type: "adherence_drop",
          severity: completionRate < 0.15 ? "critical" : "warning",
          message: `Adesão de ${Math.round(completionRate * 100)}% nos últimos 7 dias`,
          suggestion: "Envie uma mensagem motivacional ou agende um check-in para entender as dificuldades.",
          daysDetected: 7,
        });
      }
    }

    // Check no meals logged (3+ days)
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    for (const patientId of patientIds.slice(0, 30)) {
      const { count } = await supabase
        .from("meals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", patientId)
        .gte("logged_at", threeDaysAgo);

      if ((count || 0) === 0) {
        detected.push({
          id: `nomeal-${patientId}`,
          patientId,
          patientName: nameMap.get(patientId) || "Paciente",
          type: "no_meals",
          severity: "warning",
          message: "Nenhuma refeição registrada nos últimos 3 dias",
          suggestion: "O paciente pode estar com dificuldades no plano. Sugira simplificar as refeições.",
          daysDetected: 3,
        });
      }
    }

    // Sort by severity
    detected.sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1));
    setAlerts(detected.slice(0, 15));
    setLoading(false);
  };

  if (loading) return (
    <div className="glass-premium rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-primary" />
        <h2 className="font-display font-semibold">Alertas de Estagnação</h2>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );

  if (alerts.length === 0) return (
    <div className="glass-premium rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-primary" />
        <h2 className="font-display font-semibold">Alertas de Estagnação</h2>
      </div>
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Zap className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Nenhum alerta crítico no momento!</p>
        <p className="text-xs text-muted-foreground mt-1">Seus pacientes estão no caminho certo ✨</p>
      </div>
    </div>
  );

  return (
    <div className="glass-premium rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold">Alertas de Estagnação</h2>
          <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
            {alerts.filter(a => a.severity === "critical").length} críticos
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-lg border ${
                alert.severity === "critical"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{alert.patientName}</span>
                    {alert.severity === "critical" && (
                      <span className="text-[10px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded font-bold">
                        CRÍTICO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                  <p className="text-xs text-primary/80 mt-1 italic">💡 {alert.suggestion}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => navigate(`/chat`)}
                    title="Enviar mensagem"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => navigate(`/patients/${alert.patientId}`)}
                    title="Ver paciente"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
