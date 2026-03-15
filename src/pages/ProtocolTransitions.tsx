import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain, RefreshCw, Loader2, CheckCircle, XCircle, Eye, AlertTriangle,
  ArrowRight, TrendingUp, TrendingDown, Minus, Shield, Settings, Zap,
  FileText, User
} from "lucide-react";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
const TRANSITION_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  maintain_current_protocol: { label: "Manter Protocolo", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle },
  adjust_calories_same_protocol: { label: "Ajuste Calórico", color: "bg-blue-500/20 text-blue-400", icon: TrendingDown },
  switch_template_same_strategy: { label: "Trocar Template", color: "bg-amber-500/20 text-amber-400", icon: ArrowRight },
  switch_protocol_new_strategy: { label: "Trocar Protocolo", color: "bg-red-500/20 text-red-400", icon: Zap },
  require_manual_clinical_review: { label: "Revisão Manual", color: "bg-purple-500/20 text-purple-400", icon: Eye },
};

const CONFIDENCE_CONFIG: Record<string, { label: string; color: string }> = {
  high_confidence: { label: "Alta Confiança", color: "text-emerald-400" },
  medium_confidence: { label: "Média Confiança", color: "text-amber-400" },
  low_confidence: { label: "Baixa Confiança", color: "text-red-400" },
};

const AUTONOMY_MODES = [
  { value: "OFF", label: "Desligado", desc: "Motor não gera sugestões" },
  { value: "SUGGEST_ONLY", label: "Apenas Sugerir", desc: "Cria sugestões para revisão manual" },
  { value: "AUTO_DRAFT_AFTER_APPROVAL", label: "Draft Automático", desc: "Gera plano draft após aprovação" },
  { value: "SEMI_AUTONOMOUS", label: "Semi-Autônomo", desc: "Gera draft pronto, aguarda publicação" },
];

