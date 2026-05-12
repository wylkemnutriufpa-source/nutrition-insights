import { useState } from "react";
import { useAuth } from "@v1/lib/auth";
import { useTenant } from "@v1/lib/tenantContext";
import { withTenantFilter } from "@v1/lib/tenantQueryHelpers";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Skeleton } from "@v1/components/ui/skeleton";
import { Progress } from "@v1/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Brain, RefreshCw, Loader2, AlertTriangle, Shield, Users, TrendingUp,
  Phone, FileText, Calendar, Heart, Eye, Zap, Target, Activity, MessageCircle,
  Compass, ArrowRight, CheckCircle2, BarChart3
} from "lucide-react";

// ═══════════════════════════════════════════
// Config
// ═══════════════════════════════════════════
const CLASSIFICATION_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  urgente: { label: "Urgente", color: "text-red-400", bgColor: "bg-red-500/20" },
  alta_prioridade: { label: "Alta", color: "text-amber-400", bgColor: "bg-amber-500/20" },
  media_prioridade: { label: "Médio", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  monitoramento: { label: "Monitoramento", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
};

const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  immediate_protocol_adjustment: { label: "Ajuste Imediato", icon: Zap, color: "text-red-400" },
  schedule_followup_contact: { label: "Agendar Retorno", icon: Calendar, color: "text-blue-400" },
  apply_behavioral_simplification: { label: "Simplificar Plano", icon: Heart, color: "text-pink-400" },
  initiate_diet_break_review: { label: "Avaliar Diet Break", icon: Activity, color: "text-purple-400" },
  monitor_without_change: { label: "Monitorar", icon: Eye, color: "text-emerald-400" },
  escalate_risk_management: { label: "Escalar Risco", icon: AlertTriangle, color: "text-red-400" },
};

const GROUP_CONFIG: Record<string, { label: string; icon: any; color: string; emoji: string }> = {
  intervencao_urgente: { label: "Intervenção Urgente", icon: AlertTriangle, color: "text-red-400", emoji: "🔴" },
  ajuste_protocolo: { label: "Ajuste de Protocolo", icon: Zap, color: "text-amber-400", emoji: "🟡" },
  simplificacao_comportamental: { label: "Recuperação Comportamental", icon: Heart, color: "text-pink-400", emoji: "💜" },
  monitoramento_leve: { label: "Monitoramento", icon: Eye, color: "text-blue-400", emoji: "🔵" },
  evolucao_positiva: { label: "Evolução Positiva", icon: TrendingUp, color: "text-emerald-400", emoji: "🟢" },
};

const PORTFOLIO_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  carteira_saudavel: { label: "Saudável", color: "text-emerald-400", emoji: "🟢" },
  carteira_estavel: { label: "Estável", color: "text-blue-400", emoji: "🔵" },
  carteira_em_alerta: { label: "Em Alerta", color: "text-amber-400", emoji: "🟡" },
  carteira_critica: { label: "Crítica", color: "text-red-400", emoji: "🔴" },
};

// ═══════════════════════════════════════════
// Hooks
// ═══════════════════════════════════════════
function usePortfolioState() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["portfolio-state", user?.id],
    enabled: !!user,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_portfolio_state")
        .select("*")
        .eq("nutritionist_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useTherapeuticPriorities() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["therapeutic-priorities", user?.id],
    enabled: !!user,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_therapeutic_priority_state")
        .select("*")
        .eq("nutritionist_id", user!.id)
        .order("therapeutic_priority_score", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });
}

function useActionGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["action-groups", user?.id],
    enabled: !!user,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("organization_action_groups_snapshot")
        .select("*")
        .eq("nutritionist_id", user!.id)
        .eq("snapshot_date", today);
      if (error) throw error;
      return data || [];
    },
  });
}

function useActionRecommendations() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["action-recommendations", user?.id, tenantId],
    enabled: !!user,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await withTenantFilter(
        supabase
          .from("clinical_action_recommendations")
          .select("*")
          .eq("nutritionist_id", user!.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(20),
        tenantId
      );
      if (error) throw error;
      return data || [];
    },
  });
}

