import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Badge } from "@v1/components/ui/badge";
import { Separator } from "@v1/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { DollarSign, TrendingUp, Users, Cpu, HardDrive, Bell, Settings, BarChart3, AlertTriangle, CheckCircle, RefreshCw, Save, Building2 } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import B2BProjectionSection from "@v1/components/admin/B2BProjectionSection";

interface CostProjection {
  patient_count: number;
  total_cost: number;
  cost_per_patient: number;
  risk_level: string;
  breakdown: { infrastructure: number; ai: number; storage: number; notifications: number };
}

interface CostData {
  current: {
    active_patients: number;
    estimated_monthly_cost: number;
    cost_per_patient: number;
    breakdown: { infrastructure: number; ai: number; storage: number; notifications: number };
    ai_calls_30d: number;
    ai_calls_breakdown: { meal_analysis: number; body_projection: number; recipe_generation: number; reports: number };
  };
  projections: CostProjection[];
  distribution: { ai_percent: number; infrastructure_percent: number; storage_percent: number; notifications_percent: number };
  config: CostConfig;
  computed_at: string;
}

interface CostConfig {
  cost_per_ai_call_usd: number;
  cost_per_100mb_storage_usd: number;
  cost_per_1000_notifications_usd: number;
  infrastructure_base_cost_usd: number;
  stripe_fee_percent: number;
  monthly_price_per_professional: number;
  avg_stripe_fee_percent: number;
  cost_base_per_professional: number;
}

const CACHE_KEY = "fj_operational_costs_cache";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const RISK_STYLES: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  low: { label: "Baixo", color: "text-emerald-400", icon: CheckCircle },
  medium: { label: "Médio", color: "text-amber-400", icon: AlertTriangle },
  high: { label: "Alto", color: "text-red-400", icon: AlertTriangle },
};

const PIE_COLORS = ["#f97316", "#6366f1", "#22d3ee", "#a855f7"];

