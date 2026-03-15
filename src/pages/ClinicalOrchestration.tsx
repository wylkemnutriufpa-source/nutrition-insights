import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Brain, RefreshCw, Loader2, AlertTriangle, Shield, Users, TrendingUp,
  Phone, FileText, Calendar, Heart, Eye, Zap, Target, Activity, MessageCircle
} from "lucide-react";

// ═══════════════════════════════════════════
// Config
// ═══════════════════════════════════════════
const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  critical_priority: { label: "Crítico", color: "text-red-400", bgColor: "bg-red-500/20" },
  high_priority: { label: "Alto", color: "text-amber-400", bgColor: "bg-amber-500/20" },
  medium_priority: { label: "Médio", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  low_priority: { label: "Baixo", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
};

const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  contato_imediato: { label: "Contato Imediato", icon: Phone, color: "text-red-400" },
  revisar_plano: { label: "Revisar Plano", icon: FileText, color: "text-amber-400" },
  ajustar_protocolo: { label: "Ajustar Protocolo", icon: Zap, color: "text-purple-400" },
  agendar_retorno: { label: "Agendar Retorno", icon: Calendar, color: "text-blue-400" },
  reforco_motivacional: { label: "Reforço Motivacional", icon: Heart, color: "text-pink-400" },
  intervencao_intensiva: { label: "Intervenção Intensiva", icon: AlertTriangle, color: "text-red-400" },
  apenas_monitorar: { label: "Monitorar", icon: Eye, color: "text-emerald-400" },
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

function usePriorityPatients() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["priority-patients", user?.id],
    enabled: !!user,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_clinical_priority_state")
        .select("*")
        .eq("nutritionist_id", user!.id)
        .order("priority_score", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
  });
}

