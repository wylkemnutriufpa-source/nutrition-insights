import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Users, Building2, TrendingUp, DollarSign, AlertTriangle, CheckCircle, Zap, Settings, Save, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";

interface B2BConfig {
  cost_per_ai_call_usd: number;
  cost_per_100mb_storage_usd: number;
  infrastructure_base_cost_usd: number;
  cost_base_per_professional: number;
  monthly_price_per_professional: number;
  avg_stripe_fee_percent: number;
}

interface B2BScenario {
  name: string;
  professionals: number;
  avgPatients: number;
  aiIntensity: "low" | "medium" | "high";
  storageIntensity: "low" | "medium" | "high";
  color: string;
  emoji: string;
}

const AI_MULTIPLIER: Record<string, number> = { low: 0.6, medium: 1.0, high: 1.8 };
const STORAGE_MULTIPLIER: Record<string, number> = { low: 0.7, medium: 1.0, high: 1.5 };

const DEFAULT_SCENARIOS: B2BScenario[] = [
  { name: "Early Growth", professionals: 10, avgPatients: 80, aiIntensity: "medium", storageIntensity: "low", color: "text-emerald-400", emoji: "🟢" },
  { name: "Growth", professionals: 50, avgPatients: 120, aiIntensity: "medium", storageIntensity: "medium", color: "text-amber-400", emoji: "🟡" },
  { name: "Scale", professionals: 150, avgPatients: 150, aiIntensity: "high", storageIntensity: "medium", color: "text-orange-400", emoji: "🟠" },
  { name: "Dominância Regional", professionals: 400, avgPatients: 200, aiIntensity: "high", storageIntensity: "high", color: "text-red-400", emoji: "🔴" },
];

const RISK_STYLES: Record<string, { label: string; color: string; icon: typeof CheckCircle; suggestion: string }> = {
  low: { label: "Baixo", color: "text-emerald-400", icon: CheckCircle, suggestion: "Infra atual suporta" },
  medium: { label: "Médio", color: "text-amber-400", icon: AlertTriangle, suggestion: "Necessário otimizar jobs" },
  high: { label: "Alto", color: "text-red-400", icon: AlertTriangle, suggestion: "Necessário upgrade de arquitetura" },
};

// Avg AI calls per patient per month and storage per patient (MB)
const AVG_AI_CALLS_PER_PATIENT = 3;
const AVG_STORAGE_PER_PATIENT_MB = 5;

function computeB2BProjection(scenario: B2BScenario, config: B2BConfig) {
  const totalPatients = scenario.professionals * scenario.avgPatients;
  const aiMult = AI_MULTIPLIER[scenario.aiIntensity];
  const storageMult = STORAGE_MULTIPLIER[scenario.storageIntensity];

  const costAi = totalPatients * AVG_AI_CALLS_PER_PATIENT * config.cost_per_ai_call_usd * aiMult;
  const costStorage = (totalPatients * AVG_STORAGE_PER_PATIENT_MB / 100) * config.cost_per_100mb_storage_usd * storageMult;
  const costProfessionals = scenario.professionals * config.cost_base_per_professional;
  const costInfra = config.infrastructure_base_cost_usd;
  const totalCost = costInfra + costAi + costStorage + costProfessionals;

  const grossRevenue = scenario.professionals * config.monthly_price_per_professional;
  const stripeFees = grossRevenue * (config.avg_stripe_fee_percent / 100);
  const netRevenue = grossRevenue - stripeFees;
  const margin = netRevenue - totalCost;
  const marginPercent = netRevenue > 0 ? (margin / netRevenue) * 100 : 0;

  let riskLevel = "low";
  if (totalCost > 5000 || marginPercent < 20) riskLevel = "high";
  else if (totalCost > 1000 || marginPercent < 50) riskLevel = "medium";

  return {
    totalPatients,
    totalCost: Math.round(totalCost * 100) / 100,
    costPerProfessional: Math.round((totalCost / scenario.professionals) * 100) / 100,
    costPerPatient: totalPatients > 0 ? Math.round((totalCost / totalPatients) * 1000) / 1000 : 0,
    grossRevenue: Math.round(grossRevenue * 100) / 100,
    netRevenue: Math.round(netRevenue * 100) / 100,
    margin: Math.round(margin * 100) / 100,
    marginPercent: Math.round(marginPercent * 10) / 10,
    riskLevel,
  };
}

interface Props {
  config: B2BConfig;
  onConfigChange: (c: B2BConfig) => void;
  onSave: () => void;
  saving: boolean;
}

