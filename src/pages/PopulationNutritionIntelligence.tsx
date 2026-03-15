import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Salad, RefreshCw, Users, TrendingUp, AlertTriangle, Award, BarChart3, Lightbulb,
  Target, Shield, Zap, Brain
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

const BENCHMARK_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  exceptional_responder: { label: "Excepcional", color: "text-emerald-400", emoji: "🏆" },
  above_average: { label: "Acima da Média", color: "text-green-400", emoji: "⬆️" },
  average: { label: "Média", color: "text-blue-400", emoji: "➡️" },
  below_average: { label: "Abaixo", color: "text-yellow-400", emoji: "⬇️" },
  underperforming: { label: "Baixo", color: "text-red-400", emoji: "🚨" },
};

const CONFIDENCE_BADGE: Record<string, string> = {
  high: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function PopulationNutritionIntelligence() {
  const { user } = useAuth();
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [patients, setPatients] = useState<Record<string, string>>({});
  const [computing, setComputing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadAll();
  }, [user?.id]);

  async function loadAll() {
    setLoading(true);
    const [cohortsRes, metricsRes, matrixRes, patternsRes, benchRes, patientsRes] = await Promise.all([
      supabase.from("population_nutrition_cohorts").select("*").order("patients_count", { ascending: false }),
      supabase.from("population_nutrition_metrics").select("*"),
      supabase.from("protocol_population_success_matrix").select("*").order("success_rate", { ascending: false }),
      supabase.from("population_response_patterns").select("*").eq("nutritionist_id", user!.id).order("confidence_score", { ascending: false }),
      supabase.from("patient_nutrition_benchmarks").select("*"),
      supabase.from("nutritionist_patients").select("patient_id, profiles!nutritionist_patients_patient_id_fkey(full_name)")
        .eq("nutritionist_id", user!.id).eq("status", "active"),
    ]);

    setCohorts(cohortsRes.data || []);
    setMetrics(metricsRes.data || []);
    setMatrix(matrixRes.data || []);
    setPatterns(patternsRes.data || []);
    setBenchmarks(benchRes.data || []);

    const pMap: Record<string, string> = {};
    (patientsRes.data || []).forEach((p: any) => { pMap[p.patient_id] = p.profiles?.full_name || "Paciente"; });
    setPatients(pMap);
    setLoading(false);
  }

  async function runEngine() {
    setComputing(true);
    try {
      const { error } = await supabase.functions.invoke("compute-population-nutrition-intelligence");
      if (error) throw error;
      toast.success("Motor Nutricional Populacional recalculado!");
      await loadAll();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setComputing(false);
    }
  }

  // Merge metrics into cohorts
  const cohortsWithMetrics = cohorts.map(c => ({
    ...c,
    metrics: metrics.find(m => m.cohort_id === c.id),
  }));

  // Top cohorts by performance
  const topCohorts = cohortsWithMetrics
    .filter(c => c.metrics && c.patients_count >= 5)
    .sort((a, b) => (b.metrics?.avg_performance_score || 0) - (a.metrics?.avg_performance_score || 0))
    .slice(0, 8);

  // Benchmark distribution
  const benchDist = Object.entries(BENCHMARK_LABELS).map(([key, cfg]) => ({
    key,
    ...cfg,
    count: benchmarks.filter(b => b.benchmark_classification === key).length,
  }));

  // Chart data for cohorts
  const cohortChartData = topCohorts.map(c => ({
    name: `${c.goal_category || "?"}/${c.metabolic_cluster || "?"}`,
    adherence: Math.round(c.metrics?.avg_adherence || 0),
    performance: Math.round(c.metrics?.avg_performance_score || 0),
    stagnation: Math.round(c.metrics?.avg_stagnation_rate || 0),
    patients: c.patients_count,
  }));

  // Protocol matrix chart
  const matrixChartData = matrix.slice(0, 10).map(m => ({
    name: m.cluster_type || "?",
    success: Math.round(m.success_rate || 0),
    adherence: Math.round(m.adherence_rate || 0),
    stagnation: Math.round(m.stagnation_rate || 0),
    evidence: m.evidence_strength,
    n: m.sample_size,
  }));

  if (loading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Salad className="w-6 h-6 text-primary" />
            Inteligência Nutricional Populacional
          </h1>
          <p className="text-sm text-muted-foreground">Motor v1.0.0 • Evidência populacional para decisão clínica</p>
        </div>
        <Button onClick={runEngine} disabled={computing} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${computing ? "animate-spin" : ""}`} />
          Recalcular
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="glass"><CardContent className="p-4 text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{cohorts.reduce((s, c) => s + (c.patients_count || 0), 0)}</p>
          <p className="text-xs text-muted-foreground">Pacientes</p>
        </CardContent></Card>
        <Card className="glass"><CardContent className="p-4 text-center">
          <BarChart3 className="w-5 h-5 mx-auto mb-1 text-blue-400" />
          <p className="text-2xl font-bold">{cohorts.length}</p>
          <p className="text-xs text-muted-foreground">Cohorts</p>
        </CardContent></Card>
        <Card className="glass"><CardContent className="p-4 text-center">
          <Target className="w-5 h-5 mx-auto mb-1 text-purple-400" />
          <p className="text-2xl font-bold">{matrix.length}</p>
          <p className="text-xs text-muted-foreground">Matriz P×P</p>
        </CardContent></Card>
        <Card className="glass"><CardContent className="p-4 text-center">
          <Lightbulb className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
          <p className="text-2xl font-bold">{patterns.length}</p>
          <p className="text-xs text-muted-foreground">Padrões</p>
        </CardContent></Card>
        <Card className="glass"><CardContent className="p-4 text-center">
          <Award className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          <p className="text-2xl font-bold">{benchmarks.length}</p>
          <p className="text-xs text-muted-foreground">Benchmarks</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="cohorts">
        <TabsList className="flex-wrap">
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
          <TabsTrigger value="matrix">Protocolo × Perfil</TabsTrigger>
          <TabsTrigger value="patterns">Padrões</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        {/* Cohorts Tab */}
        <TabsContent value="cohorts" className="space-y-4">
          {cohortChartData.length > 0 && (
            <Card className="glass">
              <CardHeader><CardTitle className="text-sm">Top Cohorts por Performance Nutricional</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cohortChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} angle={-15} textAnchor="end" height={60} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="adherence" name="Adesão %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="performance" name="Performance" fill="#34d399" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="stagnation" name="Estagnação %" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3">
            {cohortsWithMetrics.map(c => (
              <Card key={c.id} className="glass">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{c.goal_category}</Badge>
                      <Badge variant="secondary">{c.metabolic_cluster}</Badge>
                      <Badge className="bg-muted/30">{c.caloric_band} kcal</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">{c.patients_count} pacientes</span>
                  </div>
                  {c.metrics && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-xs">
                      <div><p className="font-bold text-primary">{c.metrics.avg_adherence}%</p><p className="text-muted-foreground">Adesão</p></div>
                      <div><p className="font-bold text-emerald-400">{c.metrics.avg_performance_score}</p><p className="text-muted-foreground">Performance</p></div>
                      <div><p className="font-bold text-yellow-400">{c.metrics.avg_stagnation_rate}%</p><p className="text-muted-foreground">Estagnação</p></div>
                      <div><p className="font-bold text-red-400">{c.metrics.avg_dropout_rate}%</p><p className="text-muted-foreground">Abandono</p></div>
                      <div><p className="font-bold text-blue-400">{c.metrics.avg_protocol_success_score}</p><p className="text-muted-foreground">Sucesso</p></div>
                    </div>
                  )}
                  {c.patients_count < 20 && (
                    <p className="text-[10px] text-yellow-400 mt-2 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Cohort abaixo do mínimo (20) — análise limitada
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Protocol × Profile Matrix */}
        <TabsContent value="matrix" className="space-y-4">
          {matrixChartData.length > 0 && (
            <Card className="glass">
              <CardHeader><CardTitle className="text-sm">Eficácia Protocolo × Cluster</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={matrixChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="success" name="Sucesso %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="adherence" name="Adesão %" fill="#34d399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3">
            {matrix.map(m => (
              <Card key={m.id} className="glass">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{m.cluster_type}</Badge>
                      <Badge className={CONFIDENCE_BADGE[m.evidence_strength] || ""} variant="outline">
                        {m.evidence_strength === "high" ? "Alta evidência" : m.evidence_strength === "medium" ? "Média" : "Baixa"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">n={m.sample_size}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs mt-2">
                    <div>
                      <p className="font-bold text-primary">{Math.round(m.success_rate)}%</p>
                      <p className="text-muted-foreground">Sucesso</p>
                    </div>
                    <div>
                      <p className="font-bold text-emerald-400">{Math.round(m.adherence_rate)}%</p>
                      <p className="text-muted-foreground">Adesão</p>
                    </div>
                    <div>
                      <p className="font-bold text-yellow-400">{Math.round(m.stagnation_rate)}%</p>
                      <p className="text-muted-foreground">Estagnação</p>
                    </div>
                    <div>
                      <p className="font-bold text-red-400">{Math.round(m.dropout_rate)}%</p>
                      <p className="text-muted-foreground">Abandono</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {matrix.length === 0 && (
              <Card className="glass"><CardContent className="p-8 text-center text-muted-foreground">
                Execute o motor para gerar a matriz protocolo × perfil.
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-3">
          {patterns.length === 0 ? (
            <Card className="glass"><CardContent className="p-8 text-center text-muted-foreground">
              <Brain className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              Nenhum padrão detectado. Execute o motor com cohorts ≥20 pacientes.
            </CardContent></Card>
          ) : patterns.map(p => (
            <Card key={p.id} className="glass">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">{p.pattern_description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px]">{p.pattern_type}</Badge>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">Confiança:</span>
                        <Progress value={p.confidence_score * 100} className="w-16 h-1.5" />
                        <span className="text-[10px] font-medium">{Math.round(p.confidence_score * 100)}%</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        n={p.supporting_metrics?.sample_size || "?"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Benchmarks Tab */}
        <TabsContent value="benchmarks" className="space-y-4">
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">Distribuição de Benchmark Nutricional</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {benchDist.map(b => (
                  <div key={b.key} className="text-center p-3 rounded-lg bg-muted/20">
                    <p className="text-2xl">{b.emoji}</p>
                    <p className="text-lg font-bold">{b.count}</p>
                    <p className="text-[10px] text-muted-foreground">{b.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {benchmarks
              .sort((a, b) => b.performance_percentile - a.performance_percentile)
              .map((b, idx) => {
                const cfg = BENCHMARK_LABELS[b.benchmark_classification] || BENCHMARK_LABELS.average;
                return (
                  <div key={b.patient_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition">
                    <span className="text-sm font-bold text-muted-foreground w-6">{idx + 1}</span>
                    <span className="text-lg">{cfg.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{patients[b.patient_id] || "Paciente"}</p>
                      <p className={`text-[10px] ${cfg.color}`}>{cfg.label}</p>
                    </div>
                    <div className="text-right text-xs space-y-0.5">
                      <p>Performance: <strong>P{b.performance_percentile}</strong></p>
                      <p className="text-muted-foreground">Adesão: P{b.adherence_percentile}</p>
                    </div>
                  </div>
                );
              })}
            {benchmarks.length === 0 && (
              <Card className="glass"><CardContent className="p-8 text-center text-muted-foreground">
                Nenhum benchmark calculado. Cohorts precisam de ≥20 pacientes.
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-3">
          {(() => {
            const alerts: { type: string; msg: string; severity: string }[] = [];

            cohortsWithMetrics.forEach(c => {
              if (c.metrics?.avg_stagnation_rate > 40 && c.patients_count >= 10) {
                alerts.push({
                  type: "stagnation",
                  msg: `Cohort ${c.goal_category}/${c.metabolic_cluster}: ${Math.round(c.metrics.avg_stagnation_rate)}% de estagnação. Considere ajuste de estratégia calórica.`,
                  severity: "high",
                });
              }
              if (c.metrics?.avg_dropout_rate > 20 && c.patients_count >= 10) {
                alerts.push({
                  type: "dropout",
                  msg: `Cohort ${c.goal_category}/${c.metabolic_cluster}: ${Math.round(c.metrics.avg_dropout_rate)}% de abandono. Intervenção preventiva recomendada.`,
                  severity: "high",
                });
              }
              if (c.metrics?.avg_adherence < 40 && c.patients_count >= 10) {
                alerts.push({
                  type: "adherence",
                  msg: `Cohort ${c.goal_category}/${c.metabolic_cluster}: adesão média de apenas ${Math.round(c.metrics.avg_adherence)}%. Simplificar planos pode ajudar.`,
                  severity: "medium",
                });
              }
            });

            return alerts.length === 0 ? (
              <Card className="glass"><CardContent className="p-8 text-center text-muted-foreground">
                <Shield className="w-8 h-8 mx-auto mb-2 text-emerald-400/50" />
                Nenhum alerta populacional ativo. Sistema saudável.
              </CardContent></Card>
            ) : alerts.map((a, i) => (
              <Card key={i} className={`glass border-l-4 ${a.severity === "high" ? "border-l-red-500" : "border-l-yellow-500"}`}>
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${a.severity === "high" ? "text-red-400" : "text-yellow-400"}`} />
                  <div>
                    <p className="text-sm">{a.msg}</p>
                    <Badge variant="outline" className="mt-1 text-[10px]">{a.type}</Badge>
                  </div>
                </CardContent>
              </Card>
            ));
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
