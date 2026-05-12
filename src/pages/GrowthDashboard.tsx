import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, TrendingUp, TrendingDown, AlertTriangle, Users, Activity, ShieldAlert, Target, BarChart3, Lightbulb, CheckCircle2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

function KPIRing({ value, label, color, icon: Icon }: { value: number; label: string; color: string; icon: React.ElementType }) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="h-4 w-4 mb-0.5" style={{ color }} />
          <span className="text-lg font-bold">{value.toFixed(0)}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return <Badge variant="outline" className={map[severity] || map.medium}>{severity}</Badge>;
}

function ILIBadge({ level }: { level: string }) {
  const map: Record<string, { color: string; label: string }> = {
    low: { color: "text-green-400", label: "Baixo" },
    moderate: { color: "text-yellow-400", label: "Moderado" },
    elevated: { color: "text-orange-400", label: "Elevado" },
    critical: { color: "text-red-400", label: "Crítico" },
  };
  const info = map[level] || map.low;
  return <span className={`font-semibold ${info.color}`}>{info.label}</span>;
}

export default function GrowthDashboard() {
  const { user } = useAuth();

  const { data: orgId } = useQuery({
    queryKey: ["user-org", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.rpc("get_user_org_id", { _user_id: user.id });
      return data as string | null;
    },
    enabled: !!user,
  });

  const { data: snapshot } = useQuery({
    queryKey: ["org-op-snapshot", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase
        .from("organization_operational_snapshots" as any)
        .select("*")
        .eq("organization_id", orgId)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .single();
      return data as any;
    },
    enabled: !!orgId,
  });

  const { data: profMetrics } = useQuery({
    queryKey: ["prof-op-metrics", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("professional_operational_metrics" as any)
        .select("*")
        .eq("organization_id", orgId)
        .order("rank_position", { ascending: true });
      return (data || []) as any[];
    },
    enabled: !!orgId,
  });

  const { data: alerts } = useQuery({
    queryKey: ["org-op-alerts", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("organization_operational_alerts" as any)
        .select("*")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("detected_at", { ascending: false })
        .limit(10);
      return (data || []) as any[];
    },
    enabled: !!orgId,
  });

  const { data: recommendations } = useQuery({
    queryKey: ["org-op-recs", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("organization_recommended_actions" as any)
        .select("*")
        .eq("organization_id", orgId)
        .eq("status", "pending")
        .order("priority", { ascending: true })
        .limit(10);
      return (data || []) as any[];
    },
    enabled: !!orgId,
  });

  const cei = snapshot?.clinical_efficiency_index || 0;
  const psi = snapshot?.portfolio_stability_index || 0;
  const growthRate = snapshot?.predicted_portfolio_growth_rate || 0;
  const contractionRate = snapshot?.predicted_portfolio_contraction_rate || 0;
  const netGrowth = growthRate - contractionRate;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Centro de Comando da Clínica</h1>
            <p className="text-sm text-muted-foreground">Inteligência operacional e gestão estratégica</p>
          </div>
          <Badge variant="outline" className="ml-auto">Engine v{snapshot?.engine_version || "1.0.0"}</Badge>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="risk">Risco</TabsTrigger>
            <TabsTrigger value="team">Time</TabsTrigger>
            <TabsTrigger value="growth">Crescimento</TabsTrigger>
            <TabsTrigger value="actions">Ações</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-primary/20">
                <CardContent className="pt-6 flex justify-center">
                  <KPIRing value={cei} label="Eficiência Clínica (CEI)" color="hsl(var(--primary))" icon={Activity} />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex justify-center">
                  <KPIRing value={psi} label="Estabilidade da Carteira (PSI)" color="#22c55e" icon={ShieldAlert} />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex flex-col items-center justify-center gap-2">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Carga de Intervenção</p>
                    <ILIBadge level={snapshot?.intervention_load_level || "low"} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{snapshot?.active_patients || 0}</p>
                  <p className="text-xs text-muted-foreground">Pacientes Ativos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-orange-400" />
                  <p className="text-2xl font-bold">{snapshot?.high_risk_patients || 0}</p>
                  <p className="text-xs text-muted-foreground">Alto Risco</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <Target className="h-5 w-5 mx-auto mb-1 text-green-400" />
                  <p className="text-2xl font-bold">{(snapshot?.average_adherence || 0).toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Adesão Média</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <Activity className="h-5 w-5 mx-auto mb-1 text-blue-400" />
                  <p className="text-2xl font-bold">{(snapshot?.average_performance_score || 0).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Performance Média</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Taxas de Risco (30 dias)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Abandono</span>
                      <span className="font-semibold">{(snapshot?.dropout_rate_30d || 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={snapshot?.dropout_rate_30d || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Estagnação</span>
                      <span className="font-semibold">{(snapshot?.stagnation_rate_30d || 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={snapshot?.stagnation_rate_30d || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Intervenção Clínica</span>
                      <span className="font-semibold">{(snapshot?.clinical_intervention_rate || 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={snapshot?.clinical_intervention_rate || 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Alertas Operacionais</CardTitle></CardHeader>
                <CardContent>
                  {!alerts?.length ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
                      <p className="text-sm">Nenhum alerta ativo</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {alerts.map((a: any) => (
                        <div key={a.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                          <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium truncate">{a.title}</span>
                              <SeverityBadge severity={a.severity} />
                            </div>
                            <p className="text-xs text-muted-foreground">{a.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Performance do Time Clínico</CardTitle></CardHeader>
              <CardContent>
                {!profMetrics?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum profissional encontrado</p>
                ) : (
                  <div className="space-y-3">
                    {profMetrics.map((pm: any, idx: number) => (
                      <div key={pm.professional_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">Profissional #{pm.rank_position}</p>
                          <p className="text-xs text-muted-foreground">
                            {pm.active_patients} pacientes · Adesão {(pm.adherence_mean || 0).toFixed(0)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{(pm.clinical_efficiency_score || 0).toFixed(0)}</p>
                          <p className="text-xs text-muted-foreground">CEI</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{(pm.dropout_rate || 0).toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">Dropout</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="growth" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {netGrowth >= 0 ? <ArrowUpRight className="h-5 w-5 text-green-400" /> : <ArrowDownRight className="h-5 w-5 text-red-400" />}
                    <span className={`text-2xl font-bold ${netGrowth >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {netGrowth >= 0 ? "+" : ""}{netGrowth.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Crescimento Líquido</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-400" />
                  <p className="text-2xl font-bold">{growthRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Taxa de Entrada (30d)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <TrendingDown className="h-5 w-5 mx-auto mb-1 text-red-400" />
                  <p className="text-2xl font-bold">{contractionRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Taxa de Saída (30d)</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">LTV Médio Estimado</CardTitle></CardHeader>
              <CardContent className="text-center py-6">
                <p className="text-4xl font-bold text-primary">R$ {(snapshot?.avg_patient_ltv_estimate || 0).toLocaleString("pt-BR")}</p>
                <p className="text-sm text-muted-foreground mt-1">Lifetime Value médio por paciente</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4 text-yellow-400" /> Recomendações Estratégicas</CardTitle></CardHeader>
              <CardContent>
                {!recommendations?.length ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
                    <p className="text-sm">Nenhuma recomendação pendente. Operação saudável!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recommendations.map((rec: any) => (
                      <div key={rec.id} className="p-4 rounded-lg border border-border bg-muted/10">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">P{rec.priority}</Badge>
                              <h4 className="font-semibold text-sm">{rec.title}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground">{rec.description}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="text-xs">
                            <span className="text-muted-foreground">Motivo: </span>
                            <span>{rec.rationale}</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Impacto: </span>
                            <span className="text-green-400">{rec.expected_impact}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="default" className="text-xs">Aplicar</Button>
                          <Button size="sm" variant="outline" className="text-xs">Ignorar</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
