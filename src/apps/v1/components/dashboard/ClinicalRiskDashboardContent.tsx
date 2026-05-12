import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { useTenant } from "@v1/lib/tenantContext";
import { withTenantFilter } from "@v1/lib/tenantQueryHelpers";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle, Shield, Users, Activity, TrendingDown, Scale,
  UserX, Utensils, Clock, Flame, CheckCircle2, Eye, MessageSquare,
  CalendarDays, FileText, Filter, Search, X,
  BarChart3, Phone, CheckCheck, RefreshCw, Brain, TrendingUp, Zap, HeartPulse
} from "lucide-react";
import { Card, CardContent } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Skeleton } from "@v1/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@v1/components/ui/avatar";
import { Progress } from "@v1/components/ui/progress";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import TherapeuticSuggestionsPanel from "./TherapeuticSuggestionsPanel";
import BehavioralDropoutPanel from "./BehavioralDropoutPanel";

interface PatientRisk {
  patient_id: string;
  name: string;
  avatar_url?: string;
  goal?: string;
  last_weight?: number;
  adherence_7d: number;
  last_seen?: string;
  plan_status?: string;
  risk_score: number;
  alerts: ClinicalAlert[];
  calorie_target?: number;
  avg_calories?: number;
  // Longitudinal indicators
  weight_trend_status?: string;
  weight_velocity_kg_week?: number;
  adherence_momentum?: string;
  adherence_score_prev_7d?: number;
  engagement_index?: number;
  engagement_level?: string;
  // Adaptive indicators
  caloric_response_status?: string;
  stagnation_risk_level?: string;
  therapeutic_effectiveness?: string;
  adjustment_suggestions?: AdjustmentSuggestion[];
  // Cluster indicators (Phase 4)
  metabolic_cluster?: string;
  metabolic_cluster_confidence?: string;
  cluster_strategy?: any;
  metabolic_feature_vector?: any;
}

interface AdjustmentSuggestion {
  id: string;
  suggestion_type: string;
  status: string;
  current_value?: number;
  suggested_value?: number;
  delta_percent?: number;
  clinical_reason: string;
  confidence: string;
  metadata: any;
  created_at: string;
}

interface ClinicalAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  created_at: string;
  metadata: any;
}

const severityConfig: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  critical: { bg: "bg-destructive/10 border-destructive/30", text: "text-destructive", label: "Crítico", dot: "bg-destructive" },
  high: { bg: "bg-destructive/5 border-destructive/20", text: "text-destructive/80", label: "Alto", dot: "bg-destructive/70" },
  risk: { bg: "bg-warning/5 border-warning/20", text: "text-warning", label: "Em Risco", dot: "bg-warning" },
  attention: { bg: "bg-yellow-500/5 border-yellow-500/20", text: "text-yellow-600", label: "Atenção", dot: "bg-yellow-500" },
  medium: { bg: "bg-warning/5 border-warning/20", text: "text-warning", label: "Médio", dot: "bg-warning" },
  low: { bg: "bg-muted/50 border-border", text: "text-muted-foreground", label: "Baixo", dot: "bg-muted-foreground" },
  stable: { bg: "bg-muted/30 border-border", text: "text-muted-foreground", label: "Estável", dot: "bg-success" },
};

const alertTypeIcons: Record<string, any> = {
  low_adherence: TrendingDown,
  weight_stagnation: Scale,
  unexpected_weight_gain: Scale,
  low_checkin_frequency: Utensils,
  possible_abandonment: UserX,
  metabolic_signal: Activity,
  caloric_excess: Flame,
  metabolic_adaptation_risk: Brain,
};

const weightTrendLabels: Record<string, { label: string; color: string; icon: any }> = {
  fast_loss: { label: "Perda rápida", color: "text-warning", icon: TrendingDown },
  expected_loss: { label: "Perda esperada", color: "text-success", icon: TrendingDown },
  slow_loss: { label: "Perda lenta", color: "text-warning", icon: TrendingDown },
  stagnated: { label: "Estagnado", color: "text-destructive", icon: Scale },
  gaining: { label: "Ganhando", color: "text-destructive", icon: TrendingUp },
  unknown: { label: "—", color: "text-muted-foreground", icon: Scale },
};

const momentumLabels: Record<string, { label: string; color: string }> = {
  improving: { label: "↑ Melhorando", color: "text-success" },
  stable: { label: "→ Estável", color: "text-muted-foreground" },
  declining: { label: "↓ Caindo", color: "text-warning" },
  critical_drop: { label: "⚠ Queda Crítica", color: "text-destructive" },
};