function useActionRecommendations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["action-recommendations", user?.id],
    enabled: !!user,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinical_action_recommendations")
        .select("*")
        .eq("nutritionist_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);
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
  const [activeTab, setActiveTab] = useState("overview");

  const { data: portfolio, isLoading: loadingPortfolio } = usePortfolioState();
  const { data: priorities, isLoading: loadingPriorities } = usePriorityPatients();
  const { data: actions } = useActionRecommendations();
  const { data: weeklyPlan } = useWeeklyPlan();

  const allPatientIds = [...new Set([
    ...(priorities || []).map((p: any) => p.patient_id),
    ...(actions || []).map((a: any) => a.patient_id),
  ])];
  const { data: names } = usePatientNames(allPatientIds);

  const runEngine = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("compute-clinical-portfolio-orchestration", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Orquestração processou ${data.processed} pacientes, ${data.action_recommendations} ações geradas`);
      queryClient.invalidateQueries({ queryKey: ["portfolio-state"] });
      queryClient.invalidateQueries({ queryKey: ["priority-patients"] });
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

  const criticalPatients = (priorities || []).filter((p: any) => p.priority_level === "critical_priority");
  const highPatients = (priorities || []).filter((p: any) => p.priority_level === "high_priority");
  const portfolioConf = PORTFOLIO_CONFIG[portfolio?.portfolio_classification ?? "carteira_estavel"];

  const weeklyPatients = (weeklyPlan?.prioritized_patients as any[]) || [];
  const days = ["segunda", "terca", "quarta", "quinta", "sexta"];
  const dayLabels: Record<string, string> = { segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta", sexta: "Sexta" };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="h-7 w-7 text-primary" />
              Orquestração Clínica da Carteira
            </h1>
            <p className="text-muted-foreground mt-1">
              Central de comando para priorização e gestão estratégica • Engine v1.0.0
            </p>
          </div>
          <Button size="sm" onClick={() => runEngine.mutate()} disabled={runEngine.isPending}>
            {runEngine.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Recalcular
          </Button>
        </div>

        {/* Portfolio Health */}
        {loadingPortfolio ? (
          <Skeleton className="h-28" />
        ) : portfolio ? (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
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
                  { label: "Críticos", value: portfolio.critical_count, color: "text-red-400" },
                  { label: "Alta Prioridade", value: portfolio.high_priority_count, color: "text-amber-400" },
                  { label: "Adesão Média", value: `${(portfolio.avg_adherence ?? 0).toFixed(0)}%` },
                  { label: "% em Risco", value: `${(portfolio.patients_at_risk_percent ?? 0).toFixed(0)}%`, color: "text-red-400" },
                ].map((s, i) => (
                  <div key={i}>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className={`text-xl font-bold ${s.color || "text-foreground"}`}>{s.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">🔥 Prioridades</TabsTrigger>
            <TabsTrigger value="actions">⚡ Ações ({actions?.length || 0})</TabsTrigger>
            <TabsTrigger value="weekly">📅 Plano Semanal</TabsTrigger>
          </TabsList>

          {/* Priority Overview */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {loadingPriorities ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
            ) : (
              <>
                {criticalPatients.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" /> Pacientes Críticos ({criticalPatients.length})
                    </h3>
                    <div className="space-y-2">
                      {criticalPatients.map((p: any) => (
                        <PriorityCard key={p.id} patient={p} names={names} onOpen={() => navigate(`/patients/${p.patient_id}`)} />
                      ))}
                    </div>
                  </div>
                )}
                {highPatients.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-1">
                      <Shield className="h-4 w-4" /> Alta Prioridade ({highPatients.length})
                    </h3>
                    <div className="space-y-2">
                      {highPatients.slice(0, 10).map((p: any) => (
                        <PriorityCard key={p.id} patient={p} names={names} onOpen={() => navigate(`/patients/${p.patient_id}`)} />
                      ))}
                    </div>
                  </div>
                )}
                {!criticalPatients.length && !highPatients.length && (
                  <Card className="bg-card/30 border-border/30">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-3 opacity-40" />
                      <p>Nenhum paciente com prioridade alta ou crítica.</p>
                      <p className="text-sm mt-1">Execute o motor para analisar sua carteira.</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Action Recommendations */}
          <TabsContent value="actions" className="mt-4 space-y-3">
            {!actions?.length ? (
              <Card className="bg-card/30 border-border/30">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Nenhuma ação pendente.</p>
                </CardContent>
              </Card>
            ) : actions.map((a: any) => {
              const ac = ACTION_CONFIG[a.recommended_action] || ACTION_CONFIG.contato_imediato;
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
                          <p className="text-sm text-muted-foreground mt-1">{a.expected_clinical_impact}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/patients/${a.patient_id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => markActed.mutate(a.id)}>
                          ✓
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Weekly Plan */}
          <TabsContent value="weekly" className="mt-4">
            {!weeklyPlan ? (
              <Card className="bg-card/30 border-border/30">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Nenhum plano semanal gerado. Execute o motor.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Semana: {weeklyPlan.week_start}</span>
                  <span>Equilíbrio: {weeklyPlan.workload_balance_score?.toFixed(0)}%</span>
                  <span>Críticos: {weeklyPlan.total_critical} | Altos: {weeklyPlan.total_high}</span>
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
                            const pc = PRIORITY_CONFIG[p.priority_level] || PRIORITY_CONFIG.medium_priority;
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
function PriorityCard({ patient, names, onOpen }: { patient: any; names: any; onOpen: () => void }) {
  const pc = PRIORITY_CONFIG[patient.priority_level] || PRIORITY_CONFIG.medium_priority;
  return (
    <Card className={`bg-card/50 border-border/50 hover:border-primary/30 transition cursor-pointer`} onClick={onOpen}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${pc.bgColor} flex items-center justify-center`}>
              <span className={`text-sm font-bold ${pc.color}`}>{patient.priority_score?.toFixed(0)}</span>
            </div>
            <div>
              <div className="font-medium text-foreground text-sm">{names?.[patient.patient_id] || "Paciente"}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">{patient.main_priority_reason}</div>
            </div>
          </div>
          <Badge variant="outline" className={pc.color}>{pc.label}</Badge>
        </div>
        <div className="mt-2">
          <Progress value={patient.priority_score} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  );
}
