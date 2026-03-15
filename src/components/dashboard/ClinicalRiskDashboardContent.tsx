import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle, Shield, Users, Activity, TrendingDown, Scale,
  UserX, Utensils, Clock, Flame, CheckCircle2, Eye, MessageSquare,
  CalendarDays, FileText, Filter, Search, X,
  BarChart3, Phone, CheckCheck, RefreshCw
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  medium: { bg: "bg-warning/5 border-warning/20", text: "text-warning", label: "Médio", dot: "bg-warning" },
  low: { bg: "bg-muted/50 border-border", text: "text-muted-foreground", label: "Baixo", dot: "bg-muted-foreground" },
};

const alertTypeIcons: Record<string, any> = {
  low_adherence: TrendingDown,
  weight_stagnation: Scale,
  unexpected_weight_gain: Scale,
  low_checkin_frequency: Utensils,
  possible_abandonment: UserX,
  metabolic_signal: Activity,
  caloric_excess: Flame,
};

function getRiskSeverity(score: number): string {
  if (score >= 60) return "critical";
  if (score >= 30) return "high";
  if (score >= 10) return "medium";
  return "low";
}

function getRowBg(score: number): string {
  if (score >= 60) return "bg-destructive/5 hover:bg-destructive/10";
  if (score >= 30) return "bg-warning/5 hover:bg-warning/10";
  return "hover:bg-muted/30";
}

