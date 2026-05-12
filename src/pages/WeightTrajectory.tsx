import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import { TrendingDown, TrendingUp, Minus, Activity, Target, Scale, Timer, AlertTriangle, BarChart3, Loader2 } from "lucide-react";

interface WeightDynamics {
  avg_weekly_weight_change: number;
  historical_response_pattern: string;
  volatility_score: number;
  detected_plateaus: number;
  metabolic_response_classification: string;
  total_data_points: number;
  first_measurement_date: string;
  last_measurement_date: string;
  total_weight_change: number;
}

interface WeightProjection {
  projection_date: string;
  projected_weight: number;
  projected_body_fat: number | null;
  projected_risk_level: string;
  projection_confidence: number;
  horizon_weeks: number;
}

interface BodyProjection {
  projection_date: string;
  estimated_body_fat: number;
  estimated_lean_mass: number;
  silhouette_classification: string;
  projection_confidence: number;
}

interface WeightHistory {
  weight: number;
  body_fat_percentage: number | null;
  measurement_date: string;
  measurement_source: string;
}

const patternLabels: Record<string, string> = {
  consistent_responder: "Resposta Consistente",
  moderate_responder: "Resposta Moderada",
  slow_responder: "Resposta Lenta",
  volatile_responder: "Resposta Volátil",
  non_responsive: "Sem Resposta",
  gaining_pattern: "Padrão de Ganho",
  unknown: "Dados Insuficientes",
};

const metabolicLabels: Record<string, string> = {
  high_metabolic_response: "Alta Resposta Metabólica",
  moderate_metabolic_response: "Resposta Moderada",
  low_metabolic_response: "Baixa Resposta",
  metabolic_resistance: "Resistência Metabólica",
  plateau_dominant: "Dominante em Platô",
  insufficient_data: "Dados Insuficientes",
};

const silhouetteLabels: Record<string, string> = {
  high_adiposity: "Alta Adiposidade",
  moderate_adiposity: "Adiposidade Moderada",
  lean_transition: "Transição Lean",
  athletic: "Atlético",
  high_definition: "Alta Definição",
};

