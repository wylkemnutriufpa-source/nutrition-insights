/**
 * Portfolio Intelligence Panel — Super Dashboard do Profissional
 * Shows key portfolio KPIs: risk ranking, adherence, evolution trends
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle, TrendingUp, Users, Activity, Target,
  ArrowRight, ShieldAlert, Flame, Award
} from "lucide-react";
import { Link } from "react-router-dom";

interface PortfolioMetrics {
  totalPatients: number;
  avgAdherence: number;
  atRiskCount: number;
  highPerformers: number;
  pendingPlans: number;
  plansPublished: number;
}

interface PatientRisk {
  id: string;
  name: string;
  riskLevel: "critical" | "high" | "moderate";
  reason: string;
  adherence: number;
}

const RISK_CONFIG = {
  critical: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", label: "Crítico" },
  high: { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning", label: "Alto" },
  moderate: { bg: "bg-accent/10", border: "border-accent/30", text: "text-accent", label: "Moderado" },
};

export default function PortfolioIntelligencePanel() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [riskPatients, setRiskPatients] = useState<PatientRisk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadPortfolio(user.id);
  }, [user?.id]);

  const loadPortfolio = async (nutId: string) => {
    try {
      const [patientsRes, plansRes, plansActiveRes] = await Promise.all([
        supabase.from("nutritionist_patients").select("patient_id").eq("nutritionist_id", nutId).eq("status", "active"),
        supabase.from("meal_plans").select("id, plan_status").eq("nutritionist_id", nutId),
        supabase.from("meal_plans").select("id", { count: "exact", head: true }).eq("nutritionist_id", nutId).eq("is_active", true),
      ]);

      const patientIds = (patientsRes.data || []).map((p) => p.patient_id);
      const totalPatients = patientIds.length;
      const pendingPlans = (plansRes.data || []).filter((p) => p.plan_status === "draft").length;
      const plansPublished = plansActiveRes.count || 0;

      // Get adherence and risk data from snapshots if available
      let avgAdherence = 0;
      let atRiskCount = 0;
      let highPerformers = 0;
      const risks: PatientRisk[] = [];

      if (patientIds.length > 0) {
        const today = new Date().toISOString().split("T")[0];

        // Get profiles for names
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", patientIds.slice(0, 50));

        const nameMap: Record<string, string> = {};
        (profiles || []).forEach((p) => { nameMap[p.user_id] = p.full_name || "Paciente"; });

        // Get latest snapshots
        const { data: snapshots } = await (supabase as any)
          .from("clinical_daily_snapshots")
          .select("patient_id, adherence_score, dropout_risk_score, risk_level")
          .in("patient_id", patientIds.slice(0, 50))
          .eq("snapshot_date", today);

        if (snapshots && snapshots.length > 0) {
          const adherenceValues = snapshots.filter((s: any) => s.adherence_score != null).map((s: any) => s.adherence_score);
          avgAdherence = adherenceValues.length > 0 ? Math.round(adherenceValues.reduce((a: number, b: number) => a + b, 0) / adherenceValues.length) : 0;

          snapshots.forEach((s: any) => {
            if (s.risk_level === "critical" || s.risk_level === "high") {
              atRiskCount++;
              risks.push({
                id: s.patient_id,
                name: nameMap[s.patient_id] || "Paciente",
                riskLevel: s.risk_level === "critical" ? "critical" : "high",
                reason: s.dropout_risk_score > 70 ? "Risco de abandono" : "Baixa adesão",
                adherence: s.adherence_score || 0,
              });
            }
            if ((s.adherence_score || 0) >= 80) highPerformers++;
          });
        }

        // Fallback: check checklist completion
        if (!snapshots || snapshots.length === 0) {
          const { data: checkData } = await supabase
            .from("checklist_tasks")
            .select("patient_id, completed")
            .in("patient_id", patientIds.slice(0, 30))
            .eq("date", today);

          if (checkData && checkData.length > 0) {
            const byPatient: Record<string, { total: number; done: number }> = {};
            checkData.forEach((c) => {
              if (!byPatient[c.patient_id]) byPatient[c.patient_id] = { total: 0, done: 0 };
              byPatient[c.patient_id].total++;
              if (c.completed) byPatient[c.patient_id].done++;
            });
            const rates = Object.values(byPatient).map((v) => (v.total > 0 ? (v.done / v.total) * 100 : 0));
            avgAdherence = rates.length > 0 ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0;
            highPerformers = rates.filter((r) => r >= 80).length;
          }
        }
      }

      setMetrics({ totalPatients, avgAdherence, atRiskCount, highPerformers, pendingPlans, plansPublished });
      setRiskPatients(risks.slice(0, 5));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) return null;

  const adherenceColor = metrics.avgAdherence >= 70 ? "text-success" : metrics.avgAdherence >= 40 ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard icon={Users} label="Pacientes Ativos" value={String(metrics.totalPatients)} />
        <KPICard icon={Activity} label="Adesão Média" value={`${metrics.avgAdherence}%`} valueClass={adherenceColor} />
        <KPICard icon={ShieldAlert} label="Em Risco" value={String(metrics.atRiskCount)} valueClass={metrics.atRiskCount > 0 ? "text-destructive" : "text-success"} />
        <KPICard icon={Award} label="Alta Performance" value={String(metrics.highPerformers)} valueClass="text-success" />
      </div>

      {/* Risk Ranking */}
      {riskPatients.length > 0 && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Pacientes em Risco — Ação Imediata
              <Badge variant="destructive" className="ml-auto text-[10px]">{riskPatients.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {riskPatients.map((p) => {
              const config = RISK_CONFIG[p.riskLevel];
              return (
                <Link to={`/patients/${p.id}`} key={p.id}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${config.border} ${config.bg} cursor-pointer transition-all`}
                  >
                    <div className={`w-2 h-2 rounded-full ${p.riskLevel === "critical" ? "bg-destructive" : "bg-warning"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.reason}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className={`${config.text} text-[10px]`}>{config.label}</Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Adesão: {p.adherence}%</p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  </motion.div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Plan Status */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Planos Publicados</p>
              <p className="text-lg font-bold">{metrics.plansPublished}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={metrics.pendingPlans > 0 ? "border-warning/30" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rascunhos Pendentes</p>
              <p className="text-lg font-bold">{metrics.pendingPlans}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, valueClass = "" }: {
  icon: any; label: string; value: string; valueClass?: string;
}) {
  return (
    <motion.div whileHover={{ y: -2 }} className="glass-premium rounded-xl p-4 transition-all">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
          <p className={`text-xl font-display font-bold ${valueClass}`}>{value}</p>
        </div>
      </div>
    </motion.div>
  );
}