// ═══════════════════════════════════════════
// Hooks
// ═══════════════════════════════════════════
function useSuggestions(status: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["protocol-transitions", user?.id, status],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from("protocol_transition_suggestions")
        .select("*")
        .eq("nutritionist_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

function usePatientNames(patientIds: string[]) {
  return useQuery({
    queryKey: ["patient-names", patientIds.join(",")],
    enabled: patientIds.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", patientIds);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.user_id] = p.full_name; });
      return map;
    },
  });
}

function useAutonomySettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["autonomy-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_autonomy_settings")
        .select("*")
        .eq("nutritionist_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data || { autonomy_mode: "SUGGEST_ONLY", min_confidence_for_auto_draft: 70 };
    },
  });
}

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════
export default function ProtocolTransitions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);

  const { data: suggestions, isLoading } = useSuggestions(statusFilter);
  const patientIds = [...new Set((suggestions || []).map((s: any) => s.patient_id))];
  const { data: patientNames } = usePatientNames(patientIds);
  const { data: settings } = useAutonomySettings();

  // Mutations
  const runEngine = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("compute-semi-autonomous-protocol-transitions", {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Motor processou ${data.processed} pacientes, ${data.suggestions_created} sugestões geradas`);
      queryClient.invalidateQueries({ queryKey: ["protocol-transitions"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const approveSuggestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("protocol_transition_suggestions")
        .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: user!.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sugestão aprovada!");
      queryClient.invalidateQueries({ queryKey: ["protocol-transitions"] });
      setSelectedSuggestion(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rejectSuggestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("protocol_transition_suggestions")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sugestão rejeitada");
      queryClient.invalidateQueries({ queryKey: ["protocol-transitions"] });
      setSelectedSuggestion(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const saveSettings = useMutation({
    mutationFn: async (mode: string) => {
      const { error } = await supabase
        .from("protocol_autonomy_settings")
        .upsert({
          nutritionist_id: user!.id,
          autonomy_mode: mode,
          updated_at: new Date().toISOString(),
        }, { onConflict: "nutritionist_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      queryClient.invalidateQueries({ queryKey: ["autonomy-settings"] });
      setShowSettings(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pendingCount = suggestions?.filter((s: any) => s.status === "pending").length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="h-7 w-7 text-primary" />
              Motor Semi-Autônomo de Protocolos
            </h1>
            <p className="text-muted-foreground mt-1">
              Sugestões inteligentes de transição de protocolo nutricional • Engine v1.0.0
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 mr-1" /> Configurar
            </Button>
            <Button size="sm" onClick={() => runEngine.mutate()} disabled={runEngine.isPending}>
              {runEngine.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Executar Motor
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Pendentes", value: pendingCount, color: "text-amber-400" },
            { label: "Modo", value: AUTONOMY_MODES.find(m => m.value === (settings as any)?.autonomy_mode)?.label || "Sugerir", color: "text-primary" },
          ].map((s, i) => (
            <Card key={i} className="bg-card/50 border-border/50">
              <CardContent className="p-3 text-center">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="approved">Aprovadas</TabsTrigger>
            <TabsTrigger value="rejected">Rejeitadas</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="mt-4">
            {isLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
            ) : !suggestions?.length ? (
              <Card className="bg-card/30 border-border/30">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Nenhuma sugestão de transição {statusFilter !== "all" ? `com status "${statusFilter}"` : "encontrada"}.</p>
                  <p className="text-sm mt-1">Execute o motor para analisar seus pacientes.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {suggestions.map((s: any) => {
                  const tc = TRANSITION_LABELS[s.transition_type] || TRANSITION_LABELS.require_manual_clinical_review;
                  const cc = CONFIDENCE_CONFIG[s.confidence_level] || CONFIDENCE_CONFIG.medium_confidence;
                  const Icon = tc.icon;
                  return (
                    <Card
                      key={s.id}
                      className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedSuggestion(s)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`p-2 rounded-lg ${tc.color} shrink-0`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-foreground">
                                  {patientNames?.[s.patient_id] || "Paciente"}
                                </span>
                                <Badge variant="outline" className={tc.color}>{tc.label}</Badge>
                                <Badge variant="outline" className={cc.color}>{cc.label}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {s.clinical_reason}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span>Confiança: {s.confidence_score?.toFixed(0)}%</span>
                                {s.calorie_adjustment_percent !== 0 && (
                                  <span>Ajuste: {s.calorie_adjustment_percent > 0 ? "+" : ""}{s.calorie_adjustment_percent}%</span>
                                )}
                                <span>{new Date(s.created_at).toLocaleDateString("pt-BR")}</span>
                              </div>
                            </div>
                          </div>
                          {s.status === "pending" && (
                            <div className="flex gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-emerald-400 hover:text-emerald-300"
                                onClick={(e) => { e.stopPropagation(); approveSuggestion.mutate(s.id); }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300"
                                onClick={(e) => { e.stopPropagation(); rejectSuggestion.mutate(s.id); }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={!!selectedSuggestion} onOpenChange={() => setSelectedSuggestion(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedSuggestion && (() => {
              const s = selectedSuggestion;
              const tc = TRANSITION_LABELS[s.transition_type] || TRANSITION_LABELS.require_manual_clinical_review;
              const cc = CONFIDENCE_CONFIG[s.confidence_level] || CONFIDENCE_CONFIG.medium_confidence;
              const metrics = s.supporting_metrics || {};
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Detalhes da Sugestão de Transição
                    </DialogTitle>
                    <DialogDescription>
                      Análise completa para {patientNames?.[s.patient_id] || "Paciente"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Status Badges */}
                    <div className="flex gap-2 flex-wrap">
                      <Badge className={tc.color}>{tc.label}</Badge>
                      <Badge variant="outline" className={cc.color}>{cc.label} ({s.confidence_score?.toFixed(0)}%)</Badge>
                      <Badge variant="outline">{s.status}</Badge>
                    </div>

                    {/* Confidence Bar */}
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Score de Confiança</div>
                      <Progress value={s.confidence_score} className="h-2" />
                    </div>

                    {/* Clinical Reason */}
                    <Card className="bg-muted/30">
                      <CardContent className="p-3">
                        <div className="text-sm font-medium text-foreground mb-1">Motivo Clínico</div>
                        <p className="text-sm text-muted-foreground">{s.clinical_reason}</p>
                      </CardContent>
                    </Card>

                    {/* Expected Outcome */}
                    <Card className="bg-muted/30">
                      <CardContent className="p-3">
                        <div className="text-sm font-medium text-foreground mb-1">Impacto Esperado</div>
                        <p className="text-sm text-muted-foreground">{s.expected_strategy_outcome}</p>
                      </CardContent>
                    </Card>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { label: "Adesão", value: `${(metrics.adherence ?? 0).toFixed(0)}%` },
                        { label: "Tendência Peso", value: metrics.weight_trend || "—" },
                        { label: "Cluster", value: metrics.cluster_type || "—" },
                        { label: "Risco Clínico", value: `${(metrics.risk_score ?? 0).toFixed(0)}` },
                        { label: "Dias de Plano", value: metrics.plan_age_days || "—" },
                        { label: "Eficácia Plano", value: `${(metrics.plan_efficacy_score ?? 0).toFixed(0)}%` },
                        { label: "Estagnação", value: `${metrics.stagnation_days || 0} dias` },
                        { label: "Complexidade", value: metrics.plan_complexity || "—" },
                        { label: "Alertas Críticos", value: metrics.active_critical_alerts || 0 },
                      ].map((m, i) => (
                        <div key={i} className="bg-card/50 rounded-lg p-2 text-center">
                          <div className="text-xs text-muted-foreground">{m.label}</div>
                          <div className="text-sm font-medium text-foreground">{m.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Calorie adjustment */}
                    {s.calorie_adjustment_percent !== 0 && (
                      <Card className="bg-blue-500/10 border-blue-500/30">
                        <CardContent className="p-3 flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-blue-400" />
                          <span className="text-sm text-blue-300">
                            Ajuste calórico sugerido: {s.calorie_adjustment_percent > 0 ? "+" : ""}{s.calorie_adjustment_percent}%
                          </span>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {s.status === "pending" && (
                    <DialogFooter className="gap-2">
                      <Button variant="outline" onClick={() => rejectSuggestion.mutate(s.id)}>
                        <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedSuggestion(null)}>
                        <Eye className="h-4 w-4 mr-1" /> Revisar Manualmente
                      </Button>
                      <Button onClick={() => approveSuggestion.mutate(s.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Aprovar
                      </Button>
                    </DialogFooter>
                  )}
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Modo de Autonomia
              </DialogTitle>
              <DialogDescription>
                Configure o nível de autonomia do motor de transição de protocolos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {AUTONOMY_MODES.map((mode) => (
                <Card
                  key={mode.value}
                  className={`cursor-pointer transition-colors ${
                    (settings as any)?.autonomy_mode === mode.value
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-primary/30"
                  }`}
                  onClick={() => saveSettings.mutate(mode.value)}
                >
                  <CardContent className="p-3">
                    <div className="font-medium text-foreground">{mode.label}</div>
                    <div className="text-sm text-muted-foreground">{mode.desc}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
