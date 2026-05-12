import { useEffect, useState } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { toast } from "sonner";
import {
  Globe, RefreshCw, Users, TrendingUp, AlertTriangle, Award, BarChart3, Lightbulb
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts";

const BENCHMARK_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  resposta_excepcional: { label: "Excepcional", color: "text-emerald-400", emoji: "🏆" },
  acima_da_media: { label: "Acima da Média", color: "text-green-400", emoji: "⬆️" },
  dentro_da_media: { label: "Na Média", color: "text-blue-400", emoji: "➡️" },
  abaixo_da_media: { label: "Abaixo da Média", color: "text-yellow-400", emoji: "⬇️" },
  resposta_preocupante: { label: "Preocupante", color: "text-red-400", emoji: "🚨" },
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-emerald-500/20 text-emerald-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-red-500/20 text-red-400",
};

interface CohortWithMetrics {
  id: string;
  cohort_key: string;
  cohort_signature: Record<string, string>;
  patients_count: number;
  metrics?: {
    avg_weight_loss_14d: number;
    avg_weight_loss_30d: number;
    stagnation_rate: number;
    dropout_rate: number;
    avg_adherence: number;
    avg_response_velocity: number;
    metabolic_stability: number;
    avg_performance_score: number;
  };
}

interface Benchmark {
  patient_id: string;
  relative_weight_response: number;
  relative_adherence: number;
  relative_performance_score: number;
  benchmark_classification: string;
}

interface Insight {
  id: string;
  insight_type: string;
  insight_description: string;
  statistical_confidence: string;
  supporting_data: Record<string, any>;
  created_at: string;
}

