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
import {
  Brain, TrendingUp, TrendingDown, Minus, Trophy, AlertTriangle,
  Activity, RefreshCw, Loader2, Flame, Shield, Target, BarChart3,
  Zap, Heart, Users
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  Cell
} from "recharts";

const TIER_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  elite: { label: "Elite", color: "text-yellow-400", icon: Trophy },
  alta_performance: { label: "Alta Performance", color: "text-emerald-400", icon: TrendingUp },
  performance_estavel: { label: "Estável", color: "text-blue-400", icon: Minus },
  risco_terapeutico: { label: "Risco Terapêutico", color: "text-amber-400", icon: AlertTriangle },
  protocolo_fraco: { label: "Fraco", color: "text-red-400", icon: TrendingDown },
  amostra_insuficiente: { label: "Amostra Insuficiente", color: "text-muted-foreground", icon: Minus },
};

const CLUSTER_LABELS: Record<string, string> = {
  metabolic_responder: "Respondedor Metabólico",
  metabolic_adaptive: "Adaptativo Metabólico",
  behavioral_struggler: "Dificuldade Comportamental",
  resistant_profile: "Perfil Resistente",
  disengaging_patient: "Paciente Desengajado",
  unknown: "Não Classificado",
};

const CHART_COLORS = [
  "hsl(152, 58%, 42%)", "hsl(36, 95%, 55%)", "hsl(210, 92%, 55%)",
  "hsl(0, 72%, 51%)", "hsl(280, 65%, 55%)", "hsl(170, 60%, 45%)",
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 border border-border bg-card shadow-lg">
      <p className="text-sm font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

export default function TherapeuticIntelligence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Protocol performance data
  const { data: protocolPerf, isLoading: loadingPerf } = useQuery({
    queryKey: ["protocol-intelligence-perf"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_clinical_performance")
        .select("*, nutrition_protocols(protocol_name, protocol_category, protocol_slug)")
        .order("metabolic_success_score", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Cluster matrix
  const { data: clusterMatrix, isLoading: loadingMatrix } = useQuery({
    queryKey: ["protocol-intelligence-cluster-matrix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cluster_protocol_matrix")
        .select("*, nutrition_protocols(protocol_name)")
        .order("success_score", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Clinic evolution
  const { data: clinicEvolution, isLoading: loadingEvolution } = useQuery({
    queryKey: ["protocol-intelligence-clinic-evolution", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("clinic_clinical_evolution_metrics")
        .select("*")
        .eq("nutritionist_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Recompute mutation
  const recompute = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("compute-clinical-protocol-intelligence");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Motor recalculado: ${data.protocols_analyzed} protocolos analisados`);
      queryClient.invalidateQueries({ queryKey: ["protocol-intelligence"] });
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const isLoading = loadingPerf || loadingMatrix || loadingEvolution;

  // Prepare chart data
  const rankingData = (protocolPerf || [])
    .filter((p: any) => p.total_applications >= 1)
    .slice(0, 10)
    .map((p: any) => ({
      name: (p.nutrition_protocols?.protocol_name || "").slice(0, 20),
      score: p.metabolic_success_score || 0,
      adesão: p.avg_adherence || 0,
      aplicações: p.total_applications || 0,
    }));

  // Cluster radar data
  const clusterTypes = [...new Set((clusterMatrix || []).map((c: any) => c.cluster_type))];
  const radarData = clusterTypes.map(ct => {
    const entries = (clusterMatrix || []).filter((c: any) => c.cluster_type === ct);
    const avgScore = entries.length > 0
      ? entries.reduce((s: number, e: any) => s + (e.success_score || 0), 0) / entries.length : 0;
    const avgAdherence = entries.length > 0
      ? entries.reduce((s: number, e: any) => s + (e.avg_adherence || 0), 0) / entries.length : 0;
    return {
      cluster: CLUSTER_LABELS[ct] || ct,
      score: Math.round(avgScore),
      adesão: Math.round(avgAdherence),
    };
  });

  // Protocols at risk
  const alertProtocols = (protocolPerf || []).filter((p: any) =>
    p.effectiveness_tier === "risco_terapeutico" || p.effectiveness_tier === "protocolo_fraco"
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Brain className="w-7 h-7 text-primary" /> Inteligência Terapêutica
            </h1>
            <p className="text-sm text-muted-foreground">
              Motor de aprendizado clínico — eficácia real dos protocolos nutricionais
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
              PROTOCOL_INTELLIGENCE_ENGINE v1.0.0
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => recompute.mutate()}
            disabled={recompute.isPending}
            className="gap-1.5"
          >
            {recompute.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Recalcular Motor
          </Button>
        </div>

        {/* Clinic Evolution KPIs */}
        {clinicEvolution && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Velocidade Transformação</p>
                    <p className="text-xl font-bold">{clinicEvolution.avg_transformation_velocity?.toFixed(3)} kg/sem</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-destructive" />
                  <div>
                    <p className="text-xs text-muted-foreground">Base em Risco</p>
                    <p className="text-xl font-bold">{clinicEvolution.base_at_risk_percent?.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Eficácia Média</p>
                    <p className="text-xl font-bold">{clinicEvolution.avg_protocol_efficacy?.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Estabilidade Metabólica</p>
                    <p className="text-xl font-bold">{clinicEvolution.avg_metabolic_stability?.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Best/Worst Protocol */}
        {clinicEvolution?.top_protocol_name && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-emerald-500/30">
              <CardContent className="p-4 flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Melhor Protocolo</p>
                  <p className="font-bold">{clinicEvolution.top_protocol_name}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-500/30">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Protocolo Mais Fraco</p>
                  <p className="font-bold">{clinicEvolution.worst_protocol_name}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="ranking" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="ranking" className="gap-1.5"><BarChart3 className="w-4 h-4" /> Ranking</TabsTrigger>
            <TabsTrigger value="cluster" className="gap-1.5"><Activity className="w-4 h-4" /> Cluster × Protocolo</TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5"><AlertTriangle className="w-4 h-4" /> Alertas</TabsTrigger>
          </TabsList>

          {/* Ranking Tab */}
          <TabsContent value="ranking" className="space-y-4">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
              </div>
            ) : (
              <>
                {rankingData.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Score de Eficácia por Protocolo</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={rankingData} layout="vertical" margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis type="number" domain={[0, 100]} />
                          <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="score" name="Score" radius={[0, 4, 4, 0]}>
                            {rankingData.map((_: any, i: number) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {(protocolPerf || []).map((perf: any) => {
                    const tier = TIER_CONFIG[perf.effectiveness_tier] || TIER_CONFIG.performance_estavel;
                    const TierIcon = tier.icon;
                    return (
                      <Card key={perf.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm truncate">{perf.nutrition_protocols?.protocol_name || "Protocolo"}</CardTitle>
                            <div className={`flex items-center gap-1 ${tier.color}`}>
                              <TierIcon className="w-4 h-4" />
                              <span className="text-lg font-bold">{(perf.metabolic_success_score || 0).toFixed(0)}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] w-fit">{tier.label}</Badge>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Progress value={perf.metabolic_success_score || 0} className="h-2" />
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-muted/30 rounded p-2">
                              <p className="text-muted-foreground">Aplicações</p>
                              <p className="font-semibold">{perf.total_applications}</p>
                            </div>
                            <div className="bg-muted/30 rounded p-2">
                              <p className="text-muted-foreground">Adesão</p>
                              <p className="font-semibold">{(perf.avg_adherence || 0).toFixed(0)}%</p>
                            </div>
                            <div className="bg-muted/30 rounded p-2">
                              <p className="text-muted-foreground">Estagnação</p>
                              <p className="font-semibold">{(perf.stagnation_rate || 0).toFixed(0)}%</p>
                            </div>
                            <div className="bg-muted/30 rounded p-2">
                              <p className="text-muted-foreground">Abandono</p>
                              <p className="font-semibold">{(perf.dropout_rate || 0).toFixed(0)}%</p>
                            </div>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Resp. Peso: {(perf.avg_weight_response || 0).toFixed(3)} kg/sem · Estabilidade: {(perf.metabolic_stability || 0).toFixed(0)}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          {/* Cluster Matrix Tab */}
          <TabsContent value="cluster" className="space-y-4">
            {loadingMatrix ? (
              <Skeleton className="h-80" />
            ) : (
              <>
                {radarData.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Eficácia por Cluster Metabólico</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={350}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="cluster" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                          <Radar name="Score" dataKey="score" stroke="hsl(152, 58%, 42%)" fill="hsl(152, 58%, 42%)" fillOpacity={0.3} />
                          <Radar name="Adesão" dataKey="adesão" stroke="hsl(210, 92%, 55%)" fill="hsl(210, 92%, 55%)" fillOpacity={0.2} />
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Matrix table */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">Matriz Cluster × Protocolo</CardTitle></CardHeader>
                  <CardContent>
                    {(clusterMatrix || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Dados serão preenchidos após o motor processar pacientes com protocolos e clusters atribuídos.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left p-2">Protocolo</th>
                              <th className="text-left p-2">Cluster</th>
                              <th className="text-right p-2">N</th>
                              <th className="text-right p-2">Score</th>
                              <th className="text-right p-2">Adesão</th>
                              <th className="text-right p-2">Tier</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(clusterMatrix || []).map((row: any) => {
                              const tier = TIER_CONFIG[row.effectiveness_tier] || TIER_CONFIG.performance_estavel;
                              return (
                                <tr key={row.id} className="border-b border-border/50">
                                  <td className="p-2">{row.nutrition_protocols?.protocol_name || "—"}</td>
                                  <td className="p-2">{CLUSTER_LABELS[row.cluster_type] || row.cluster_type}</td>
                                  <td className="p-2 text-right">{row.sample_size}</td>
                                  <td className="p-2 text-right font-bold">{(row.success_score || 0).toFixed(0)}</td>
                                  <td className="p-2 text-right">{(row.avg_adherence || 0).toFixed(0)}%</td>
                                  <td className="p-2 text-right">
                                    <Badge variant="outline" className={`text-[10px] ${tier.color}`}>{tier.label}</Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            {alertProtocols.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
                  <p className="font-semibold">Nenhum protocolo em alerta</p>
                  <p className="text-sm text-muted-foreground">Todos os protocolos com dados suficientes estão com performance estável ou superior.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {alertProtocols.map((perf: any) => {
                  const tier = TIER_CONFIG[perf.effectiveness_tier] || TIER_CONFIG.risco_terapeutico;
                  return (
                    <Card key={perf.id} className="border-red-500/30">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                          <CardTitle className="text-sm">{perf.nutrition_protocols?.protocol_name}</CardTitle>
                        </div>
                        <Badge variant="destructive" className="text-[10px] w-fit">{tier.label}</Badge>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-red-500/10 rounded p-2 text-center">
                            <p className="text-muted-foreground">Score</p>
                            <p className="font-bold text-red-400">{(perf.metabolic_success_score || 0).toFixed(0)}</p>
                          </div>
                          <div className="bg-red-500/10 rounded p-2 text-center">
                            <p className="text-muted-foreground">Abandono</p>
                            <p className="font-bold">{(perf.dropout_rate || 0).toFixed(0)}%</p>
                          </div>
                          <div className="bg-red-500/10 rounded p-2 text-center">
                            <p className="text-muted-foreground">Estagnação</p>
                            <p className="font-bold">{(perf.stagnation_rate || 0).toFixed(0)}%</p>
                          </div>
                        </div>
                        <p className="text-muted-foreground">
                          ⚠️ Considere revisar a estratégia deste protocolo ou substituí-lo por alternativas de maior eficácia.
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
