import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Bot, Shield, AlertTriangle, CheckCircle2, Zap,
  RotateCcw, Activity, Users, Settings2, RefreshCw,
} from "lucide-react";

interface AutomationState {
  patient_id: string;
  automation_zone: string;
  prediction_confidence: number;
  performance_level: number;
  dropout_risk: number;
  regression_risk: number;
  cluster_type: string;
  automation_enabled: boolean;
  automation_level: string;
  updated_at: string;
}

interface AdjustmentLog {
  id: string;
  patient_id: string;
  adjustment_type: string;
  adjustment_parameters: any;
  triggering_driver: string;
  expected_clinical_effect: string;
  automation_confidence: number;
  approved_by_guardrail: boolean;
  was_reversed: boolean;
  reversal_reason: string | null;
  created_at: string;
}

const ZONE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  no_automation: { label: "Sem Automação", color: "bg-muted text-muted-foreground", icon: Shield },
  limited_automation: { label: "Limitada", color: "bg-warning/10 text-warning", icon: AlertTriangle },
  adaptive_safe_zone: { label: "Zona Segura", color: "bg-primary/10 text-primary", icon: Bot },
  high_confidence_auto_zone: { label: "Alta Confiança", color: "bg-green-500/10 text-green-600", icon: Zap },
};

const ADJ_TYPE_LABELS: Record<string, string> = {
  caloric_micro_adjustment: "Ajuste Calórico Micro",
  behavioral_reinforcement: "Reforço Comportamental",
  monitoring_extension: "Extensão de Monitoramento",
  meal_distribution_adjustment: "Ajuste de Distribuição",
  plan_simplification: "Simplificação do Plano",
};