const riskColors: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  moderate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function WeightTrajectory() {
  const { user, isNutritionist } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [dynamics, setDynamics] = useState<WeightDynamics | null>(null);
  const [projections, setProjections] = useState<WeightProjection[]>([]);
  const [bodyProjections, setBodyProjections] = useState<BodyProjection[]>([]);
  const [history, setHistory] = useState<WeightHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    if (isNutritionist && user) loadPatients();
  }, [user, isNutritionist]);

  useEffect(() => {
    if (selectedPatient) loadPatientData(selectedPatient);
  }, [selectedPatient]);

  async function loadPatients() {
    const { data } = await supabase
      .from("nutritionist_patients")
      .select("patient_id, profiles!nutritionist_patients_patient_id_fkey(full_name)")
      .eq("nutritionist_id", user!.id)
      .eq("status", "active");
    if (data) {
      setPatients(data.map((d: any) => ({ id: d.patient_id, name: d.profiles?.full_name || "Paciente" })));
      if (data.length > 0) setSelectedPatient(data[0].patient_id);
    }
  }

  async function loadPatientData(pid: string) {
    setLoading(true);
    const [dynRes, projRes, bodyRes, histRes] = await Promise.all([
      supabase.from("patient_weight_dynamics").select("*").eq("patient_id", pid).maybeSingle(),
      supabase.from("patient_weight_projection").select("*").eq("patient_id", pid).order("horizon_weeks"),
      supabase.from("patient_body_projection_states").select("*").eq("patient_id", pid).order("projection_date"),
      supabase.from("patient_weight_history").select("*").eq("patient_id", pid).order("measurement_date"),
    ]);
    setDynamics(dynRes.data as any);
    setProjections((projRes.data || []) as any);
    setBodyProjections((bodyRes.data || []) as any);
    setHistory((histRes.data || []) as any);
    setLoading(false);
  }

  async function runEngine() {
    if (!selectedPatient) return;
    setComputing(true);
    try {
      const { error } = await supabase.functions.invoke("compute-weight-trajectory-engine", {
        body: { patient_id: selectedPatient },
      });
      if (error) throw error;
      toast.success("Trajetória calculada com sucesso!");
      await loadPatientData(selectedPatient);
    } catch {
      toast.error("Erro ao calcular trajetória");
    }
    setComputing(false);
  }

  // Build chart data merging history + projections
  const chartData = [
    ...history.map(h => ({ date: h.measurement_date, peso: h.weight, tipo: "real" as const })),
    ...projections.map(p => ({ date: p.projection_date, projecao: p.projected_weight, confianca: p.projection_confidence, tipo: "projecao" as const })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const TrendIcon = dynamics?.avg_weekly_weight_change
    ? dynamics.avg_weekly_weight_change < -0.1 ? TrendingDown
    : dynamics.avg_weekly_weight_change > 0.1 ? TrendingUp
    : Minus
    : Minus;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Scale className="h-6 w-6 text-primary" />
              Linha do Tempo Metabólica
            </h1>
            <p className="text-muted-foreground text-sm">Trajetória de peso, projeções e composição corporal</p>
          </div>

          <div className="flex items-center gap-3">
            {patients.length > 0 && (
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Selecionar paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={runEngine} disabled={computing || !selectedPatient} size="sm">
              {computing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Activity className="h-4 w-4 mr-1" />}
              Calcular
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="history" className="space-y-4">
            <TabsList>
              <TabsTrigger value="history">📉 Histórico Real</TabsTrigger>
              <TabsTrigger value="trend">📊 Tendência</TabsTrigger>
              <TabsTrigger value="projection">🔮 Projeção</TabsTrigger>
              <TabsTrigger value="body">🧍 Composição</TabsTrigger>
            </TabsList>

            {/* TAB 1: History */}
            <TabsContent value="history" className="space-y-4">
              <Card className="border-border/50 bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Evolução de Peso</CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Area type="monotone" dataKey="peso" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} name="Peso Real" />
                        <Area type="monotone" dataKey="projecao" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.1)" strokeWidth={2} strokeDasharray="5 5" name="Projeção" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Scale className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhum dado de peso disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Data Points Table */}
              {history.length > 0 && (
                <Card className="border-border/50 bg-card">
                  <CardHeader><CardTitle className="text-lg">Registros ({history.length})</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {history.slice(-12).reverse().map((h, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/30">
                          <p className="text-xs text-muted-foreground">{new Date(h.measurement_date).toLocaleDateString("pt-BR")}</p>
                          <p className="text-lg font-bold text-foreground">{h.weight} kg</p>
                          {h.body_fat_percentage && <p className="text-xs text-muted-foreground">{h.body_fat_percentage}% gordura</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB 2: Trend */}
            <TabsContent value="trend" className="space-y-4">
              {dynamics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="border-border/50 bg-card">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <TrendIcon className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Velocidade Semanal</p>
                          <p className="text-2xl font-bold text-foreground">{dynamics.avg_weekly_weight_change > 0 ? "+" : ""}{dynamics.avg_weekly_weight_change} kg/sem</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <BarChart3 className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Padrão de Resposta</p>
                          <p className="text-lg font-semibold text-foreground">{patternLabels[dynamics.historical_response_pattern] || dynamics.historical_response_pattern}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Activity className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Classificação Metabólica</p>
                          <p className="text-lg font-semibold text-foreground">{metabolicLabels[dynamics.metabolic_response_classification] || dynamics.metabolic_response_classification}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground mb-1">Volatilidade</p>
                      <p className="text-2xl font-bold text-foreground">{dynamics.volatility_score}</p>
                      <p className="text-xs text-muted-foreground">Quanto menor, mais estável</p>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground mb-1">Platôs Detectados</p>
                      <p className="text-2xl font-bold text-foreground">{dynamics.detected_plateaus}</p>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground mb-1">Variação Total</p>
                      <p className="text-2xl font-bold text-foreground">{dynamics.total_weight_change > 0 ? "+" : ""}{dynamics.total_weight_change} kg</p>
                      <p className="text-xs text-muted-foreground">{dynamics.total_data_points} medições</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="border-border/50 bg-card">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Execute o motor para ver a análise de tendência</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB 3: Projection */}
            <TabsContent value="projection" className="space-y-4">
              {projections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projections.map((p, i) => (
                    <Card key={i} className="border-border/50 bg-card">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            <span className="font-semibold text-foreground">{p.horizon_weeks} semanas</span>
                          </div>
                          <Badge className={riskColors[p.projected_risk_level] || riskColors.low}>
                            Risco {p.projected_risk_level}
                          </Badge>
                        </div>
                        <p className="text-3xl font-bold text-foreground">{p.projected_weight} kg</p>
                        {p.projected_body_fat && (
                          <p className="text-sm text-muted-foreground mt-1">~{p.projected_body_fat}% gordura</p>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted/50">
                            <div
                              className="h-2 rounded-full bg-primary transition-all"
                              style={{ width: `${Math.min(p.projection_confidence, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{p.projection_confidence}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Estimativa: {new Date(p.projection_date).toLocaleDateString("pt-BR")}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-border/50 bg-card">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Execute o motor para gerar projeções</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB 4: Body Composition */}
            <TabsContent value="body" className="space-y-4">
              {bodyProjections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bodyProjections.map((bp, i) => (
                    <Card key={i} className="border-border/50 bg-card">
                      <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground mb-2">
                          {new Date(bp.projection_date).toLocaleDateString("pt-BR")}
                        </p>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Gordura Est.</p>
                            <p className="text-xl font-bold text-foreground">{bp.estimated_body_fat}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Massa Magra</p>
                            <p className="text-xl font-bold text-foreground">{bp.estimated_lean_mass} kg</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {silhouetteLabels[bp.silhouette_classification] || bp.silhouette_classification}
                        </Badge>
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted/50">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${bp.projection_confidence}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{bp.projection_confidence}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-border/50 bg-card">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Projeções de composição corporal serão geradas quando houver dados de % de gordura</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
