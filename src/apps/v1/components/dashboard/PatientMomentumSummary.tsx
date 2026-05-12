import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Flame, Scale, AlertTriangle, ShieldAlert, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { calculateMomentum, type MomentumLevel } from "@/components/gamification/MomentumIndicator";

const LEVEL_CONFIG: Record<MomentumLevel, { emoji: string; color: string; bg: string; label: string }> = {
  fire: { emoji: "🔥", color: "text-orange-500", bg: "bg-orange-500/10", label: "Em Alta" },
  stable: { emoji: "⚖️", color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Estável" },
  declining: { emoji: "📉", color: "text-red-500", bg: "bg-red-500/10", label: "Em Queda" },
  critical: { emoji: "🚨", color: "text-red-600", bg: "bg-red-600/10", label: "Crítico" },
};

interface PatientMomentum {
  patientId: string;
  patientName: string;
  level: MomentumLevel;
  score: number;
  trend: number;
  streakDays: number;
}

export default function PatientMomentumSummary() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: momentumData = [], isLoading } = useQuery({
    queryKey: ["momentum-summary", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Get active patients
      const { data: patients } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", user!.id)
        .eq("status", "active");

      if (!patients || patients.length === 0) return [];

      const patientIds = patients.map(p => p.patient_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", patientIds);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach(p => { nameMap[p.user_id] = p.full_name || "Paciente"; });

      // Get adherence data for all patients (last 14 days)
      const { data: adherenceData } = await supabase
        .from("patient_daily_adherence")
        .select("patient_id, total_score, streak_days, date")
        .in("patient_id", patientIds)
        .order("date", { ascending: false })
        .limit(patientIds.length * 14);

      // Group by patient
      const byPatient: Record<string, Array<{ total_score: number | null; streak_days: number | null; date: string }>> = {};
      (adherenceData || []).forEach(d => {
        if (!byPatient[d.patient_id]) byPatient[d.patient_id] = [];
        byPatient[d.patient_id].push(d);
      });

      // Calculate momentum for each
      const results: PatientMomentum[] = patientIds.map(pid => {
        const history = byPatient[pid] || [];
        const momentum = calculateMomentum(history);
        return {
          patientId: pid,
          patientName: nameMap[pid] || "Paciente",
          level: momentum.level,
          score: momentum.score,
          trend: momentum.trend,
          streakDays: momentum.streakDays,
        };
      });

      // Sort: critical first, then declining, then stable, then fire
      const order: Record<MomentumLevel, number> = { critical: 0, declining: 1, stable: 2, fire: 3 };
      results.sort((a, b) => order[a.level] - order[b.level]);

      return results;
    },
  });

  // Group counts
  const counts = momentumData.reduce<Record<MomentumLevel, number>>((acc, p) => {
    acc[p.level] = (acc[p.level] || 0) + 1;
    return acc;
  }, { fire: 0, stable: 0, declining: 0, critical: 0 });

  if (isLoading) {
    return (
      <Card className="glass-premium">
        <CardContent className="py-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const alertPatients = momentumData.filter(p => p.level === "critical" || p.level === "declining");

  return (
    <Card className="glass-premium overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Momentum dos Pacientes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary bars */}
        <div className="grid grid-cols-4 gap-2">
          {(["fire", "stable", "declining", "critical"] as MomentumLevel[]).map(level => {
            const cfg = LEVEL_CONFIG[level];
            return (
              <div key={level} className={`rounded-lg p-2.5 text-center ${cfg.bg}`}>
                <span className="text-lg">{cfg.emoji}</span>
                <p className="text-xl font-bold mt-0.5">{counts[level]}</p>
                <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
              </div>
            );
          })}
        </div>

        {/* Alert list */}
        {alertPatients.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Precisam de atenção</p>
            {alertPatients.slice(0, 5).map((p, i) => {
              const cfg = LEVEL_CONFIG[p.level];
              return (
                <motion.button
                  key={p.patientId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/patients/${p.patientId}`)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors text-left"
                >
                  <span className="text-lg">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      Score: {Math.round(p.score)}% · Trend: {p.trend > 0 ? "+" : ""}{Math.round(p.trend)}%
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                    {cfg.label}
                  </Badge>
                </motion.button>
              );
            })}
            {alertPatients.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{alertPatients.length - 5} pacientes em alerta
              </p>
            )}
          </div>
        )}

        {alertPatients.length === 0 && momentumData.length > 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            ✅ Nenhum paciente em risco. Todos estáveis ou em alta!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