export default function ClinicalRiskDashboardContent() {
  const { user } = useAuth();
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

      const [alertsRes, profilesRes, checklistRes, sessionsRes, plansRes, assessRes] = await Promise.all([
        supabase.from("clinical_alerts").select("*").eq("nutritionist_id", userId).eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", patientIds),
        supabase.from("checklist_tasks").select("patient_id, completed").in("patient_id", patientIds).gte("date", sevenDaysAgo.split("T")[0]),
        supabase.from("user_sessions").select("user_id, last_seen_at").in("user_id", patientIds),
        supabase.from("meal_plans").select("patient_id, plan_status, generation_metadata").in("patient_id", patientIds).eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("physical_assessments").select("patient_id, weight, assessment_date").in("patient_id", patientIds).order("assessment_date", { ascending: false }).limit(200),
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

      const patients: PatientRisk[] = patientIds.map((pid: string) => {
        const profile = profileMap[pid];
        const alerts = alertsByPatient[pid] || [];
        const checklist = checklistByPatient[pid] || [];
        const session = sessionMap[pid];
        const plan = planMap[pid];

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
        };
      });

      patients.sort((a, b) => b.risk_score - a.risk_score);
      return { patients };
    },
  });

  const patients = data?.patients || [];

  const kpis = useMemo(() => {
    const critical = patients.filter(p => p.risk_score >= 60).length;
    const alert = patients.filter(p => p.risk_score >= 30 && p.risk_score < 60).length;
    const stable = patients.filter(p => p.risk_score < 30).length;
    const withAdherence = patients.filter(p => p.adherence_7d >= 0);
    const avgAdherence = withAdherence.length > 0
      ? Math.round(withAdherence.reduce((s, p) => s + p.adherence_7d, 0) / withAdherence.length)
      : 0;
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000);
    const noLogin = patients.filter(p => !p.last_seen || new Date(p.last_seen) < fiveDaysAgo).length;
    return { critical, alert, stable, avgAdherence, noLogin };
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
      {/* Header */}
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

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard icon={Flame} label="Críticos" value={kpis.critical} color="destructive" />
          <KpiCard icon={AlertTriangle} label="Em Alerta" value={kpis.alert} color="warning" />
          <KpiCard icon={CheckCircle2} label="Estáveis" value={kpis.stable} color="success" />
          <KpiCard icon={BarChart3} label="Adesão Média" value={`${kpis.avgAdherence}%`} color="primary" />
          <KpiCard icon={UserX} label="Sem Login > 5d" value={kpis.noLogin} color="muted" />
        </div>
      )}

      {/* Filters */}
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
            <SelectItem value="high">Alto</SelectItem>
            <SelectItem value="medium">Médio</SelectItem>
            <SelectItem value="low">Baixo</SelectItem>
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

      {/* Patient List */}
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
          <div className="hidden md:grid grid-cols-[2fr,1fr,1fr,1fr,1fr,80px] gap-3 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <span>Paciente</span>
            <span>Peso</span>
            <span>Adesão 7d</span>
            <span>Último Acesso</span>
            <span>Plano</span>
            <span className="text-right">Risco</span>
          </div>

          {filtered.map((patient) => {
            const sev = getRiskSeverity(patient.risk_score);
            const config = severityConfig[sev];
            const daysSinceLogin = patient.last_seen
              ? Math.floor((Date.now() - new Date(patient.last_seen).getTime()) / 86400000)
              : null;

            return (
              <motion.div
                key={patient.patient_id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border p-3 md:p-4 cursor-pointer transition-all ${getRowBg(patient.risk_score)} ${config.bg}`}
                onClick={() => setSelectedPatient(patient)}
              >
                <div className="grid grid-cols-[1fr,auto] md:grid-cols-[2fr,1fr,1fr,1fr,1fr,80px] gap-2 md:gap-3 items-center">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                        {patient.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{patient.name}</p>
                      {patient.goal && (
                        <p className="text-[10px] text-muted-foreground capitalize">{patient.goal.replace(/_/g, " ")}</p>
                      )}
                    </div>
                    {patient.alerts.length > 0 && (
                      <Badge variant="outline" className="text-[10px] shrink-0 gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {patient.alerts.length}
                      </Badge>
                    )}
                  </div>

                  <div className="hidden md:block">
                    <span className="text-sm">{patient.last_weight ? `${patient.last_weight} kg` : "—"}</span>
                  </div>

                  <div className="hidden md:block">
                    {patient.adherence_7d >= 0 ? (
                      <div className="flex items-center gap-2">
                        <Progress value={patient.adherence_7d} className="h-2 w-16" />
                        <span className={`text-sm font-medium ${patient.adherence_7d < 60 ? "text-destructive" : patient.adherence_7d < 80 ? "text-warning" : "text-success"}`}>
                          {patient.adherence_7d}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem dados</span>
                    )}
                  </div>

                  <div className="hidden md:block">
                    {daysSinceLogin !== null ? (
                      <span className={`text-sm ${daysSinceLogin > 5 ? "text-destructive font-medium" : daysSinceLogin > 3 ? "text-warning" : "text-muted-foreground"}`}>
                        {daysSinceLogin === 0 ? "Hoje" : daysSinceLogin === 1 ? "Ontem" : `${daysSinceLogin}d atrás`}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  <div className="hidden md:block">
                    <PlanStatusBadge status={patient.plan_status} />
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                    <span className={`text-sm font-bold ${config.text}`}>{patient.risk_score}</span>
                  </div>
                </div>

                <div className="flex md:hidden gap-3 mt-2 text-xs text-muted-foreground">
                  {patient.adherence_7d >= 0 && <span>Adesão: {patient.adherence_7d}%</span>}
                  {daysSinceLogin !== null && <span>Login: {daysSinceLogin}d</span>}
                  {patient.last_weight && <span>{patient.last_weight}kg</span>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
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
  if (!patient) return null;
  const sev = getRiskSeverity(patient.risk_score);
  const config = severityConfig[sev];

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
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Indicadores Clínicos</h3>
              <div className="grid grid-cols-2 gap-3">
                <IndicatorCard label="Adesão 7d" value={patient.adherence_7d >= 0 ? `${patient.adherence_7d}%` : "—"} icon={BarChart3}
                  status={patient.adherence_7d < 60 ? "danger" : patient.adherence_7d < 80 ? "warning" : "ok"} />
                <IndicatorCard label="Último Peso" value={patient.last_weight ? `${patient.last_weight} kg` : "—"} icon={Scale} status="neutral" />
                <IndicatorCard label="Meta Calórica" value={patient.calorie_target ? `${patient.calorie_target} kcal` : "—"} icon={Utensils} status="neutral" />
                <IndicatorCard label="Último Acesso" value={
                  patient.last_seen
                    ? `${Math.floor((Date.now() - new Date(patient.last_seen).getTime()) / 86400000)}d atrás`
                    : "—"
                } icon={Clock}
                  status={!patient.last_seen || (Date.now() - new Date(patient.last_seen).getTime()) > 5 * 86400000 ? "danger" : "ok"} />
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
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ações Rápidas</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={() => { onClose(); onNavigate(`/patients/${patient.patient_id}`); }}>
                  <Eye className="w-4 h-4" /> Ver Paciente
                </Button>
                <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={() => { onClose(); onNavigate(`/meal-plans`); }}>
                  <FileText className="w-4 h-4" /> Revisar Plano
                </Button>
                <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={() => { onClose(); onNavigate(`/chat`); }}>
                  <MessageSquare className="w-4 h-4" /> Enviar Mensagem
                </Button>
                <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={() => { onClose(); onNavigate(`/appointments`); }}>
                  <CalendarDays className="w-4 h-4" /> Marcar Retorno
                </Button>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function IndicatorCard({ label, value, icon: Icon, status }: {
  label: string; value: string; icon: any; status: "ok" | "warning" | "danger" | "neutral";
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
      <p className={`text-lg font-bold ${colors[status]}`}>{value}</p>
    </div>
  );
}