export default function B2BProjectionSection({ config, onConfigChange, onSave, saving }: Props) {
  const [revenueConfig, setRevenueConfig] = useState({
    monthly_price_per_professional: config.monthly_price_per_professional,
    avg_stripe_fee_percent: config.avg_stripe_fee_percent,
  });

  const projections = useMemo(() =>
    DEFAULT_SCENARIOS.map(s => ({ scenario: s, ...computeB2BProjection(s, { ...config, ...revenueConfig }) })),
    [config, revenueConfig]
  );

  // Scale curve data: generate points from 5 to 500 professionals
  const curveData = useMemo(() => {
    const points = [5, 10, 25, 50, 100, 150, 200, 300, 400, 500];
    return points.map(pros => {
      const s: B2BScenario = { name: "", professionals: pros, avgPatients: 120, aiIntensity: "medium", storageIntensity: "medium", color: "", emoji: "" };
      const p = computeB2BProjection(s, { ...config, ...revenueConfig });
      return { profissionais: pros, custo: p.totalCost, receita: p.netRevenue, margem: p.margin };
    });
  }, [config, revenueConfig]);

  // Break-even calculation
  const breakEven = useMemo(() => {
    for (let pros = 1; pros <= 1000; pros++) {
      const s: B2BScenario = { name: "", professionals: pros, avgPatients: 100, aiIntensity: "medium", storageIntensity: "medium", color: "", emoji: "" };
      const p = computeB2BProjection(s, { ...config, ...revenueConfig });
      if (p.margin >= 0) return pros;
    }
    return null;
  }, [config, revenueConfig]);

  return (
    <div className="space-y-6">
      {/* ── PROJEÇÃO B2B ───────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-violet-400" />
          Projeção de Escala B2B
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {projections.map(({ scenario, ...p }) => {
            const risk = RISK_STYLES[p.riskLevel] || RISK_STYLES.low;
            const RiskIcon = risk.icon;
            return (
              <Card key={scenario.name} className="bg-card/80 border-border/50 hover:border-primary/30 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className={scenario.color}>{scenario.emoji} {scenario.name}</span>
                    <Badge variant="outline" className={`${risk.color} border-current text-[10px]`}>
                      <RiskIcon className="h-3 w-3 mr-1" />
                      {risk.label}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" /> {scenario.professionals} profissionais
                    <span className="mx-1">·</span>
                    <Users className="h-3 w-3" /> {p.totalPatients.toLocaleString()} pac.
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Custo Total</p>
                      <p className="text-sm font-bold text-foreground">${p.totalCost.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Receita Líquida</p>
                      <p className="text-sm font-bold text-emerald-400">${p.netRevenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">$/Profissional</p>
                      <p className="text-xs font-semibold text-foreground">${p.costPerProfessional}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Margem</p>
                      <p className={`text-xs font-semibold ${p.marginPercent > 50 ? "text-emerald-400" : p.marginPercent > 20 ? "text-amber-400" : "text-red-400"}`}>
                        {p.marginPercent}%
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                    <Zap className="h-3 w-3" /> {risk.suggestion}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── CURVA DE ESCALA ────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-cyan-400" />
          Curva de Escala
          {breakEven && (
            <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 text-xs ml-2">
              <Target className="h-3 w-3 mr-1" />
              Break-even: {breakEven} profissional{breakEven > 1 ? "is" : ""}
            </Badge>
          )}
        </h2>
        <Card className="bg-card/80 border-border/50">
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={curveData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="profissionais" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} label={{ value: "Profissionais", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} label={{ value: "USD/mês", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="receita" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Receita Líquida" />
                <Line type="monotone" dataKey="custo" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Custo Operacional" />
                <Line type="monotone" dataKey="margem" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Margem" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── MODELO DE RECEITA ─────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Settings className="h-5 w-5 text-amber-400" />
          Configurar Modelo de Receita
        </h2>
        <Card className="bg-card/80 border-border/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Preço Mensal por Profissional (R$)
                </Label>
                <Input
                  type="number"
                  step="1"
                  value={revenueConfig.monthly_price_per_professional}
                  onChange={(e) => setRevenueConfig({ ...revenueConfig, monthly_price_per_professional: parseFloat(e.target.value) || 0 })}
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
                  value={revenueConfig.avg_stripe_fee_percent}
                  onChange={(e) => setRevenueConfig({ ...revenueConfig, avg_stripe_fee_percent: parseFloat(e.target.value) || 0 })}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Custo Base por Profissional (USD)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={config.cost_base_per_professional}
                  onChange={(e) => onConfigChange({ ...config, cost_base_per_professional: parseFloat(e.target.value) || 0 })}
                  className="bg-background"
                />
              </div>
            </div>

            {/* Summary cards */}
            {projections.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {projections.map(({ scenario, ...p }) => (
                  <div key={scenario.name} className="rounded-lg border border-border/50 p-3 bg-background/50">
                    <p className="text-[10px] text-muted-foreground">{scenario.emoji} {scenario.name}</p>
                    <p className="text-sm font-bold text-foreground">${p.margin.toLocaleString()}</p>
                    <p className={`text-[10px] ${p.marginPercent > 50 ? "text-emerald-400" : p.marginPercent > 20 ? "text-amber-400" : "text-red-400"}`}>
                      margem {p.marginPercent}%
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-4">
              <Button onClick={onSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar Modelo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
