import { useState } from "react";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  Brain, TrendingUp, Activity, Loader2, Sparkles, BarChart3,
  RefreshCw, ShieldCheck, Target, Zap, History, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar
} from "recharts";

const MATURITY_LABELS: Record<string, { label: string; color: string }> = {
  early_learning: { label: "Aprendizado Inicial", color: "text-muted-foreground" },
  developing_intelligence: { label: "Inteligência em Desenvolvimento", color: "text-blue-500" },
  optimized: { label: "Otimizado", color: "text-emerald-500" },
  high_precision: { label: "Alta Precisão", color: "text-purple-500" },
  elite_clinical_system: { label: "Sistema Clínico Elite", color: "text-amber-500" },
};

export default function GlobalAdaptiveIntelligence() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);

  const { data: maturityHistory, refetch: refetchMaturity } = useQuery({
    queryKey: ["platform-maturity-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_maturity_history")
        .select("*")
        .order("computed_at", { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: evidenceSignals, refetch: refetchSignals } = useQuery({
    queryKey: ["global-evidence-signals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("global_evidence_signals")
        .select("*")
        .order("computed_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: learningState, refetch: refetchState } = useQuery({
    queryKey: ["global-learning-state"],
    queryFn: async () => {
      const { data } = await supabase
        .from("global_clinical_learning_state")
        .select("*")
        .order("last_updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: recalibrationLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["recalibration-audit-log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("recalibration_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  const latestMaturity = maturityHistory?.[0];
  const maturityInfo = MATURITY_LABELS[latestMaturity?.maturity_level ?? "early_learning"];

  const uniqueSignals = evidenceSignals?.reduce((acc: any[], s: any) => {
    if (!acc.find((a: any) => a.signal_name === s.signal_name)) acc.push(s);
    return acc;
  }, []) || [];

  const maturityChartData = [...(maturityHistory || [])].reverse().map((m: any) => ({
    date: new Date(m.computed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    score: m.maturity_score,
    prediction: m.prediction_accuracy,
    efficacy: m.therapeutic_efficacy,
    consistency: m.result_consistency,
  }));

  const radarData = uniqueSignals.map((s: any) => ({
    metric: s.signal_name.replace(/_/g, " ").replace(/index|rate/g, "").trim(),
    value: s.signal_value,
    fullMark: 100,
  }));

  async function runEngine() {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("compute-global-adaptive-clinical-intelligence");
      if (error) throw error;
      toast.success("Motor de Inteligência Adaptativa executado com sucesso");
      refetchMaturity();
      refetchSignals();
      refetchState();
      refetchLogs();
    } catch (e: any) {
      toast.error(e.message || "Erro ao executar motor");
    } finally {
      setRunning(false);
    }
  }

  const signalLabels: Record<string, string> = {
    intervention_success_rate: "Taxa de Sucesso de Intervenções",
    automation_safety_index: "Índice de Segurança da Automação",
    protocol_effectiveness_index: "Eficácia de Protocolos",
    prediction_accuracy_index: "Precisão Preditiva",
    cluster_response_variance: "Variância de Resposta por Cluster",
  };

  const componentLabels: Record<string, string> = {
    automation_engine: "Motor de Automação",
    simulation_engine: "Motor de Simulação",
    outcome_prediction_engine: "Motor Preditivo",
    cluster_engine: "Motor de Clusters",
    adaptive_engine: "Motor Adaptativo",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-7 w-7 text-primary" />
              Evolução da Inteligência Clínica
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Sistema auto-evolutivo • Aprendizado determinístico baseado em desfechos reais
            </p>
          </div>
          <Button onClick={runEngine} disabled={running} size="sm">
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Executar Motor
          </Button>
        </div>

        {/* Maturity Card */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Maturidade da Plataforma</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-4xl font-bold">{latestMaturity?.maturity_score ?? 0}</span>
                  <span className="text-muted-foreground">/100</span>
                </div>
                <Badge variant="outline" className={`mt-2 ${maturityInfo.color}`}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  {maturityInfo.label}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">Precisão Preditiva</p>
                  <p className="text-lg font-semibold">{latestMaturity?.prediction_accuracy ?? 0}%</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Eficácia Terapêutica</p>
                  <p className="text-lg font-semibold">{latestMaturity?.therapeutic_efficacy ?? 0}%</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Estabilidade</p>
                  <p className="text-lg font-semibold">{latestMaturity?.population_stability ?? 0}%</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Consistência</p>
                  <p className="text-lg font-semibold">{latestMaturity?.result_consistency ?? 0}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="signals" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="signals"><Activity className="h-4 w-4 mr-1" /> Sinais</TabsTrigger>
            <TabsTrigger value="learning"><Brain className="h-4 w-4 mr-1" /> Aprendizado</TabsTrigger>
            <TabsTrigger value="recalibrations"><Target className="h-4 w-4 mr-1" /> Recalibrações</TabsTrigger>
            <TabsTrigger value="evolution"><TrendingUp className="h-4 w-4 mr-1" /> Evolução</TabsTrigger>
          </TabsList>

          {/* Tab 1: Evidence Signals */}
          <TabsContent value="signals" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Sinais de Evidência Global</CardTitle></CardHeader>
                <CardContent>
                  {uniqueSignals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum sinal computado ainda. Execute o motor.</p>
                  ) : (
                    <div className="space-y-3">
                      {uniqueSignals.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="text-sm font-medium">{signalLabels[s.signal_name] || s.signal_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Amostra: {s.sample_size} • Confiança: {s.confidence}%
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={s.signal_trend === "positive" ? "default" : s.signal_trend === "negative" ? "destructive" : "secondary"}>
                              {s.signal_trend === "positive" ? <ArrowUpRight className="h-3 w-3 mr-1" /> : s.signal_trend === "negative" ? <ArrowDownRight className="h-3 w-3 mr-1" /> : null}
                              {s.signal_value}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Radar de Inteligência</CardTitle></CardHeader>
                <CardContent>
                  {radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid strokeDasharray="3 3" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis domain={[0, 100]} />
                        <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Execute o motor para visualizar</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* "O sistema está aprendendo que..." */}
            {uniqueSignals.length > 0 && (
              <Card className="border-amber-500/20 bg-amber-50/5">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-500" /> O sistema está aprendendo que...</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {uniqueSignals.filter((s: any) => s.signal_trend !== "stable" && s.sample_size >= 5).map((s: any) => (
                      <li key={s.id} className="flex items-start gap-2">
                        <Zap className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <span>
                          {s.signal_name === "intervention_success_rate" && s.signal_trend === "positive" && `Intervenções automáticas estão sendo eficazes (${s.signal_value}% de sucesso)`}
                          {s.signal_name === "protocol_effectiveness_index" && s.signal_trend === "positive" && `Protocolos atuais mostram eficácia elevada (score ${s.signal_value})`}
                          {s.signal_name === "prediction_accuracy_index" && s.signal_trend === "positive" && `Predições clínicas estão cada vez mais precisas (${s.signal_value}% de acerto)`}
                          {s.signal_name === "automation_safety_index" && s.signal_trend === "positive" && `Automação clínica mantém alto nível de segurança (${s.signal_value}%)`}
                          {s.signal_name === "cluster_response_variance" && s.signal_trend === "negative" && `Variância entre clusters está alta (${s.signal_value}) — necessário ajustar sensibilidade`}
                          {s.signal_trend === "stable" ? "" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 2: Learning State */}
          <TabsContent value="learning" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Estado Global de Aprendizado</CardTitle></CardHeader>
              <CardContent>
                {!learningState?.length ? (
                  <p className="text-sm text-muted-foreground">Nenhum parâmetro calibrado ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {learningState.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">{componentLabels[s.engine_component] || s.engine_component}</p>
                          <p className="text-xs text-muted-foreground">{s.parameter_name}</p>
                          {s.adjustment_reason && <p className="text-xs text-muted-foreground mt-1 italic">{s.adjustment_reason}</p>}
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            {s.previous_weight != null && (
                              <span className="text-xs text-muted-foreground line-through">{s.previous_weight}</span>
                            )}
                            <span className="font-semibold">{s.current_weight}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Evidência: {s.evidence_strength}% • N={s.sample_size}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Recalibration Log */}
          <TabsContent value="recalibrations" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Histórico de Recalibrações</CardTitle></CardHeader>
              <CardContent>
                {!recalibrationLogs?.length ? (
                  <p className="text-sm text-muted-foreground">Nenhuma recalibração registrada.</p>
                ) : (
                  <div className="space-y-3">
                    {recalibrationLogs.map((r: any) => (
                      <div key={r.id} className="p-3 rounded-lg border space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{componentLabels[r.engine_component] || r.engine_component}</Badge>
                            <span className="text-sm font-medium">{r.parameter_name}</span>
                          </div>
                          <Badge variant={r.status === "auto_applied" ? "default" : r.status === "rolled_back" ? "destructive" : "secondary"}>
                            {r.status === "auto_applied" ? "Aplicado" : r.status === "rolled_back" ? "Revertido" : r.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.reason}</p>
                        <div className="flex gap-4 text-xs">
                          <span>Peso: {r.old_weight} → {r.new_weight}</span>
                          <span>Ajuste: {r.adjustment_percent > 0 ? "+" : ""}{r.adjustment_percent}%</span>
                          <span>Evidência: {r.evidence_strength}%</span>
                          <span>N={r.sample_size}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Evolution */}
          <TabsContent value="evolution" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Evolução da Maturidade</CardTitle></CardHeader>
              <CardContent>
                {maturityChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={maturityChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} name="Maturidade" />
                      <Line type="monotone" dataKey="prediction" stroke="hsl(var(--chart-2))" strokeDasharray="5 5" name="Precisão" />
                      <Line type="monotone" dataKey="efficacy" stroke="hsl(var(--chart-3))" strokeDasharray="5 5" name="Eficácia" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Dados insuficientes para gráfico</p>
                )}
              </CardContent>
            </Card>

            {/* Recalibration impact bar chart */}
            {recalibrationLogs && recalibrationLogs.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Impacto das Recalibrações por Componente</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={
                      Object.entries(
                        (recalibrationLogs || []).reduce((acc: any, r: any) => {
                          const key = componentLabels[r.engine_component] || r.engine_component;
                          if (!acc[key]) acc[key] = { component: key, count: 0, avgAdjust: 0 };
                          acc[key].count++;
                          acc[key].avgAdjust += Math.abs(r.adjustment_percent);
                          return acc;
                        }, {})
                      ).map(([, v]: [string, any]) => ({ ...v, avgAdjust: Math.round((v.avgAdjust / v.count) * 100) / 100 }))
                    }>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="component" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" name="Recalibrações" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