function useWeeklyPlan() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["weekly-orchestration", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const monday = getMonday(new Date()).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("weekly_clinical_orchestration_plan")
        .select("*")
        .eq("nutritionist_id", user!.id)
        .eq("week_start", monday)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function usePatientNames(ids: string[]) {
  return useQuery({
    queryKey: ["patient-names-orch", ids.join(",")],
    enabled: ids.length > 0,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.user_id] = p.full_name; });
      return map;
    },
  });
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(new Date(d).setDate(diff));
}

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════
export default function ClinicalOrchestration() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("urgent");

  const { data: portfolio, isLoading: loadingPortfolio } = usePortfolioState();
  const { data: priorities, isLoading: loadingPriorities } = useTherapeuticPriorities();
  const { data: actionGroups } = useActionGroups();
  const { data: actions } = useActionRecommendations();
  const { data: weeklyPlan } = useWeeklyPlan();

  const allPatientIds = [...new Set([
    ...(priorities || []).map((p: any) => p.patient_id),
    ...(actions || []).map((a: any) => a.patient_id),
  ])];
  const { data: names } = usePatientNames(allPatientIds);

  const runEngine = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("compute-therapeutic-orchestration-engine", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Orquestração processou ${data.processed} pacientes, ${data.action_recommendations} ações`);
      queryClient.invalidateQueries({ queryKey: ["portfolio-state"] });
      queryClient.invalidateQueries({ queryKey: ["therapeutic-priorities"] });
      queryClient.invalidateQueries({ queryKey: ["action-groups"] });
      queryClient.invalidateQueries({ queryKey: ["action-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-orchestration"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const markActed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clinical_action_recommendations")
        .update({ status: "acted", acted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ação registrada");
      queryClient.invalidateQueries({ queryKey: ["action-recommendations"] });
    },
  });

  const urgentPatients = (priorities || []).filter((p: any) => p.priority_classification === "urgente");
  const highPatients = (priorities || []).filter((p: any) => p.priority_classification === "alta_prioridade");
  const behavioralPatients = (priorities || []).filter((p: any) => p.action_group === "simplificacao_comportamental");
  const monitoringPatients = (priorities || []).filter((p: any) => p.priority_classification === "monitoramento");
  const portfolioConf = PORTFOLIO_CONFIG[portfolio?.portfolio_classification ?? "carteira_estavel"];

  const weeklyPatients = (weeklyPlan?.prioritized_patients as any[]) || [];
  const days = ["segunda", "terca", "quarta", "quinta", "sexta"];
  const dayLabels: Record<string, string> = { segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta", sexta: "Sexta" };

  // Weekly focus message
  const groupMap: Record<string, number> = {};
  (actionGroups || []).forEach((g: any) => { groupMap[g.group_type] = g.patients_count; });
  const totalGrouped = Object.values(groupMap).reduce((s, v) => s + v, 0);
  const focusMessage = totalGrouped > 0 ? (
    (groupMap["intervencao_urgente"] || 0) / totalGrouped > 0.2
      ? "⚠️ Priorizar intervenções urgentes — carteira com alta concentração de risco"
      : (groupMap["simplificacao_comportamental"] || 0) / totalGrouped > 0.15
        ? "🧠 Foco em recuperação comportamental — simplificar planos e reengajar pacientes"
        : (groupMap["evolucao_positiva"] || 0) / totalGrouped > 0.5
          ? "✅ Semana positiva — carteira estável, focar em otimização e manutenção"
          : "📋 Semana equilibrada — distribuir atenção entre ajustes e monitoramento"
  ) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Compass className="h-7 w-7 text-primary" />
              Cockpit de Orquestração Clínica
            </h1>
            <p className="text-muted-foreground mt-1">
              Copiloto terapêutico semi-autônomo • Engine v1.0.0
            </p>
          </div>
          <Button size="sm" onClick={() => runEngine.mutate()} disabled={runEngine.isPending}>
            {runEngine.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Recalcular
          </Button>
        </div>

        {/* Portfolio Health + Focus */}
        {loadingPortfolio ? (
          <Skeleton className="h-28" />
        ) : portfolio ? (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <div className="text-xs text-muted-foreground mb-1">Saúde da Carteira</div>
                  <div className={`text-2xl font-bold ${portfolioConf?.color}`}>
                    {portfolioConf?.emoji} {portfolio.portfolio_health_score?.toFixed(0)}
                  </div>
                  <div className={`text-xs ${portfolioConf?.color}`}>{portfolioConf?.label}</div>
                </div>
                {[
                  { label: "Pacientes", value: portfolio.total_patients },
                  { label: "Urgentes", value: urgentPatients.length, color: "text-red-400" },
                  { label: "Alta Prioridade", value: highPatients.length, color: "text-amber-400" },
                  { label: "Adesão Média", value: `${(portfolio.avg_adherence ?? 0).toFixed(0)}%` },
                  { label: "% em Risco", value: `${(portfolio.patients_at_risk_percent ?? 0).toFixed(0)}%`, color: "text-red-400" },
                ].map((s, i) => (
                  <div key={i}>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className={`text-xl font-bold ${s.color || "text-foreground"}`}>{s.value}</div>
                  </div>
                ))}
              </div>
              {focusMessage && (
                <div className="bg-muted/30 rounded-lg p-3 text-sm text-foreground font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary shrink-0" />
                  <span>{focusMessage}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Action Groups Summary */}
        {actionGroups && actionGroups.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(GROUP_CONFIG).map(([key, config]) => {
              const group = actionGroups.find((g: any) => g.group_type === key);
              const GroupIcon = config.icon;
              return (
                <Card key={key} className="bg-card/50 border-border/50">
                  <CardContent className="p-3 text-center">
                    <GroupIcon className={`h-5 w-5 mx-auto mb-1 ${config.color}`} />
                    <div className="text-lg font-bold text-foreground">{group?.patients_count || 0}</div>
                    <div className="text-[10px] text-muted-foreground">{config.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="urgent">🔥 Urgentes ({urgentPatients.length})</TabsTrigger>
            <TabsTrigger value="strategic">⚡ Estratégicos ({actions?.length || 0})</TabsTrigger>
            <TabsTrigger value="behavioral">💜 Comportamental ({behavioralPatients.length})</TabsTrigger>
            <TabsTrigger value="monitoring">🔵 Monitoramento ({monitoringPatients.length})</TabsTrigger>
            <TabsTrigger value="weekly">📅 Plano Semanal</TabsTrigger>
          </TabsList>

          {/* Urgent */}
          <TabsContent value="urgent" className="mt-4 space-y-3">
            {loadingPriorities ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
            ) : urgentPatients.length === 0 ? (
              <EmptyCard icon={Shield} message="Nenhum paciente com prioridade urgente." />
            ) : (
              urgentPatients.map((p: any) => (
                <TherapeuticCard key={p.id} patient={p} names={names} onOpen={() => navigate(`/patients/${p.patient_id}`)} />
              ))
            )}
          </TabsContent>

          {/* Strategic Actions */}
          <TabsContent value="strategic" className="mt-4 space-y-3">
            {!actions?.length ? (
              <EmptyCard icon={Target} message="Nenhuma ação estratégica pendente." />
            ) : actions.map((a: any) => {
              const ac = ACTION_CONFIG[a.recommended_action] || ACTION_CONFIG.monitor_without_change;
              const ActionIcon = ac.icon;
              return (
                <Card key={a.id} className="bg-card/50 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg bg-muted/50 ${ac.color}`}>
                          <ActionIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">{names?.[a.patient_id] || "Paciente"}</span>
                            <Badge variant="outline" className={ac.color}>{ac.label}</Badge>
                            <Badge variant="outline">{a.urgency_level}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{a.reason}</p>
                          <p className="text-xs text-muted-foreground">{a.expected_clinical_impact}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/patients/${a.patient_id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => markActed.mutate(a.id)}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Behavioral Recovery */}
          <TabsContent value="behavioral" className="mt-4 space-y-3">
            {behavioralPatients.length === 0 ? (
              <EmptyCard icon={Heart} message="Nenhum paciente necessitando recuperação comportamental." />
            ) : (
              behavioralPatients.map((p: any) => (
                <TherapeuticCard key={p.id} patient={p} names={names} onOpen={() => navigate(`/patients/${p.patient_id}`)} />
              ))
            )}
          </TabsContent>

          {/* Monitoring */}
          <TabsContent value="monitoring" className="mt-4 space-y-3">
            {monitoringPatients.length === 0 ? (
              <EmptyCard icon={Eye} message="Nenhum paciente em monitoramento leve." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {monitoringPatients.slice(0, 12).map((p: any) => (
                  <Card key={p.id} className="bg-card/30 border-border/30 cursor-pointer hover:border-primary/30 transition"
                    onClick={() => navigate(`/patients/${p.patient_id}`)}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-foreground text-sm">{names?.[p.patient_id] || "Paciente"}</div>
                          <div className="text-xs text-muted-foreground">{p.main_driver}</div>
                        </div>
                        <Badge variant="outline" className="text-emerald-400">
                          {p.therapeutic_priority_score?.toFixed(0)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Weekly Plan */}
          <TabsContent value="weekly" className="mt-4">
            {!weeklyPlan ? (
              <EmptyCard icon={Calendar} message="Nenhum plano semanal gerado. Execute o motor." />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span>Semana: {weeklyPlan.week_start}</span>
                  <span>Equilíbrio: {weeklyPlan.workload_balance_score?.toFixed(0)}%</span>
                  <span>Urgentes: {weeklyPlan.total_critical} | Altos: {weeklyPlan.total_high} | Médios: {weeklyPlan.total_medium}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {days.map(day => {
                    const dayPatients = weeklyPatients.filter((p: any) => p.suggested_day === day);
                    return (
                      <Card key={day} className="bg-card/50 border-border/50">
                        <CardHeader className="p-3 pb-1">
                          <CardTitle className="text-sm">{dayLabels[day]}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 space-y-2">
                          {dayPatients.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Sem prioridades</p>
                          ) : dayPatients.map((p: any, i: number) => {
                            const pc = CLASSIFICATION_CONFIG[p.priority_classification] || CLASSIFICATION_CONFIG.media_prioridade;
                            return (
                              <div
                                key={i}
                                className={`rounded-md p-2 ${pc.bgColor} cursor-pointer hover:opacity-80 transition`}
                                onClick={() => navigate(`/patients/${p.patient_id}`)}
                              >
                                <div className={`text-xs font-medium ${pc.color}`}>
                                  {names?.[p.patient_id] || "Paciente"}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {ACTION_CONFIG[p.recommended_action]?.label || p.recommended_action}
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ═══════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════
function TherapeuticCard({ patient, names, onOpen }: { patient: any; names: any; onOpen: () => void }) {
  const pc = CLASSIFICATION_CONFIG[patient.priority_classification] || CLASSIFICATION_CONFIG.media_prioridade;
  const ac = ACTION_CONFIG[patient.recommended_clinical_action] || ACTION_CONFIG.monitor_without_change;
  const ActionIcon = ac.icon;
  return (
    <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition cursor-pointer" onClick={onOpen}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-full ${pc.bgColor} flex items-center justify-center shrink-0`}>
              <span className={`text-sm font-bold ${pc.color}`}>{patient.therapeutic_priority_score?.toFixed(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground text-sm">{names?.[patient.patient_id] || "Paciente"}</span>
                <Badge variant="outline" className={pc.color}>{pc.label}</Badge>
              </div>
              <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {patient.action_clinical_driver || patient.main_driver}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <ActionIcon className={`h-3 w-3 ${ac.color}`} />
                <span className={`text-[10px] ${ac.color}`}>{ac.label}</span>
              </div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
        <Progress value={patient.therapeutic_priority_score} className="h-1 mt-2" />
      </CardContent>
    </Card>
  );
}

function EmptyCard({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <Card className="bg-card/30 border-border/30">
      <CardContent className="p-8 text-center text-muted-foreground">
        <Icon className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p>{message}</p>
        <p className="text-sm mt-1">Execute o motor para analisar sua carteira.</p>
      </CardContent>
    </Card>
  );
}