export default function PopulationIntelligence() {
  const { user } = useAuth();
  const [cohorts, setCohorts] = useState<CohortWithMetrics[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [patients, setPatients] = useState<Record<string, string>>({});
  const [computing, setComputing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadAll();
  }, [user?.id]);

  async function loadAll() {
    setLoading(true);
    const [cohortsRes, metricsRes, benchRes, insightsRes, patientsRes] = await Promise.all([
      supabase.from("population_cohorts").select("*").eq("nutritionist_id", user!.id).order("patients_count", { ascending: false }),
      supabase.from("population_cohort_metrics").select("*"),
      supabase.from("patient_population_benchmark").select("*"),
      supabase.from("population_clinical_insights").select("*").eq("nutritionist_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("nutritionist_patients").select("patient_id, profiles!nutritionist_patients_patient_id_fkey(full_name)")
        .eq("nutritionist_id", user!.id).eq("status", "active"),
    ]);

    const cohortsData = cohortsRes.data || [];
    const metricsData = metricsRes.data || [];

    const merged: CohortWithMetrics[] = cohortsData.map((c: any) => ({
      ...c,
      metrics: metricsData.find((m: any) => m.cohort_id === c.id),
    }));

    setCohorts(merged);
    setBenchmarks((benchRes.data || []) as Benchmark[]);
    setInsights((insightsRes.data || []) as Insight[]);

    const pMap: Record<string, string> = {};
    (patientsRes.data || []).forEach((p: any) => { pMap[p.patient_id] = p.profiles?.full_name || "Paciente"; });
    setPatients(pMap);
    setLoading(false);
  }

  async function runEngine() {
    setComputing(true);
    try {
      const { error } = await supabase.functions.invoke("compute-population-clinical-intelligence");
      if (error) throw error;
      toast.success("Motor populacional recalculado!");
      await loadAll();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setComputing(false);
    }
  }

  // Benchmark distribution
  const benchDist = Object.entries(BENCHMARK_CONFIG).map(([key, cfg]) => ({
    name: cfg.label,
    count: benchmarks.filter(b => b.benchmark_classification === key).length,
    emoji: cfg.emoji,
  }));

  // Cohort chart data
  const cohortChart = cohorts
    .filter(c => c.metrics && c.patients_count >= 5)
    .slice(0, 10)
    .map(c => ({
      name: `${c.cohort_signature.cluster || "?"}/${c.cohort_signature.goal || "?"}`,
      adherence: Math.round(c.metrics!.avg_adherence),
      performance: Math.round(c.metrics!.avg_performance_score),
      stagnation: Math.round(c.metrics!.stagnation_rate),
      count: c.patients_count,
    }));

  const COLORS = ["hsl(var(--primary))", "#34d399", "#fbbf24", "#f87171", "#818cf8"];

  if (loading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            Inteligência Populacional
          </h1>
          <p className="text-sm text-muted-foreground">Motor v1.0.0 • Benchmarking clínico anônimo</p>
        </div>
        <Button onClick={runEngine} disabled={computing} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${computing ? "animate-spin" : ""}`} />
          Recalcular
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass"><CardContent className="p-4 text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{cohorts.reduce((s, c) => s + c.patients_count, 0)}</p>
          <p className="text-xs text-muted-foreground">Pacientes Analisados</p>
        </CardContent></Card>
        <Card className="glass"><CardContent className="p-4 text-center">
          <BarChart3 className="w-5 h-5 mx-auto mb-1 text-blue-400" />
          <p className="text-2xl font-bold">{cohorts.length}</p>
          <p className="text-xs text-muted-foreground">Cohorts</p>
        </CardContent></Card>
        <Card className="glass"><CardContent className="p-4 text-center">
          <Award className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          <p className="text-2xl font-bold">{benchmarks.length}</p>
          <p className="text-xs text-muted-foreground">Benchmarks</p>
        </CardContent></Card>
        <Card className="glass"><CardContent className="p-4 text-center">
          <Lightbulb className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
          <p className="text-2xl font-bold">{insights.length}</p>
          <p className="text-xs text-muted-foreground">Insights Gerados</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="benchmarks">
        <TabsList>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="ranking">Ranking Pacientes</TabsTrigger>
        </TabsList>

        {/* Benchmarks Tab */}
        <TabsContent value="benchmarks" className="space-y-4">
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">Distribuição de Performance Relativa</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {benchDist.map(b => (
                  <div key={b.name} className="text-center p-3 rounded-lg bg-muted/20">
                    <p className="text-2xl">{b.emoji}</p>
                    <p className="text-lg font-bold">{b.count}</p>
                    <p className="text-[10px] text-muted-foreground">{b.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {cohortChart.length > 0 && (
            <Card className="glass">
              <CardHeader><CardTitle className="text-sm">Adesão e Performance por Cohort</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cohortChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} angle={-20} textAnchor="end" height={60} />
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
        </TabsContent>

        {/* Cohorts Tab */}
        <TabsContent value="cohorts" className="space-y-3">
          {cohorts.length === 0 ? (
            <Card className="glass"><CardContent className="p-8 text-center text-muted-foreground">
              Execute o motor para gerar cohorts populacionais.
            </CardContent></Card>
          ) : cohorts.map(c => (
            <Card key={c.id} className="glass">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{c.cohort_signature.cluster}</Badge>
                    <Badge variant="secondary">{c.cohort_signature.goal}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{c.patients_count} pacientes</span>
                </div>
                {c.metrics && (
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div><p className="font-bold">{c.metrics.avg_adherence}%</p><p className="text-muted-foreground">Adesão</p></div>
                    <div><p className="font-bold">{c.metrics.avg_performance_score}</p><p className="text-muted-foreground">Performance</p></div>
                    <div><p className="font-bold">{c.metrics.stagnation_rate}%</p><p className="text-muted-foreground">Estagnação</p></div>
                    <div><p className="font-bold">{c.metrics.metabolic_stability}</p><p className="text-muted-foreground">Estabilidade</p></div>
                  </div>
                )}
                {c.patients_count < 15 && (
                  <p className="text-[10px] text-yellow-400 mt-2">⚠️ Cohort pequeno — benchmarks individuais desativados</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-3">
          {insights.length === 0 ? (
            <Card className="glass"><CardContent className="p-8 text-center text-muted-foreground">
              Nenhum insight gerado ainda. Execute o motor.
            </CardContent></Card>
          ) : insights.map(ins => (
            <Card key={ins.id} className="glass">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm">{ins.insight_description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={CONFIDENCE_COLORS[ins.statistical_confidence] || ""} variant="outline">
                        {ins.statistical_confidence === "high" ? "Alta confiança" : "Média confiança"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        n={ins.supporting_data?.sample_size || "?"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Patient Ranking Tab */}
        <TabsContent value="ranking" className="space-y-2">
          {benchmarks.length === 0 ? (
            <Card className="glass"><CardContent className="p-8 text-center text-muted-foreground">
              Nenhum benchmark calculado. Execute o motor com cohorts ≥15 pacientes.
            </CardContent></Card>
          ) : benchmarks
            .sort((a, b) => b.relative_performance_score - a.relative_performance_score)
            .map((b, idx) => {
              const cfg = BENCHMARK_CONFIG[b.benchmark_classification] || BENCHMARK_CONFIG.dentro_da_media;
              return (
                <div key={b.patient_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition">
                  <span className="text-sm font-bold text-muted-foreground w-6">{idx + 1}</span>
                  <span className="text-lg">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{patients[b.patient_id] || "Paciente"}</p>
                    <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p>Perf: <strong>{b.relative_performance_score}x</strong></p>
                    <p className="text-muted-foreground">Adesão: {b.relative_adherence}x</p>
                  </div>
                </div>
              );
            })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