const engagementLabels: Record<string, { label: string; color: string }> = {
  high_engagement: { label: "Alto", color: "text-success" },
  moderate: { label: "Moderado", color: "text-muted-foreground" },
  unstable: { label: "Instável", color: "text-warning" },
  drop_risk: { label: "Risco", color: "text-destructive" },
};

const caloricResponseLabels: Record<string, { label: string; status: "ok" | "warning" | "danger" | "neutral" }> = {
  hiperresponsivo: { label: "Hiperresponsivo", status: "warning" },
  responsivo: { label: "Responsivo", status: "ok" },
  neutro: { label: "Neutro", status: "neutral" },
  resistente: { label: "Resistente", status: "danger" },
  possivel_adaptacao_metabolica: { label: "Adaptação Metab.", status: "danger" },
};

const stagnationLabels: Record<string, { label: string; status: "ok" | "warning" | "danger" | "neutral" }> = {
  risco_baixo: { label: "Baixo", status: "ok" },
  risco_moderado: { label: "Moderado", status: "warning" },
  risco_alto: { label: "Alto", status: "danger" },
};

const effectivenessLabels: Record<string, { label: string; status: "ok" | "warning" | "danger" | "neutral" }> = {
  protocolo_eficaz: { label: "Eficaz", status: "ok" },
  eficacia_parcial: { label: "Parcial", status: "warning" },
  baixa_eficacia: { label: "Baixa Eficácia", status: "danger" },
  falha_terapeutica: { label: "Falha Terapêutica", status: "danger" },
  pending_evaluation: { label: "Avaliando...", status: "neutral" },
};

const clusterLabels: Record<string, { label: string; icon: string; color: string; description: string }> = {
  metabolic_responder: { label: "Respondedor", icon: "✅", color: "text-success", description: "Perda consistente com boa adesão" },
  metabolic_adaptive: { label: "Adaptativo", icon: "🔄", color: "text-warning", description: "Desaceleração metabólica em andamento" },
  behavioral_struggler: { label: "Lutador", icon: "💪", color: "text-warning", description: "Adesão instável, peso responsivo" },
  resistant_profile: { label: "Resistente", icon: "🛡️", color: "text-destructive", description: "Boa adesão, baixa resposta" },
  disengaging_patient: { label: "Desengajando", icon: "⚠️", color: "text-destructive", description: "Queda progressiva de engajamento" },
  unknown: { label: "Avaliando", icon: "⏳", color: "text-muted-foreground", description: "Dados insuficientes" },
};

function getRiskSeverity(score: number): string {
  if (score >= 60) return "critical";
  if (score >= 30) return "risk";
  if (score >= 10) return "attention";
  return "stable";
}

function getRowBg(score: number): string {
  if (score >= 60) return "bg-destructive/5 hover:bg-destructive/10";
  if (score >= 30) return "bg-warning/5 hover:bg-warning/10";
  return "hover:bg-muted/30";
}

