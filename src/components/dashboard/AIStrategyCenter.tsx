import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Brain, TrendingUp, Users, AlertTriangle, Lightbulb,
  Target, Zap, FileText, ArrowRight, RefreshCw, Loader2,
  CheckCircle2, BarChart3, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

interface ClinicDiagnosis {
  avgAdherence: number;
  atRiskCount: number;
  inactiveCount: number;
  totalPatients: number;
  bestProgram: string | null;
  avgHealthScore: number;
}

interface Opportunity {
  type: "upgrade" | "reactivation" | "protocol";
  title: string;
  description: string;
  patientCount: number;
  icon: string;
}

interface Recommendation {
  action: string;
  reason: string;
  priority: "high" | "medium" | "low";
  category: string;
}

interface BehavioralInsight {
  pattern: string;
  description: string;
  affectedCount: number;
  trend: "up" | "down" | "stable";
}

export default function AIStrategyCenter() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actionPlan, setActionPlan] = useState<string | null>(null);

  const [diagnosis, setDiagnosis] = useState<ClinicDiagnosis>({
    avgAdherence: 0, atRiskCount: 0, inactiveCount: 0,
    totalPatients: 0, bestProgram: null, avgHealthScore: 0
  });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [behavioralInsights, setBehavioralInsights] = useState<BehavioralInsight[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [patientsRes, programsRes, checkinsRes, checklistRes, anamnesisRes] = await Promise.all([
        supabase.from("nutritionist_patients").select("patient_id").eq("nutritionist_id", user.id).eq("status", "active"),
        supabase.from("programs").select("id, title").eq("created_by", user.id).eq("is_active", true),
        supabase.from("patient_checkins").select("patient_id, created_at, difficulty, status").eq("nutritionist_id", user.id),
        supabase.from("checklist_tasks").select("patient_id, completed, date").gte("date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]),
        supabase.from("patient_anamnesis").select("user_id, status"),
      ]);

      const patientIds = (patientsRes.data || []).map(p => p.patient_id);
      const totalPatients = patientIds.length;

      // Adherence from checklist
      const relevantTasks = (checklistRes.data || []).filter(t => patientIds.includes(t.patient_id));
      const completedTasks = relevantTasks.filter(t => t.completed);
      const avgAdherence = relevantTasks.length > 0 ? Math.round((completedTasks.length / relevantTasks.length) * 100) : 0;

      // Per-patient adherence for risk
      const perPatient: Record<string, { total: number; done: number; lastDate: string }> = {};
      relevantTasks.forEach(t => {
        if (!perPatient[t.patient_id]) perPatient[t.patient_id] = { total: 0, done: 0, lastDate: t.date };
        perPatient[t.patient_id].total++;
        if (t.completed) perPatient[t.patient_id].done++;
        if (t.date > perPatient[t.patient_id].lastDate) perPatient[t.patient_id].lastDate = t.date;
      });

      const today = new Date().toISOString().split("T")[0];
      let atRiskCount = 0;
      let inactiveCount = 0;
      const inactivePatients: string[] = [];
      const lowAdherencePatients: string[] = [];

      patientIds.forEach(pid => {
        const stats = perPatient[pid];
        if (!stats || stats.total === 0) {
          inactiveCount++;
          inactivePatients.push(pid);
          return;
        }
        const adherence = (stats.done / stats.total) * 100;
        if (adherence < 30) { atRiskCount++; lowAdherencePatients.push(pid); }
        const daysSince = Math.floor((Date.now() - new Date(stats.lastDate).getTime()) / 86400000);
        if (daysSince >= 5) { inactiveCount++; inactivePatients.push(pid); }
      });

      // Best program
      const programList = programsRes.data || [];
      let bestProgram: string | null = null;
      if (programList.length > 0) {
        // Simple: pick first active program
        bestProgram = programList[0]?.title || null;
      }

      // Health score estimate
      const avgHealthScore = Math.min(100, Math.max(0, avgAdherence + (totalPatients > 0 ? Math.round((1 - atRiskCount / totalPatients) * 30) : 0)));

      setDiagnosis({ avgAdherence, atRiskCount, inactiveCount, totalPatients, bestProgram, avgHealthScore });

      // Opportunities
      const opps: Opportunity[] = [];
      if (inactivePatients.length > 0) {
        opps.push({ type: "reactivation", title: "Reativação de pacientes", description: `${inactivePatients.length} paciente(s) inativos há 5+ dias podem ser reengajados.`, patientCount: inactivePatients.length, icon: "🔄" });
      }
      if (lowAdherencePatients.length > 0) {
        opps.push({ type: "protocol", title: "Ajuste de protocolos", description: `${lowAdherencePatients.length} paciente(s) com adesão < 30% podem se beneficiar de protocolos simplificados.`, patientCount: lowAdherencePatients.length, icon: "📋" });
      }
      const noAnamnesis = patientIds.filter(pid => !(anamnesisRes.data || []).find(a => a.user_id === pid && a.status === "completed"));
      if (noAnamnesis.length > 0) {
        opps.push({ type: "upgrade", title: "Completar anamneses", description: `${noAnamnesis.length} paciente(s) sem anamnese completa — dados limitam a personalização.`, patientCount: noAnamnesis.length, icon: "📝" });
      }
      if (programList.length > 0 && totalPatients > 0) {
        // Check enrolled vs total
        const enrolledRes = await supabase.from("program_patients").select("patient_id").eq("status", "active");
        const enrolled = new Set((enrolledRes.data || []).map(e => e.patient_id));
        const notEnrolled = patientIds.filter(pid => !enrolled.has(pid));
        if (notEnrolled.length > 0) {
          opps.push({ type: "upgrade", title: "Inscrição em programas", description: `${notEnrolled.length} paciente(s) não estão em nenhum programa ativo.`, patientCount: notEnrolled.length, icon: "🚀" });
        }
      }
      setOpportunities(opps);

      // Recommendations
      const recs: Recommendation[] = [];
      if (inactivePatients.length > 0) recs.push({ action: `Contatar ${inactivePatients.length} paciente(s) inativo(s)`, reason: "Pacientes sem atividade há 5+ dias podem estar perdendo motivação.", priority: "high", category: "retenção" });
      if (atRiskCount > 0) recs.push({ action: "Agendar follow-ups para pacientes de risco", reason: `${atRiskCount} paciente(s) com adesão crítica precisam de acompanhamento.`, priority: "high", category: "acompanhamento" });
      if (noAnamnesis.length > 0) recs.push({ action: "Solicitar preenchimento de anamnese", reason: "Anamneses completas permitem personalização com IA.", priority: "medium", category: "dados" });
      if (programList.length === 0) recs.push({ action: "Criar primeiro programa", reason: "Programas estruturados aumentam a retenção em até 40%.", priority: "medium", category: "estratégia" });
      if (avgAdherence >= 70) recs.push({ action: "Compartilhar resultados positivos com pacientes", reason: "Reconhecimento reforça comportamentos positivos.", priority: "low", category: "motivação" });
      setRecommendations(recs);

      // Behavioral Insights
      const insights: BehavioralInsight[] = [];
      const difficulties = (checkinsRes.data || []).filter(c => c.difficulty).map(c => c.difficulty);
      const diffCounts: Record<string, number> = {};
      difficulties.forEach(d => { if (d) diffCounts[d] = (diffCounts[d] || 0) + 1; });
      const topDiff = Object.entries(diffCounts).sort((a, b) => b[1] - a[1]);
      if (topDiff.length > 0) {
        insights.push({ pattern: `Dificuldade mais comum: "${topDiff[0][0]}"`, description: `Reportada por ${topDiff[0][1]} check-in(s). Considere ajustar a abordagem.`, affectedCount: topDiff[0][1], trend: "stable" });
      }
      if (avgAdherence < 50) {
        insights.push({ pattern: "Adesão geral baixa", description: `A adesão média de ${avgAdherence}% indica necessidade de simplificar protocolos ou aumentar suporte.`, affectedCount: totalPatients, trend: "down" });
      } else if (avgAdherence >= 70) {
        insights.push({ pattern: "Adesão geral saudável", description: `${avgAdherence}% de adesão média indica boa aderência aos protocolos.`, affectedCount: totalPatients, trend: "up" });
      }
      if (inactiveCount > totalPatients * 0.3 && totalPatients > 0) {
        insights.push({ pattern: "Alta taxa de inatividade", description: `${Math.round((inactiveCount / totalPatients) * 100)}% dos pacientes estão inativos — risco de churn elevado.`, affectedCount: inactiveCount, trend: "down" });
      }
      setBehavioralInsights(insights);

    } catch (err) {
      console.error("AIStrategyCenter fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generateActionPlan = async () => {
    setGenerating(true);
    setActionPlan(null);
    try {
      const { data, error } = await supabase.functions.invoke("clinical-insights", {
        body: {
          aggregatedData: {
            dateRange: 7,
            totalPatients: diagnosis.totalPatients,
            avgAdherence: diagnosis.avgAdherence,
            avgHealthScore: diagnosis.avgHealthScore,
            highRiskCount: diagnosis.atRiskCount,
            totalCheckins: 0,
            riskDistribution: { high: diagnosis.atRiskCount, moderate: 0, low: diagnosis.totalPatients - diagnosis.atRiskCount },
            engagementBySex: {},
            adherenceByAge: {},
            topDifficulties: behavioralInsights.map(i => i.pattern),
          }
        }
      });
      if (error) throw error;
      setActionPlan(data?.summary || "Não foi possível gerar o plano de ação.");
      toast.success("Plano de ação semanal gerado!");
    } catch (err) {
      console.error("Action plan error:", err);
      toast.error("Erro ao gerar plano de ação");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const priorityColors: Record<string, string> = {
    high: "border-destructive/30 bg-destructive/5",
    medium: "border-warning/30 bg-warning/5",
    low: "border-info/30 bg-info/5",
  };
  const priorityText: Record<string, string> = {
    high: "text-destructive",
    medium: "text-warning",
    low: "text-info",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            Centro Estratégico IA
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Insights estratégicos e recomendações baseadas em IA</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={fetchData}>
          <RefreshCw className="w-4 h-4" /> Atualizar
        </Button>
      </div>

      {/* ── Section 1: Clinic Diagnosis ── */}
      <motion.div variants={item} initial="hidden" animate="show">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Diagnóstico da Clínica</h2>
              <p className="text-xs text-muted-foreground">Visão geral da saúde do seu consultório</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <DiagnosisCard label="Pacientes Ativos" value={diagnosis.totalPatients} icon={Users} color="primary" />
            <DiagnosisCard label="Adesão Média" value={`${diagnosis.avgAdherence}%`} icon={Target} color="success" />
            <DiagnosisCard label="Em Risco" value={diagnosis.atRiskCount} icon={AlertTriangle} color="destructive" />
            <DiagnosisCard label="Inativos" value={diagnosis.inactiveCount} icon={Users} color="warning" />
            <DiagnosisCard label="Health Score" value={diagnosis.avgHealthScore} icon={TrendingUp} color="primary" />
          </div>
          {diagnosis.bestProgram && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-muted-foreground">Melhor programa:</span>
              <span className="font-semibold">{diagnosis.bestProgram}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Section 2: Opportunities ── */}
      <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.1 }}>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Oportunidades Detectadas</h2>
              <p className="text-xs text-muted-foreground">Ações que podem melhorar resultados</p>
            </div>
          </div>
          {opportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma oportunidade identificada — excelente trabalho! 🎉</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {opportunities.map((opp, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 rounded-lg border border-border/50 bg-muted/10 hover:border-accent/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{opp.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{opp.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{opp.description}</p>
                      <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                        {opp.patientCount} paciente(s)
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Section 3: AI Recommendations ── */}
      <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.2 }}>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-info" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Recomendações da IA</h2>
              <p className="text-xs text-muted-foreground">Ações sugeridas por prioridade</p>
            </div>
          </div>
          {recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sem recomendações pendentes.</p>
          ) : (
            <div className="space-y-2">
              {recommendations.map((rec, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`p-3 rounded-lg border ${priorityColors[rec.priority]}`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${priorityText[rec.priority]}`} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{rec.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${rec.priority === "high" ? "bg-destructive/10 text-destructive" : rec.priority === "medium" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"}`}>
                          {rec.priority === "high" ? "Alta" : rec.priority === "medium" ? "Média" : "Baixa"} prioridade
                        </span>
                        <span className="text-[10px] text-muted-foreground">#{rec.category}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Section 4: Behavioral Insights ── */}
      <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.3 }}>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-warning" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Insights Comportamentais</h2>
              <p className="text-xs text-muted-foreground">Padrões detectados nos dados</p>
            </div>
          </div>
          {behavioralInsights.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Dados insuficientes para gerar insights comportamentais.</p>
          ) : (
            <div className="space-y-3">
              {behavioralInsights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    insight.trend === "up" ? "bg-success/10" : insight.trend === "down" ? "bg-destructive/10" : "bg-muted/30"
                  }`}>
                    <TrendingUp className={`w-4 h-4 ${
                      insight.trend === "up" ? "text-success" : insight.trend === "down" ? "text-destructive rotate-180" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{insight.pattern}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground flex-shrink-0">
                    {insight.affectedCount}p
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Weekly Action Plan Button ── */}
      <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.4 }}>
        <div className="glass rounded-xl p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-display font-semibold">Plano de Ação Semanal</h2>
                <p className="text-xs text-muted-foreground">Gerado pela IA com base nos dados atuais</p>
              </div>
            </div>
            <Button
              onClick={generateActionPlan}
              disabled={generating}
              className="gradient-primary shadow-glow gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              {generating ? "Gerando..." : "Gerar Plano de Ação Semanal"}
            </Button>
          </div>

          {actionPlan && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 p-4 rounded-lg bg-muted/20 border border-primary/20"
            >
              <div className="prose prose-sm prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                  {actionPlan}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function DiagnosisCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: any; color: string;
}) {
  return (
    <div className="rounded-lg bg-muted/20 border border-border/50 p-3 text-center">
      <div className={`w-8 h-8 rounded-lg bg-${color}/10 flex items-center justify-center mx-auto mb-2`}>
        <Icon className={`w-4 h-4 text-${color}`} />
      </div>
      <p className="font-display font-bold text-xl">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