export default function ClinicalAutomation() {
  const { session } = useAuth();
  const [states, setStates] = useState<AutomationState[]>([]);
  const [logs, setLogs] = useState<AdjustmentLog[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (session?.user?.id) loadData();
  }, [session?.user?.id]);

  async function loadData() {
    setLoading(true);
    try {
      // Get nutritionist patients
      const { data: links } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", session!.user.id)
        .eq("status", "active");

      const patientIds = (links || []).map((l: any) => l.patient_id);
      if (patientIds.length === 0) { setLoading(false); return; }

      const [statesRes, logsRes, profilesRes] = await Promise.all([
        supabase
          .from("patient_automation_state")
          .select("*")
          .in("patient_id", patientIds),
        supabase
          .from("clinical_auto_adjustment_logs")
          .select("*")
          .in("patient_id", patientIds)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", patientIds),
      ]);

      setStates((statesRes.data || []) as AutomationState[]);
      setLogs((logsRes.data || []) as AdjustmentLog[]);

      const pMap: Record<string, string> = {};
      for (const p of profilesRes.data || []) {
        pMap[(p as any).user_id] = (p as any).full_name || "Paciente";
      }
      setProfiles(pMap);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function runEngine() {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("compute-adaptive-safe-automation-engine");
      if (error) throw error;
      toast.success("Motor de automação executado com sucesso!");
      await loadData();
    } catch (e: any) {
      toast.error("Erro ao executar: " + e.message);
    }
    setRunning(false);
  }

  async function toggleAutomation(patientId: string, enabled: boolean) {
    await supabase
      .from("patient_automation_state")
      .update({ automation_enabled: enabled })
      .eq("patient_id", patientId);
    setStates(prev => prev.map(s => s.patient_id === patientId ? { ...s, automation_enabled: enabled } : s));
    toast.success(enabled ? "Automação ativada" : "Automação desativada");
  }

  const zoneCounts = {
    no_automation: states.filter(s => s.automation_zone === "no_automation").length,
    limited_automation: states.filter(s => s.automation_zone === "limited_automation").length,
    adaptive_safe_zone: states.filter(s => s.automation_zone === "adaptive_safe_zone").length,
    high_confidence_auto_zone: states.filter(s => s.automation_zone === "high_confidence_auto_zone").length,
  };

  const recentAdjustments = logs.filter(l => !l.was_reversed).slice(0, 20);
  const recentReversals = logs.filter(l => l.was_reversed).slice(0, 20);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bot className="h-7 w-7 text-primary" />
              Automação Clínica Adaptativa
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Micro-ajustes terapêuticos com guardrails de segurança • Engine v1.0.0
            </p>
          </div>
          <Button onClick={runEngine} disabled={running}>
            <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
            {running ? "Processando..." : "Executar Motor"}
          </Button>
        </div>

        {/* Zone Distribution Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(ZONE_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <Card key={key}>
                <CardContent className="p-4 text-center">
                  <Icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{zoneCounts[key as keyof typeof zoneCounts]}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="patients" className="space-y-4">
          <TabsList>
            <TabsTrigger value="patients"><Users className="h-4 w-4 mr-1" /> Pacientes</TabsTrigger>
            <TabsTrigger value="adjustments"><Zap className="h-4 w-4 mr-1" /> Ajustes Aplicados</TabsTrigger>
            <TabsTrigger value="reversals"><RotateCcw className="h-4 w-4 mr-1" /> Reversões</TabsTrigger>
            <TabsTrigger value="impact"><Activity className="h-4 w-4 mr-1" /> Impacto</TabsTrigger>
          </TabsList>

          <TabsContent value="patients">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estado de Automação por Paciente</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground text-sm">Carregando...</p>
                ) : states.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Execute o motor para classificar pacientes.</p>
                ) : (
                  <div className="space-y-3">
                    {states
                      .sort((a, b) => {
                        const order = ["high_confidence_auto_zone", "adaptive_safe_zone", "limited_automation", "no_automation"];
                        return order.indexOf(a.automation_zone) - order.indexOf(b.automation_zone);
                      })
                      .map((s) => {
                        const zc = ZONE_CONFIG[s.automation_zone] || ZONE_CONFIG.no_automation;
                        return (
                          <div key={s.patient_id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-medium text-sm">{profiles[s.patient_id] || "Paciente"}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className={zc.color}>{zc.label}</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Confiança: {Math.round(s.prediction_confidence)}%
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Risco: {Math.round(s.dropout_risk)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {s.automation_enabled ? "Ativa" : "Inativa"}
                              </span>
                              <Switch
                                checked={s.automation_enabled}
                                onCheckedChange={(v) => toggleAutomation(s.patient_id, v)}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="adjustments">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ajustes Automáticos Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {recentAdjustments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum ajuste aplicado ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {recentAdjustments.map((log) => (
                      <div key={log.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{profiles[log.patient_id] || "Paciente"}</p>
                            <Badge variant="outline" className="mt-1">
                              {ADJ_TYPE_LABELS[log.adjustment_type] || log.adjustment_type}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              Confiança: {Math.round(log.automation_confidence)}%
                            </p>
                            {log.approved_by_guardrail && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 text-xs mt-1">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovado
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{log.expected_clinical_effect}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Driver: {log.triggering_driver} • {new Date(log.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reversals">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-warning" />
                  Reversões Automáticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentReversals.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma reversão registrada.</p>
                ) : (
                  <div className="space-y-3">
                    {recentReversals.map((log) => (
                      <div key={log.id} className="p-3 rounded-lg border border-warning/20 bg-warning/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{profiles[log.patient_id] || "Paciente"}</p>
                            <Badge variant="outline" className="mt-1 bg-warning/10 text-warning">
                              {ADJ_TYPE_LABELS[log.adjustment_type] || log.adjustment_type} → Revertido
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-warning mt-2">
                          Motivo: {log.reversal_reason || "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="impact">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Impacto Observado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-primary">{logs.filter(l => !l.was_reversed).length}</p>
                    <p className="text-xs text-muted-foreground">Ajustes ativos</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-warning">{logs.filter(l => l.was_reversed).length}</p>
                    <p className="text-xs text-muted-foreground">Reversões</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-green-600">
                      {logs.length > 0
                        ? Math.round((logs.filter(l => !l.was_reversed).length / logs.length) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Taxa de sucesso</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">
                      {logs.length > 0
                        ? Math.round(logs.reduce((sum, l) => sum + l.automation_confidence, 0) / logs.length)
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Confiança média</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
