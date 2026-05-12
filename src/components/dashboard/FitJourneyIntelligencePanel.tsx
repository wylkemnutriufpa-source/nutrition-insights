import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Users, TrendingDown, TrendingUp, AlertTriangle, Sparkles, Activity, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface IntelligenceStats {
  totalAnalyzed: number;
  dropoutRisk: number;
  lowAdherence: number;
  aboveAverage: number;
  suggestedAdjustments: number;
  avgAdherence: number;
  avgRisk: number;
  topRiskPatients: { id: string; name: string; risk: number; adherence: number; trend: string }[];
}

export default function FitJourneyIntelligencePanel() {
  const { user } = useAuth();
  const [stats, setStats] = useState<IntelligenceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        // Get all patients for this nutritionist
        const { data: patients } = await supabase
          .from("nutritionist_patients")
          .select("patient_id")
          .eq("nutritionist_id", user!.id)
          .eq("status", "active");

        if (!patients?.length) {
          setStats({
            totalAnalyzed: 0, dropoutRisk: 0, lowAdherence: 0, aboveAverage: 0,
            suggestedAdjustments: 0, avgAdherence: 0, avgRisk: 0, topRiskPatients: [],
          });
          setLoading(false);
          return;
        }

        const patientIds = patients.map(p => p.patient_id);

        // Get latest snapshots for each patient
        const { data: snapshots } = await (supabase as any)
          .from("clinical_daily_snapshots")
          .select("patient_id, adherence_score, dropout_risk_score, risk_level, momentum_direction, weight_trend")
          .in("patient_id", patientIds)
          .order("snapshot_date", { ascending: false });

        // Get profiles for names
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", patientIds);

        const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p.full_name ?? "Paciente"]));

        // Get pending clinical decisions
        const { data: decisions } = await (supabase as any)
          .from("clinical_decisions")
          .select("id")
          .eq("nutritionist_id", user!.id)
          .eq("status", "pending");

        // Deduplicate snapshots (latest per patient)
        const latestByPatient = new Map<string, any>();
        for (const s of (snapshots ?? [])) {
          if (!latestByPatient.has(s.patient_id)) {
            latestByPatient.set(s.patient_id, s);
          }
        }

        const allSnapshots = Array.from(latestByPatient.values());
        const totalAnalyzed = allSnapshots.length;
        const dropoutRisk = allSnapshots.filter(s => (s.dropout_risk_score ?? 0) > 60).length;
        const lowAdherence = allSnapshots.filter(s => (s.adherence_score ?? 100) < 50).length;
        const aboveAverage = allSnapshots.filter(s => 
          (s.adherence_score ?? 0) > 70 && (s.momentum_direction === "up" || s.weight_trend === "losing")
        ).length;

        const adherenceScores = allSnapshots.map(s => s.adherence_score ?? 0).filter(Boolean);
        const riskScores = allSnapshots.map(s => s.dropout_risk_score ?? 0).filter(Boolean);

        const avgAdherence = adherenceScores.length ? Math.round(adherenceScores.reduce((a: number, b: number) => a + b, 0) / adherenceScores.length) : 0;
        const avgRisk = riskScores.length ? Math.round(riskScores.reduce((a: number, b: number) => a + b, 0) / riskScores.length) : 0;

        // Top risk patients
        const topRiskPatients = allSnapshots
          .filter(s => (s.dropout_risk_score ?? 0) > 30)
          .sort((a: any, b: any) => (b.dropout_risk_score ?? 0) - (a.dropout_risk_score ?? 0))
          .slice(0, 3)
          .map((s: any) => ({
            id: s.patient_id,
            name: profileMap.get(s.patient_id) ?? "Paciente",
            risk: s.dropout_risk_score ?? 0,
            adherence: s.adherence_score ?? 0,
            trend: s.momentum_direction ?? "stable",
          }));

        setStats({
          totalAnalyzed,
          dropoutRisk,
          lowAdherence,
          aboveAverage,
          suggestedAdjustments: (decisions ?? []).length,
          avgAdherence,
          avgRisk,
          topRiskPatients,
        });
      } catch (e) {
        console.error("Intelligence panel error:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center animate-pulse">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-48 animate-pulse" />
              <div className="h-3 bg-muted rounded w-32 animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalAnalyzed === 0) return null;

  const metrics = [
    { icon: Users, label: "pacientes analisados hoje", value: stats.totalAnalyzed, color: "text-primary" },
    { icon: AlertTriangle, label: "pacientes com risco de abandono", value: stats.dropoutRisk, color: "text-destructive" },
    { icon: TrendingDown, label: "pacientes com baixa adesão", value: stats.lowAdherence, color: "text-warning" },
    { icon: TrendingUp, label: "pacientes com progresso acima da média", value: stats.aboveAverage, color: "text-success" },
    { icon: Sparkles, label: "ajustes terapêuticos sugeridos", value: stats.suggestedAdjustments, color: "text-accent" },
  ];

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg font-display">🧠 FitJourney Intelligence</CardTitle>
              <p className="text-xs text-muted-foreground">Análise clínica automatizada da sua carteira</p>
            </div>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary text-xs gap-1">
            <Activity className="w-3 h-3" /> Ativo
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        {/* Metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-background/60 border border-border/50"
            >
              <m.icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", m.color)} />
              <div>
                <p className="text-lg font-bold leading-none">{m.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{m.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Top risk patients */}
        {stats.topRiskPatients.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> Pacientes em foco
            </p>
            <div className="space-y-1.5">
              {stats.topRiskPatients.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <Link to={`/v1/patients/${p.id}`}>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-background/60 border border-border/50 hover:border-primary/30 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          p.risk > 70 ? "bg-destructive animate-pulse" : p.risk > 50 ? "bg-warning" : "bg-info"
                        )} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {p.risk > 70 ? "⚠️ risco comportamental alto" : p.risk > 50 ? "⚠️ risco moderado" : "ℹ️ monitorar"}
                            {" · "}
                            {p.trend === "down" ? "↓ adesão em queda" : p.trend === "up" ? "↑ melhorando" : "→ estável"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={cn(
                          "text-[10px] h-5",
                          p.adherence < 50 ? "border-destructive/50 text-destructive" : "border-muted"
                        )}>
                          Adesão {p.adherence}%
                        </Badge>
                        <Badge variant="outline" className={cn(
                          "text-[10px] h-5",
                          p.risk > 70 ? "border-destructive/50 text-destructive" : p.risk > 50 ? "border-warning/50 text-warning" : "border-info/50 text-info"
                        )}>
                          Risco {p.risk}%
                        </Badge>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-muted-foreground">
            Adesão média: <span className="font-semibold text-foreground">{stats.avgAdherence}%</span>
            {" · "}
            Risco médio: <span className="font-semibold text-foreground">{stats.avgRisk}%</span>
          </p>
          <Link to="/v1/clinical-risk">
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-primary">
              Ver cockpit completo →
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