export default function ClinicalRiskDashboardContent() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState<PatientRisk | null>(null);
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterPlanStatus, setFilterPlanStatus] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["clinical-risk-dashboard", user?.id],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      const userId = user!.id;
      const { data: rels } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", userId)
        .eq("status", "active");

      if (!rels || rels.length === 0) return { patients: [] };
      const patientIds = rels.map((r: any) => r.patient_id);

      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [alertsRes, profilesRes, checklistRes, sessionsRes, plansRes, assessRes, clinicalStateRes, suggestionsRes] = await Promise.all([
        withTenantFilter(supabase.from("clinical_alerts").select("*").eq("nutritionist_id", userId).eq("is_active", true).order("created_at", { ascending: false }), tenantId),
        supabase.from("profiles").select("user_id, full_name, avatar_url, weight_trend_status, weight_velocity_kg_week, adherence_momentum, adherence_score_7d, adherence_score_prev_7d, engagement_index, engagement_level").in("user_id", patientIds),
        withTenantFilter(supabase.from("checklist_tasks").select("patient_id, completed").in("patient_id", patientIds).gte("date", sevenDaysAgo.split("T")[0]), tenantId),
        supabase.from("user_sessions").select("user_id, last_seen_at").in("user_id", patientIds),
        withTenantFilter(supabase.from("meal_plans").select("patient_id, plan_status, generation_metadata, therapeutic_effectiveness_status").in("patient_id", patientIds).eq("is_active", true).order("created_at", { ascending: false }), tenantId),
        supabase.from("physical_assessments").select("patient_id, weight, assessment_date").in("patient_id", patientIds).order("assessment_date", { ascending: false }).limit(patientIds.length * 3),
        (supabase as any).from("patient_clinical_state").select("patient_id, caloric_response_status, stagnation_risk_level, metabolic_cluster, metabolic_cluster_confidence, cluster_strategy, metabolic_feature_vector").in("patient_id", patientIds),
        (supabase as any).from("meal_plan_adjustment_suggestions").select("*").in("patient_id", patientIds).eq("status", "pending").order("created_at", { ascending: false }),
      ]);

      const profileMap: Record<string, any> = {};
      (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      const alertsByPatient: Record<string, ClinicalAlert[]> = {};
      (alertsRes.data || []).forEach((a: any) => {
        if (!alertsByPatient[a.patient_id]) alertsByPatient[a.patient_id] = [];
        alertsByPatient[a.patient_id].push(a);
      });

      const checklistByPatient: Record<string, any[]> = {};
      (checklistRes.data || []).forEach((t: any) => {
        if (!checklistByPatient[t.patient_id]) checklistByPatient[t.patient_id] = [];
        checklistByPatient[t.patient_id].push(t);
      });

      const sessionMap: Record<string, any> = {};
      (sessionsRes.data || []).forEach((s: any) => { sessionMap[s.user_id] = s; });

      const planMap: Record<string, any> = {};
      (plansRes.data || []).forEach((p: any) => { if (!planMap[p.patient_id]) planMap[p.patient_id] = p; });

      const weightMap: Record<string, number> = {};
      (assessRes.data || []).forEach((a: any) => { if (!weightMap[a.patient_id] && a.weight) weightMap[a.patient_id] = a.weight; });

      const clinicalStateMap: Record<string, any> = {};
      (clinicalStateRes.data || []).forEach((s: any) => { clinicalStateMap[s.patient_id] = s; });

      const suggestionsByPatient: Record<string, AdjustmentSuggestion[]> = {};
      (suggestionsRes.data || []).forEach((s: any) => {
        if (!suggestionsByPatient[s.patient_id]) suggestionsByPatient[s.patient_id] = [];
        suggestionsByPatient[s.patient_id].push(s);
      });

      const patients: PatientRisk[] = patientIds.map((pid: string) => {
        const profile = profileMap[pid];
        const alerts = alertsByPatient[pid] || [];
        const checklist = checklistByPatient[pid] || [];
        const session = sessionMap[pid];
        const plan = planMap[pid];
        const clinicalState = clinicalStateMap[pid];

        const total = checklist.length;
        const completed = checklist.filter((t: any) => t.completed).length;
        const adherence = total > 0 ? Math.round((completed / total) * 100) : -1;

        const scoreMap: Record<string, number> = { critical: 40, high: 25, medium: 10, low: 5 };
        const riskScore = alerts.reduce((sum: number, a: ClinicalAlert) => sum + (scoreMap[a.severity] || 0), 0);

        const meta = plan?.generation_metadata;

        return {
          patient_id: pid,
          name: profile?.full_name || "Paciente",
          avatar_url: profile?.avatar_url,
          goal: meta?.goal || undefined,
          last_weight: weightMap[pid],
          adherence_7d: adherence,
          last_seen: session?.last_seen_at,
          plan_status: plan?.plan_status,
          risk_score: riskScore,
          alerts,
          calorie_target: meta?.calorie_target,
          avg_calories: undefined,
          weight_trend_status: profile?.weight_trend_status || "unknown",
          weight_velocity_kg_week: profile?.weight_velocity_kg_week || 0,
          adherence_momentum: profile?.adherence_momentum || "stable",
          adherence_score_prev_7d: profile?.adherence_score_prev_7d || 0,
          engagement_index: profile?.engagement_index || 0,
          engagement_level: profile?.engagement_level || "moderate",
          caloric_response_status: clinicalState?.caloric_response_status,
          stagnation_risk_level: clinicalState?.stagnation_risk_level,
          therapeutic_effectiveness: plan?.therapeutic_effectiveness_status,
          adjustment_suggestions: suggestionsByPatient[pid] || [],
          metabolic_cluster: clinicalState?.metabolic_cluster,
          metabolic_cluster_confidence: clinicalState?.metabolic_cluster_confidence,
          cluster_strategy: clinicalState?.cluster_strategy,
          metabolic_feature_vector: clinicalState?.metabolic_feature_vector,
        };
      });

      patients.sort((a, b) => b.risk_score - a.risk_score);
      return { patients };
    },
  });

  const patients = data?.patients || [];

  const kpis = useMemo(() => {
    const critical = patients.filter(p => p.risk_score >= 60).length;
    const risk = patients.filter(p => p.risk_score >= 30 && p.risk_score < 60).length;
    const stable = patients.filter(p => p.risk_score < 10).length;
    const attention = patients.filter(p => p.risk_score >= 10 && p.risk_score < 30).length;
    const withAdherence = patients.filter(p => p.adherence_7d >= 0);
    const avgAdherence = withAdherence.length > 0
      ? Math.round(withAdherence.reduce((s, p) => s + p.adherence_7d, 0) / withAdherence.length)
      : 0;
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000);
    const noLogin = patients.filter(p => !p.last_seen || new Date(p.last_seen) < fiveDaysAgo).length;
    const metabolicRisk = patients.filter(p => p.weight_trend_status === "stagnated" || p.weight_trend_status === "slow_loss").length;
    return { critical, risk, attention, stable, avgAdherence, noLogin, metabolicRisk };
  }, [patients]);

  const filtered = useMemo(() => {
    let list = patients;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    if (filterSeverity !== "all") {
      list = list.filter(p => getRiskSeverity(p.risk_score) === filterSeverity);
    }
    if (filterPlanStatus !== "all") {
      list = list.filter(p => p.plan_status === filterPlanStatus);
    }
    return list;
  }, [patients, search, filterSeverity, filterPlanStatus]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Risco Clínico</h2>
          <p className="text-muted-foreground text-sm">Cockpit de priorização · {patients.length} pacientes monitorados</p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <Activity className="w-3 h-3" />
          Auto-refresh 5 min
        </Badge>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={Flame} label="Críticos" value={kpis.critical} color="destructive" />
          <KpiCard icon={AlertTriangle} label="Em Risco" value={kpis.risk} color="warning" />
          <KpiCard icon={Shield} label="Atenção" value={kpis.attention} color="primary" />
          <KpiCard icon={BarChart3} label="Adesão Média" value={`${kpis.avgAdherence}%`} color="primary" />
          <KpiCard icon={UserX} label="Sem Login > 5d" value={kpis.noLogin} color="muted" />
          <KpiCard icon={Brain} label="Risco Metabólico" value={kpis.metabolicRisk} color="warning" />
        </div>
      )}

      <BehavioralDropoutPanel />

      <TherapeuticSuggestionsPanel />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[160px] rounded-xl">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue placeholder="Severidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="risk">Em Risco</SelectItem>
            <SelectItem value="attention">Atenção</SelectItem>
            <SelectItem value="stable">Estável</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPlanStatus} onValueChange={setFilterPlanStatus}>
          <SelectTrigger className="w-[180px] rounded-xl">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue placeholder="Status do plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="draft_auto_generated">Rascunho</SelectItem>
            <SelectItem value="under_professional_review">Em Revisão</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="published_to_patient">Publicado</SelectItem>
          </SelectContent>
        </Select>
        {(search || filterSeverity !== "all" || filterPlanStatus !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterSeverity("all"); setFilterPlanStatus("all"); }}>
            <X className="w-4 h-4 mr-1" /> Limpar
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum paciente encontrado</p>
          <p className="text-sm">Ajuste os filtros ou aguarde a próxima análise</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="hidden lg:grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr,80px] gap-3 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <span>Paciente</span>
            <span>Tendência Peso</span>
            <span>Adesão</span>
            <span>Momentum</span>
            <span>Engajamento</span>
            <span>Último Acesso</span>
            <span className="text-right">Risco</span>
          </div>

          {filtered.map((patient) => {
            const sev = getRiskSeverity(patient.risk_score);
            const config = severityConfig[sev];
            const daysSinceLogin = patient.last_seen
              ? Math.floor((Date.now() - new Date(patient.last_seen).getTime()) / 86400000)
              : null;
            const wt = weightTrendLabels[patient.weight_trend_status || "unknown"] || weightTrendLabels.unknown;
            const mom = momentumLabels[patient.adherence_momentum || "stable"] || momentumLabels.stable;
            const eng = engagementLabels[patient.engagement_level || "moderate"] || engagementLabels.moderate;

            return (
              <motion.div
                key={patient.patient_id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border p-3 lg:p-4 cursor-pointer transition-all ${getRowBg(patient.risk_score)} ${config.bg}`}
                onClick={() => setSelectedPatient(patient)}
              >
                <div className="grid grid-cols-[1fr,auto] lg:grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr,80px] gap-2 lg:gap-3 items-center">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                        {patient.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{patient.name}</p>
                      {patient.last_weight && (
                        <p className="text-[10px] text-muted-foreground">{patient.last_weight} kg</p>
                      )}
                    </div>
                    {patient.alerts.length > 0 && (
                      <Badge variant="outline" className="text-[10px] shrink-0 gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {patient.alerts.length}
                      </Badge>
                    )}
                  </div>

                  <div className="hidden lg:flex items-center gap-1.5">
                    <wt.icon className={`w-3.5 h-3.5 ${wt.color}`} />
                    <span className={`text-xs font-medium ${wt.color}`}>{wt.label}</span>
                  </div>

                  <div className="hidden lg:block">
                    {patient.adherence_7d >= 0 ? (
                      <div className="flex items-center gap-2">
                        <Progress value={patient.adherence_7d} className="h-2 w-14" />
                        <span className={`text-xs font-medium ${patient.adherence_7d < 60 ? "text-destructive" : patient.adherence_7d < 80 ? "text-warning" : "text-success"}`}>
                          {patient.adherence_7d}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  <div className="hidden lg:block">
                    <span className={`text-xs font-medium ${mom.color}`}>{mom.label}</span>
                  </div>

                  <div className="hidden lg:flex items-center gap-1.5">
                    <Zap className={`w-3 h-3 ${eng.color}`} />
                    <span className={`text-xs ${eng.color}`}>{patient.engagement_index}</span>
                  </div>

                  <div className="hidden lg:block">
                    {daysSinceLogin !== null ? (
                      <span className={`text-xs ${daysSinceLogin > 5 ? "text-destructive font-medium" : daysSinceLogin > 3 ? "text-warning" : "text-muted-foreground"}`}>
                        {daysSinceLogin === 0 ? "Hoje" : daysSinceLogin === 1 ? "Ontem" : `${daysSinceLogin}d`}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                    <span className={`text-sm font-bold ${config.text}`}>{patient.risk_score}</span>
                  </div>
                </div>

                <div className="flex lg:hidden gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                  {patient.adherence_7d >= 0 && <span>Adesão: {patient.adherence_7d}%</span>}
                  <span className={wt.color}>{wt.label}</span>
                  <span className={mom.color}>{mom.label}</span>
                  <span>Eng: {patient.engagement_index}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <PatientRiskModal
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
        onNavigate={(path) => navigate(path)}
      />
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-${color}/10 flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 text-${color}`} />
        </div>
        <div>
          <p className="font-display text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanStatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    draft_auto_generated: { label: "Rascunho", variant: "outline" },
    under_professional_review: { label: "Revisão", variant: "secondary" },
    approved: { label: "Aprovado", variant: "default" },
    published_to_patient: { label: "Publicado", variant: "default" },
  };
  const config = map[status || ""] || { label: status || "—", variant: "outline" as const };
  return <Badge variant={config.variant} className="text-[10px]">{config.label}</Badge>;
}

function PatientRiskModal({
  patient,
  onClose,
  onNavigate,
}: {
  patient: PatientRisk | null;
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const queryClient = useQueryClient();
  const [resolving, setResolving] = useState<string | null>(null);
  const [contacting, setContacting] = useState(false);

  if (!patient) return null;
  const sev = getRiskSeverity(patient.risk_score);
  const config = severityConfig[sev];
  const wt = weightTrendLabels[patient.weight_trend_status || "unknown"] || weightTrendLabels.unknown;
  const mom = momentumLabels[patient.adherence_momentum || "stable"] || momentumLabels.stable;
  const eng = engagementLabels[patient.engagement_level || "moderate"] || engagementLabels.moderate;

  const handleResolveAlert = async (alertId: string) => {
    setResolving(alertId);
    try {
      const { data, error } = await supabase.rpc("resolve_alert", { _alert_id: alertId });
      if (error) throw error;
      toast.success("Alerta resolvido com sucesso");
      queryClient.invalidateQueries({ queryKey: ["clinical-risk-dashboard"] });
      onClose();
    } catch (err: any) {
      toast.error("Erro ao resolver alerta: " + err.message);
    } finally {
      setResolving(null);
    }
  };

  const handleApproveSuggestion = async (suggestionId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("meal_plan_adjustment_suggestions")
        .update({ status: "approved", resolved_at: new Date().toISOString(), resolved_by: patient.patient_id })
        .eq("id", suggestionId);
      if (error) throw error;
      toast.success("Sugestão aprovada");
      queryClient.invalidateQueries({ queryKey: ["clinical-risk-dashboard"] });
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("meal_plan_adjustment_suggestions")
        .update({ status: "rejected", resolved_at: new Date().toISOString(), resolved_by: patient.patient_id })
        .eq("id", suggestionId);
      if (error) throw error;
      toast.success("Sugestão rejeitada");
      queryClient.invalidateQueries({ queryKey: ["clinical-risk-dashboard"] });
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleMarkContacted = async () => {
    setContacting(true);
    try {
      const { error } = await supabase.rpc("mark_patient_contacted", {
        _patient_id: patient.patient_id,
        _contact_method: "chat",
      });
      if (error) throw error;
      toast.success("Contato registrado na timeline");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setContacting(false);
    }
  };

  const handleFlagReview = async () => {
    try {
      const { error } = await supabase.rpc("flag_plan_review_needed", {
        _patient_id: patient.patient_id,
        _reason: "Revisão solicitada via cockpit de risco clínico",
      });
      if (error) throw error;
      toast.success("Plano marcado para revisão");
      queryClient.invalidateQueries({ queryKey: ["clinical-risk-dashboard"] });
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const formatMetricExplanation = (meta: any): string | null => {
    if (!meta?.metric) return null;
    const metricLabels: Record<string, string> = {
      adherence: "Adesão alimentar",
      weight_variation: "Variação de peso",
      weight_gain: "Ganho de peso",
      checkin_frequency: "Frequência de registros",
      login_recency: "Último acesso",
      caloric_intake: "Ingestão calórica",
      metabolic_adaptation: "Adaptação metabólica",
    };
    const dirLabels: Record<string, string> = {
      below_expected: "abaixo do esperado",
      above_expected: "acima do esperado",
      stagnant: "estagnado",
      metabolic_plateau: "platô metabólico detectado",
    };
    const label = metricLabels[meta.metric] || meta.metric;
    const dir = dirLabels[meta.direction] || "";

    if (meta.metric === "metabolic_adaptation") {
      return `${label}: Adesão ${meta.measured_value}% com tendência ${meta.weight_trend} · Plano ativo há ${meta.plan_active_days}d · Janela de análise: ${meta.analysis_window_days}d`;
    }

    return `${label}: ${meta.measured_value}${meta.metric === "adherence" ? "%" : meta.metric === "caloric_intake" ? " kcal" : ""} ${dir} (limite: ${meta.threshold}${meta.metric === "adherence" ? "%" : meta.metric === "caloric_intake" ? " kcal" : ""}) · ${meta.period_days}d`;
  };

  return (
    <Dialog open={!!patient} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                {patient.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-display text-lg">{patient.name}</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                <span className={`text-xs ${config.text}`}>Score de Risco: {patient.risk_score} ({config.label})</span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-4">
            {/* Longitudinal Indicators */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" /> Inteligência Longitudinal
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <IndicatorCard
                  label="Tendência Peso"
                  value={wt.label}
                  icon={wt.icon}
                  status={wt.color.includes("success") ? "ok" : wt.color.includes("destructive") ? "danger" : wt.color.includes("warning") ? "warning" : "neutral"}
                  subtitle={patient.weight_velocity_kg_week ? `${patient.weight_velocity_kg_week > 0 ? "+" : ""}${patient.weight_velocity_kg_week.toFixed(2)} kg/sem` : undefined}
                />
                <IndicatorCard
                  label="Momentum Adesão"
                  value={mom.label}
                  icon={HeartPulse}
                  status={mom.color.includes("success") ? "ok" : mom.color.includes("destructive") ? "danger" : mom.color.includes("warning") ? "warning" : "neutral"}
                  subtitle={`${patient.adherence_7d >= 0 ? patient.adherence_7d : 0}% atual · ${patient.adherence_score_prev_7d || 0}% anterior`}
                />
                <IndicatorCard
                  label="Engajamento"
                  value={`${patient.engagement_index}/100`}
                  icon={Zap}
                  status={eng.color.includes("success") ? "ok" : eng.color.includes("destructive") ? "danger" : eng.color.includes("warning") ? "warning" : "neutral"}
                  subtitle={eng.label}
                />
                <IndicatorCard label="Último Acesso" value={
                  patient.last_seen
                    ? `${Math.floor((Date.now() - new Date(patient.last_seen).getTime()) / 86400000)}d atrás`
                    : "—"
                } icon={Clock}
                  status={!patient.last_seen || (Date.now() - new Date(patient.last_seen).getTime()) > 5 * 86400000 ? "danger" : "ok"} />
              </div>
            </section>

            {/* Metabolic Cluster (Phase 4) */}
            {patient.metabolic_cluster && patient.metabolic_cluster !== "unknown" && (
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5" /> Cluster Metabólico
                </h3>
                <div className="rounded-lg border bg-card/50 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{clusterLabels[patient.metabolic_cluster]?.icon || "❓"}</span>
                    <div>
                      <p className={`text-sm font-bold ${clusterLabels[patient.metabolic_cluster]?.color || "text-foreground"}`}>
                        {clusterLabels[patient.metabolic_cluster]?.label || patient.metabolic_cluster}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {clusterLabels[patient.metabolic_cluster]?.description}
                        {patient.metabolic_cluster_confidence && (
                          <> · Confiança: {patient.metabolic_cluster_confidence === "high" ? "Alta" : patient.metabolic_cluster_confidence === "medium" ? "Média" : "Baixa"}</>
                        )}
                      </p>
                    </div>
                  </div>

                  {patient.cluster_strategy && (
                    <div className="space-y-2 border-t pt-2">
                      <p className="text-[11px] font-semibold text-muted-foreground">Estratégia Recomendada</p>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div><span className="text-muted-foreground">Abordagem:</span> <span className="font-medium">{patient.cluster_strategy.nutrition_strategy}</span></div>
                        <div><span className="text-muted-foreground">Complexidade:</span> <span className="font-medium capitalize">{patient.cluster_strategy.plan_complexity}</span></div>
                        <div><span className="text-muted-foreground">Intervenção:</span> <span className="font-medium capitalize">{patient.cluster_strategy.intervention_frequency}</span></div>
                        <div><span className="text-muted-foreground">Foco:</span> <span className="font-medium capitalize">{patient.cluster_strategy.focus_area}</span></div>
                      </div>
                      {patient.cluster_strategy.recommendations && (
                        <ul className="space-y-0.5 mt-1">
                          {patient.cluster_strategy.recommendations.map((rec: string, i: number) => (
                            <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                              <span className="text-primary mt-0.5">•</span> {rec}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {patient.metabolic_feature_vector && (
                    <div className="border-t pt-2">
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Vel. peso: {patient.metabolic_feature_vector.weight_velocity_avg} kg/sem ·
                        Adesão 30d: {patient.metabolic_feature_vector.adherence_avg_30d}% ·
                        Estabilidade: {patient.metabolic_feature_vector.adherence_stability}/100 ·
                        Interação: {patient.metabolic_feature_vector.plan_interaction_rate}%
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {(patient.caloric_response_status || patient.stagnation_risk_level || (patient.adjustment_suggestions && patient.adjustment_suggestions.length > 0)) && (
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Motor Adaptativo
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {patient.caloric_response_status && (
                    <IndicatorCard
                      label="Resposta Calórica"
                      value={caloricResponseLabels[patient.caloric_response_status]?.label || patient.caloric_response_status}
                      icon={Flame}
                      status={caloricResponseLabels[patient.caloric_response_status]?.status || "neutral"}
                    />
                  )}
                  {patient.stagnation_risk_level && (
                    <IndicatorCard
                      label="Risco Estagnação"
                      value={stagnationLabels[patient.stagnation_risk_level]?.label || patient.stagnation_risk_level}
                      icon={AlertTriangle}
                      status={stagnationLabels[patient.stagnation_risk_level]?.status || "neutral"}
                    />
                  )}
                  {patient.therapeutic_effectiveness && (
                    <IndicatorCard
                      label="Eficácia do Plano"
                      value={effectivenessLabels[patient.therapeutic_effectiveness]?.label || patient.therapeutic_effectiveness}
                      icon={Shield}
                      status={effectivenessLabels[patient.therapeutic_effectiveness]?.status || "neutral"}
                    />
                  )}
                </div>

                {patient.adjustment_suggestions && patient.adjustment_suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground">Sugestões de Ajuste</p>
                    {patient.adjustment_suggestions.map((sug) => (
                      <div key={sug.id} className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="flex items-start gap-2">
                          <TrendingUp className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px]">
                                {sug.suggestion_type === "caloric_adjustment" ? "Ajuste Calórico" : "Troca de Template"}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                Confiança: {sug.confidence === "high" ? "Alta" : sug.confidence === "medium" ? "Média" : "Baixa"}
                              </Badge>
                            </div>
                            <p className="text-xs leading-relaxed">{sug.clinical_reason}</p>
                            {sug.current_value && sug.suggested_value && (
                              <p className="text-[10px] font-mono bg-muted/30 rounded px-1.5 py-0.5 inline-block mt-1">
                                {sug.current_value} kcal → {sug.suggested_value} kcal ({sug.delta_percent! > 0 ? "+" : ""}{sug.delta_percent}%)
                              </p>
                            )}
                            {sug.metadata && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Resp. calórica: {sug.metadata.caloric_response} · Adesão 28d: {sug.metadata.adherence_28d}% · Plano: {sug.metadata.plan_active_days}d
                              </p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Button
                                variant="default"
                                size="sm"
                                className="h-6 text-[10px] gap-1"
                                onClick={(e) => { e.stopPropagation(); handleApproveSuggestion(sug.id); }}
                              >
                                <CheckCheck className="w-3 h-3" /> Aprovar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] gap-1"
                                onClick={(e) => { e.stopPropagation(); handleRejectSuggestion(sug.id); }}
                              >
                                <X className="w-3 h-3" /> Rejeitar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Indicadores Clássicos</h3>
              <div className="grid grid-cols-2 gap-3">
                <IndicatorCard label="Adesão 7d" value={patient.adherence_7d >= 0 ? `${patient.adherence_7d}%` : "—"} icon={BarChart3}
                  status={patient.adherence_7d < 60 ? "danger" : patient.adherence_7d < 80 ? "warning" : "ok"} />
                <IndicatorCard label="Último Peso" value={patient.last_weight ? `${patient.last_weight} kg` : "—"} icon={Scale} status="neutral" />
                <IndicatorCard label="Meta Calórica" value={patient.calorie_target ? `${patient.calorie_target} kcal` : "—"} icon={Utensils} status="neutral" />
                <IndicatorCard label="Status Plano" value={patient.plan_status?.replace(/_/g, " ") || "—"} icon={FileText} status="neutral" />
              </div>
            </section>

            {patient.alerts.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Alertas Ativos ({patient.alerts.length})
                </h3>
                <div className="space-y-2">
                  {patient.alerts.map((alert) => {
                    const ac = severityConfig[alert.severity] || severityConfig.medium;
                    const TypeIcon = alertTypeIcons[alert.alert_type] || Activity;
                    const explanation = formatMetricExplanation(alert.metadata);
                    return (
                      <div key={alert.id} className={`rounded-lg border p-3 ${ac.bg}`}>
                        <div className="flex items-start gap-2">
                          <TypeIcon className="w-4 h-4 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={`text-[10px] ${ac.text}`}>{ac.label}</Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(alert.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed">{alert.description}</p>
                            {explanation && (
                              <p className="text-[10px] text-muted-foreground mt-1 font-mono bg-muted/30 rounded px-1.5 py-0.5 inline-block">
                                {explanation}
                              </p>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-1.5 h-6 text-[10px] gap-1 text-success hover:text-success"
                              disabled={resolving === alert.id}
                              onClick={(e) => { e.stopPropagation(); handleResolveAlert(alert.id); }}
                            >
                              <CheckCheck className="w-3 h-3" />
                              {resolving === alert.id ? "Resolvendo..." : "Resolver Alerta"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ações Clínicas</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={() => { onClose(); onNavigate(`/patients/${patient.patient_id}`); }}>
                  <Eye className="w-4 h-4" /> Ver Paciente
                </Button>
                <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={handleFlagReview}>
                  <RefreshCw className="w-4 h-4" /> Revisar Plano
                </Button>
                <Button variant="outline" size="sm" className="gap-2 justify-start" disabled={contacting} onClick={handleMarkContacted}>
                  <Phone className="w-4 h-4" /> {contacting ? "Registrando..." : "Registrar Contato"}
                </Button>
                <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={() => { onClose(); onNavigate(`/chat`); }}>
                  <MessageSquare className="w-4 h-4" /> Enviar Mensagem
                </Button>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function IndicatorCard({ label, value, icon: Icon, status, subtitle }: {
  label: string; value: string; icon: any; status: "ok" | "warning" | "danger" | "neutral"; subtitle?: string;
}) {
  const colors = {
    ok: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    neutral: "text-foreground",
  };
  return (
    <div className="rounded-lg border bg-card/50 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-sm font-bold ${colors[status]}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}
