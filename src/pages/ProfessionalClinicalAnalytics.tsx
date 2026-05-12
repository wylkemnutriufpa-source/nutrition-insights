import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/common/PageLoader";
import HealthScoreRing from "@/components/dashboard/HealthScoreRing";
import {
  BarChart3, Users, AlertTriangle, TrendingDown, Activity,
  FileText, CheckCircle2, Scale, Brain, Shield, ArrowRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface PortfolioMetrics {
  totalPatients: number;
  atRiskCount: number;
  lowAdherenceCount: number;
  noWeightProgressCount: number;
  avgMetabolicScore: number;
  onboardingCompletionRate: number;
  publishedPlans: number;
  draftPlans: number;
  avgClinicalEvolution: number;
  patientRiskList: Array<{
    id: string;
    name: string;
    riskScore: number;
    adherence: number;
    daysSinceActivity: number;
    flags: string[];
  }>;
  adherenceDistribution: Array<{ range: string; count: number; color: string }>;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export default function ProfessionalClinicalAnalytics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const compute = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: patients } = await supabase
      .from("nutritionist_patients")
      .select("patient_id")
      .eq("nutritionist_id", user.id)
      .eq("status", "active");

    const patientIds = (patients || []).map(p => p.patient_id);
    if (patientIds.length === 0) {
      setMetrics({
        totalPatients: 0, atRiskCount: 0, lowAdherenceCount: 0, noWeightProgressCount: 0,
        avgMetabolicScore: 0, onboardingCompletionRate: 0, publishedPlans: 0, draftPlans: 0,
        avgClinicalEvolution: 0, patientRiskList: [], adherenceDistribution: [],
      });
      setLoading(false);
      return;
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 14);
    const weekStr = weekAgo.toISOString().split("T")[0];

    const [plansRes, anamRes, profilesRes] = await Promise.all([
      supabase.from("meal_plans").select("id, is_active").eq("nutritionist_id", user.id),
      supabase.from("patient_anamnesis").select("user_id, status").in("user_id", patientIds),
      supabase.from("profiles").select("user_id, full_name").in("user_id", patientIds),
    ]);

    const nameMap: Record<string, string> = {};
    (profilesRes.data || []).forEach(p => { nameMap[p.user_id] = p.full_name || "Paciente"; });

    const plans = plansRes.data || [];
    const publishedPlans = plans.filter(p => p.is_active).length;
    const draftPlans = plans.filter(p => !p.is_active).length;

    const completedAnamnesis = new Set((anamRes.data || []).filter(a => a.status === "completed").map(a => a.user_id));
    const onboardingCompletionRate = patientIds.length > 0
      ? Math.round((completedAnamnesis.size / patientIds.length) * 100)
      : 0;

    // Batch queries for all patients instead of N+1
    const analysisIds = patientIds.slice(0, 50);
    const [allCheckRes, allWeightRes] = await Promise.all([
      supabase.from("checklist_tasks").select("patient_id, completed").in("patient_id", analysisIds).gte("date", weekStr),
      supabase.from("physical_assessments").select("patient_id, weight, assessment_date").in("patient_id", analysisIds).order("assessment_date", { ascending: false }),
    ]);

    const allTasks = allCheckRes.data || [];
    const allWeights = allWeightRes.data || [];

    // Group by patient
    const tasksByPatient: Record<string, typeof allTasks> = {};
    for (const t of allTasks) {
      (tasksByPatient[t.patient_id] ??= []).push(t);
    }
    const weightsByPatient: Record<string, typeof allWeights> = {};
    for (const w of allWeights) {
      (weightsByPatient[w.patient_id] ??= []).push(w);
    }

    const riskList: PortfolioMetrics["patientRiskList"] = [];
    let totalAdherence = 0;
    let adherenceCount = 0;
    let noProgressCount = 0;
    const adherenceBuckets = { "0-25%": 0, "26-50%": 0, "51-75%": 0, "76-100%": 0 };

    for (const pid of analysisIds) {
      const tasks = tasksByPatient[pid] || [];
      const done = tasks.filter(t => t.completed).length;
      const adherence = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

      totalAdherence += adherence;
      adherenceCount++;

      if (adherence <= 25) adherenceBuckets["0-25%"]++;
      else if (adherence <= 50) adherenceBuckets["26-50%"]++;
      else if (adherence <= 75) adherenceBuckets["51-75%"]++;
      else adherenceBuckets["76-100%"]++;

      // Weight progress check
      const weights = (weightsByPatient[pid] || []).slice(0, 3).map(w => w.weight).filter(Boolean) as number[];
      const hasProgress = weights.length >= 2 && Math.abs(weights[0] - weights[weights.length - 1]) > 0.3;
      if (!hasProgress && weights.length >= 2) noProgressCount++;

      // Risk scoring
      const flags: string[] = [];
      if (adherence < 40) flags.push("Baixa adesão");
      if (tasks.length === 0) flags.push("Sem atividade");
      if (!hasProgress && weights.length >= 2) flags.push("Sem evolução peso");

      const riskScore = Math.max(0, 100 - adherence - (hasProgress ? 20 : 0) - (tasks.length > 0 ? 10 : 0));

      if (flags.length > 0) {
        riskList.push({
          id: pid,
          name: nameMap[pid] || "Paciente",
          riskScore,
          adherence,
          daysSinceActivity: tasks.length === 0 ? 14 : 0,
          flags,
        });
      }
    }

    riskList.sort((a, b) => b.riskScore - a.riskScore);

    const avgAdh = adherenceCount > 0 ? Math.round(totalAdherence / adherenceCount) : 0;

    setMetrics({
      totalPatients: patientIds.length,
      atRiskCount: riskList.length,
      lowAdherenceCount: riskList.filter(r => r.adherence < 40).length,
      noWeightProgressCount: noProgressCount,
      avgMetabolicScore: avgAdh,
      onboardingCompletionRate,
      publishedPlans,
      draftPlans,
      avgClinicalEvolution: Math.min(100, avgAdh + 10),
      patientRiskList: riskList.slice(0, 10),
      adherenceDistribution: [
        { range: "0-25%", count: adherenceBuckets["0-25%"], color: "hsl(0, 72%, 51%)" },
        { range: "26-50%", count: adherenceBuckets["26-50%"], color: "hsl(36, 95%, 55%)" },
        { range: "51-75%", count: adherenceBuckets["51-75%"], color: "hsl(210, 92%, 55%)" },
        { range: "76-100%", count: adherenceBuckets["76-100%"], color: "hsl(152, 58%, 42%)" },
      ],
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { compute(); }, [compute]);

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoader text="Calculando métricas clínicas..." />
      </DashboardLayout>
    );
  }

  if (!metrics) return null;

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Analytics Clínico</h1>
            <p className="text-sm text-muted-foreground">Performance da sua carteira de pacientes</p>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard icon={Users} label="Pacientes Ativos" value={metrics.totalPatients} color="text-primary" />
          <KPICard icon={AlertTriangle} label="Em Risco" value={metrics.atRiskCount} color="text-destructive" />
          <KPICard icon={TrendingDown} label="Baixa Adesão" value={metrics.lowAdherenceCount} color="text-warning" />
          <KPICard icon={Scale} label="Sem Evolução Peso" value={metrics.noWeightProgressCount} color="text-info" />
        </motion.div>

        {/* Score + Onboarding + Plans */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-premium">
            <CardContent className="p-5 flex flex-col items-center gap-3">
              <HealthScoreRing score={metrics.avgMetabolicScore} label="Score Médio" size="lg" />
              <p className="text-xs text-muted-foreground text-center">Média de adesão da carteira</p>
            </CardContent>
          </Card>

          <Card className="glass-premium">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-sm font-semibold">Onboarding</span>
              </div>
              <div className="text-3xl font-display font-bold text-primary">{metrics.onboardingCompletionRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">Taxa de conclusão</p>
              <Progress value={metrics.onboardingCompletionRate} className="mt-3 h-1.5" />
            </CardContent>
          </Card>

          <Card className="glass-premium">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-info" />
                <span className="text-sm font-semibold">Planos</span>
              </div>
              <div className="flex items-baseline gap-3">
                <div>
                  <span className="text-2xl font-display font-bold text-success">{metrics.publishedPlans}</span>
                  <span className="text-xs text-muted-foreground ml-1">publicados</span>
                </div>
                <div>
                  <span className="text-2xl font-display font-bold text-warning">{metrics.draftPlans}</span>
                  <span className="text-xs text-muted-foreground ml-1">rascunho</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Adherence Distribution Chart */}
        <motion.div variants={item}>
          <Card className="glass-premium">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Distribuição de Adesão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={metrics.adherenceDistribution}>
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {metrics.adherenceDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Risk Ranking */}
        <motion.div variants={item}>
          <Card className="glass-premium">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Shield className="w-4 h-4 text-destructive" />
                Ranking de Risco Clínico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {metrics.patientRiskList.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum paciente em risco no momento 🎉</p>
              ) : (
                metrics.patientRiskList.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30"
                  >
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.flags.map((f, fi) => (
                          <Badge key={fi} variant="outline" className="text-[10px] py-0">{f}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-bold ${p.riskScore > 60 ? "text-destructive" : p.riskScore > 30 ? "text-warning" : "text-success"}`}>
                        {p.riskScore}
                      </div>
                      <span className="text-[10px] text-muted-foreground">risco</span>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card className="glass-premium">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
          <p className="text-xl font-display font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