export default function AdminOperationalCosts() {
  const { user } = useAuth();
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configForm, setConfigForm] = useState<CostConfig>({
    cost_per_ai_call_usd: 0.003,
    cost_per_100mb_storage_usd: 0.025,
    cost_per_1000_notifications_usd: 1.0,
    infrastructure_base_cost_usd: 20.0,
    stripe_fee_percent: 2.9,
    monthly_price_per_professional: 197.0,
    avg_stripe_fee_percent: 2.9,
    cost_base_per_professional: 2.0,
  });

  const fetchProjection = useCallback(async (skipCache = false) => {
    if (!user) return;

    if (!skipCache) {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.ts < CACHE_TTL) {
            setData(parsed.data);
            setConfigForm(parsed.data.config);
            setLoading(false);
            return;
          }
        }
      } catch { /* ignore */ }
    }

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("compute-operational-cost-projection", {
        headers: { Authorization: `Bearer ${session?.session?.access_token}` },
      });

      if (res.error) throw res.error;
      const result = res.data as CostData;
      setData(result);
      setConfigForm(result.config);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, ts: Date.now() }));
    } catch (e) {
      console.error("Error fetching cost projection:", e);
      toast.error("Erro ao carregar projeção de custos");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchProjection(); }, [fetchProjection]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("operational_cost_configuration" as any)
        .update({
          cost_per_ai_call_usd: configForm.cost_per_ai_call_usd,
          cost_per_100mb_storage_usd: configForm.cost_per_100mb_storage_usd,
          cost_per_1000_notifications_usd: configForm.cost_per_1000_notifications_usd,
          infrastructure_base_cost_usd: configForm.infrastructure_base_cost_usd,
          stripe_fee_percent: configForm.stripe_fee_percent,
          monthly_price_per_professional: configForm.monthly_price_per_professional,
          avg_stripe_fee_percent: configForm.avg_stripe_fee_percent,
          cost_base_per_professional: configForm.cost_base_per_professional,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        } as any)
        .not("id", "is", null);

      if (error) throw error;

      await supabase.rpc("log_audit", {
        _action: "update_cost_config",
        _resource_type: "operational_cost_configuration",
        _metadata: configForm as any,
      });

      sessionStorage.removeItem(CACHE_KEY);
      toast.success("Parâmetros de custo atualizados!");
      fetchProjection(true);
    } catch (e) {
      console.error("Error saving config:", e);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const pieData = data ? [
    { name: "IA", value: data.distribution.ai_percent, color: PIE_COLORS[0] },
    { name: "Infraestrutura", value: data.distribution.infrastructure_percent, color: PIE_COLORS[1] },
    { name: "Storage", value: data.distribution.storage_percent, color: PIE_COLORS[2] },
    { name: "Notificações", value: data.distribution.notifications_percent, color: PIE_COLORS[3] },
  ] : [];

  const projectionBarData = data?.projections.map(p => ({
    name: `${p.patient_count}`,
    total: p.total_cost,
    perPatient: p.cost_per_patient,
    risk: p.risk_level,
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-emerald-400" />
              Custos Operacionais Estimados
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Projeção determinística baseada no uso real do sistema
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchProjection(true)} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <Tabs defaultValue="current" className="space-y-6">
            <TabsList className="bg-card/80 border border-border/50">
              <TabsTrigger value="current" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Operacional</TabsTrigger>
              <TabsTrigger value="b2b" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Escala B2B</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-6">
            {/* ── RESUMO ATUAL ─────────────────────────── */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
                Resumo Atual
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card/80 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Users className="h-3.5 w-3.5" /> Pacientes Ativos
                    </div>
                    <p className="text-2xl font-bold text-foreground">{data.current.active_patients}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/80 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <DollarSign className="h-3.5 w-3.5" /> Custo Mensal Estimado
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">${data.current.estimated_monthly_cost.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/80 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <TrendingUp className="h-3.5 w-3.5" /> Custo/Paciente
                    </div>
                    <p className="text-2xl font-bold text-foreground">${data.current.cost_per_patient.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/80 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Cpu className="h-3.5 w-3.5" /> Chamadas IA (30d)
                    </div>
                    <p className="text-2xl font-bold text-orange-400">{data.current.ai_calls_30d}</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ── PROJEÇÃO DE ESCALA ───────────────────── */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-violet-400" />
                Projeção de Escala
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.projections.map((p) => {
                  const risk = RISK_STYLES[p.risk_level] || RISK_STYLES.low;
                  const RiskIcon = risk.icon;
                  return (
                    <Card key={p.patient_count} className="bg-card/80 border-border/50 hover:border-primary/30 transition-colors">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center justify-between">
                          <span>{p.patient_count} pacientes</span>
                          <Badge variant="outline" className={`${risk.color} border-current text-xs`}>
                            <RiskIcon className="h-3 w-3 mr-1" />
                            {risk.label}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Custo Total</p>
                          <p className="text-xl font-bold text-foreground">${p.total_cost.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Por Paciente</p>
                          <p className="text-sm font-semibold text-emerald-400">${p.cost_per_patient.toFixed(3)}</p>
                        </div>
                        <Separator className="my-2" />
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                          <span>Infra: ${p.breakdown.infrastructure.toFixed(2)}</span>
                          <span>IA: ${p.breakdown.ai.toFixed(2)}</span>
                          <span>Storage: ${p.breakdown.storage.toFixed(2)}</span>
                          <span>Notif: ${p.breakdown.notifications.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Bar chart */}
              <Card className="bg-card/80 border-border/50 mt-4">
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={projectionBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} label={{ value: "Pacientes", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} label={{ value: "USD/mês", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                      <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} name="Custo Total ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* ── PRINCIPAIS CONSUMIDORES ─────────────── */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
                Principais Consumidores
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-card/80 border-border/50">
                  <CardContent className="p-4 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-card/80 border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Breakdown de Chamadas IA (30d)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Análise de Refeição", value: data.current.ai_calls_breakdown.meal_analysis, icon: "🍽️" },
                      { label: "Projeção Corporal", value: data.current.ai_calls_breakdown.body_projection, icon: "🏋️" },
                      { label: "Geração de Receitas", value: data.current.ai_calls_breakdown.recipe_generation, icon: "📝" },
                      { label: "Relatórios", value: data.current.ai_calls_breakdown.reports, icon: "📊" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{item.icon} {item.label}</span>
                        <Badge variant="secondary">{item.value}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ── CONFIGURAÇÃO DE PARÂMETROS ──────────── */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Settings className="h-5 w-5 text-amber-400" />
                Configuração de Parâmetros
              </h2>
              <Card className="bg-card/80 border-border/50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Cpu className="h-3 w-3" /> Custo por Chamada IA (USD)
                      </Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={configForm.cost_per_ai_call_usd}
                        onChange={(e) => setConfigForm({ ...configForm, cost_per_ai_call_usd: parseFloat(e.target.value) || 0 })}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <HardDrive className="h-3 w-3" /> Custo por 100MB Storage (USD)
                      </Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={configForm.cost_per_100mb_storage_usd}
                        onChange={(e) => setConfigForm({ ...configForm, cost_per_100mb_storage_usd: parseFloat(e.target.value) || 0 })}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Bell className="h-3 w-3" /> Custo por 1000 Notificações (USD)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={configForm.cost_per_1000_notifications_usd}
                        onChange={(e) => setConfigForm({ ...configForm, cost_per_1000_notifications_usd: parseFloat(e.target.value) || 0 })}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Custo Base Mensal Infra (USD)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={configForm.infrastructure_base_cost_usd}
                        onChange={(e) => setConfigForm({ ...configForm, infrastructure_base_cost_usd: parseFloat(e.target.value) || 0 })}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Taxa Stripe (%)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={configForm.stripe_fee_percent}
                        onChange={(e) => setConfigForm({ ...configForm, stripe_fee_percent: parseFloat(e.target.value) || 0 })}
                        className="bg-background"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button onClick={saveConfig} disabled={saving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {saving ? "Salvando..." : "Salvar Parâmetros"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Footer info */}
            <p className="text-xs text-muted-foreground text-center">
              Última atualização: {new Date(data.computed_at).toLocaleString("pt-BR")} · Cache de 10 minutos · Cálculos 100% determinísticos
            </p>
            </TabsContent>

            <TabsContent value="b2b">
              <B2BProjectionSection
                config={{
                  cost_per_ai_call_usd: configForm.cost_per_ai_call_usd,
                  cost_per_100mb_storage_usd: configForm.cost_per_100mb_storage_usd,
                  infrastructure_base_cost_usd: configForm.infrastructure_base_cost_usd,
                  cost_base_per_professional: configForm.cost_base_per_professional,
                  monthly_price_per_professional: configForm.monthly_price_per_professional,
                  avg_stripe_fee_percent: configForm.avg_stripe_fee_percent,
                }}
                onConfigChange={(c) => setConfigForm({ ...configForm, ...c })}
                onSave={saveConfig}
                saving={saving}
              />
            </TabsContent>
          </Tabs>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
