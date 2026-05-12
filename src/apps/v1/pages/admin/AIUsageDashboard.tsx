import { useState, useEffect } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Brain, TrendingDown, Zap, DollarSign, Activity, Cpu, Database, RefreshCw, Target } from "lucide-react";
import { Button } from "@v1/components/ui/button";
import { Link } from "react-router-dom";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--warning))", "hsl(var(--destructive))", "#8884d8", "#82ca9d"];

const COST_PER_CALL: Record<string, number> = {
  "analyze-meal": 0.003,
  "clinical-decision-support": 0.005,
  "generate-recipe": 0.004,
  "ifj-conversational": 0.003,
  "ifj-patient-coach": 0.003,
  "clinical-insights": 0.005,
  "generate-report": 0,
  "analyze-body": 0,
  "analyze-anamnesis": 0,
  "ifj-predictive-briefing": 0,
  "generate-feature-marketing": 0,
};

interface UsageRow {
  feature_key: string;
  used_at: string;
  user_id: string;
  metadata: Record<string, unknown> | null;
}

type SourceType = "deterministic" | "ai_fallback" | "cache_hit" | "unknown";

function getSource(row: UsageRow): SourceType {
  const meta = row.metadata as Record<string, unknown> | null;
  if (!meta?.source) return "unknown";
  const s = String(meta.source);
  if (s === "deterministic" || s === "ai_fallback" || s === "cache_hit") return s;
  return "unknown";
}

export default function AIUsageDashboard() {
  const [data, setData] = useState<UsageRow[]>([]);
  const [period, setPeriod] = useState("30");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - parseInt(period));

      const { data: rows } = await supabase
        .from("ai_usage_tracking")
        .select("feature_key, used_at, user_id, metadata")
        .gte("used_at", since.toISOString())
        .order("used_at", { ascending: false })
        .limit(1000);

      setData((rows as UsageRow[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [period]);

  // Source breakdown
  const bySource = data.reduce<Record<SourceType, number>>((acc, r) => {
    const src = getSource(r);
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, { deterministic: 0, ai_fallback: 0, cache_hit: 0, unknown: 0 });

  // Aggregations
  const byFunction = data.reduce<Record<string, { total: number; deterministic: number; ai: number; cache: number }>>((acc, r) => {
    if (!acc[r.feature_key]) acc[r.feature_key] = { total: 0, deterministic: 0, ai: 0, cache: 0 };
    acc[r.feature_key].total++;
    const src = getSource(r);
    if (src === "deterministic") acc[r.feature_key].deterministic++;
    else if (src === "ai_fallback") acc[r.feature_key].ai++;
    else if (src === "cache_hit") acc[r.feature_key].cache++;
    return acc;
  }, {});

  const byUser = data.reduce<Record<string, { total: number; ai: number }>>((acc, r) => {
    if (!acc[r.user_id]) acc[r.user_id] = { total: 0, ai: 0 };
    acc[r.user_id].total++;
    if (getSource(r) === "ai_fallback") acc[r.user_id].ai++;
    return acc;
  }, {});

  const byDay = data.reduce<Record<string, { total: number; deterministic: number; ai: number; cache: number }>>((acc, r) => {
    const day = r.used_at.slice(0, 10);
    if (!acc[day]) acc[day] = { total: 0, deterministic: 0, ai: 0, cache: 0 };
    acc[day].total++;
    const src = getSource(r);
    if (src === "deterministic") acc[day].deterministic++;
    else if (src === "ai_fallback") acc[day].ai++;
    else if (src === "cache_hit") acc[day].cache++;
    return acc;
  }, {});

  const functionChart = Object.entries(byFunction)
    .map(([name, stats]) => ({
      name: name.replace(/-/g, " "),
      total: stats.total,
      deterministic: stats.deterministic,
      ai: stats.ai,
      cache: stats.cache,
      cost: ((COST_PER_CALL[name] || 0.003) * stats.ai).toFixed(3),
    }))
    .sort((a, b) => b.total - a.total);

  const dailyChart = Object.entries(byDay)
    .map(([date, stats]) => ({ date: date.slice(5), ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const topUsers = Object.entries(byUser)
    .map(([id, stats]) => ({ id: id.slice(0, 8), ...stats }))
    .sort((a, b) => b.ai - a.ai)
    .slice(0, 10);

  const totalCalls = data.length;
  const aiCalls = bySource.ai_fallback;
  const deterministicCalls = bySource.deterministic;
  const cacheHits = bySource.cache_hit;
  const totalCost = data.reduce((sum, r) => {
    if (getSource(r) === "ai_fallback") return sum + (COST_PER_CALL[r.feature_key] || 0.003);
    return sum;
  }, 0);
  const savedCost = data.reduce((sum, r) => {
    const src = getSource(r);
    if (src === "deterministic" || src === "cache_hit") return sum + (COST_PER_CALL[r.feature_key] || 0.003);
    return sum;
  }, 0);
  const uniqueUsers = new Set(data.map(r => r.user_id)).size;

  const deterministicFunctions = ["analyze-body", "generate-report", "ifj-predictive-briefing", "analyze-anamnesis", "generate-feature-marketing"];
  const savedCalls = data.filter(r => deterministicFunctions.includes(r.feature_key) || getSource(r) === "deterministic" || getSource(r) === "cache_hit").length;

  const sourceChart = [
    { name: "Determinístico", value: deterministicCalls },
    { name: "Fallback IA", value: aiCalls },
    { name: "Cache Hit", value: cacheHits },
    { name: "Outros", value: bySource.unknown },
  ].filter(d => d.value > 0);

  const SOURCE_COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#94a3b8"];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Monitoramento de Custo IA
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Controle de chamadas, cache e economia — Fase 4</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/v1/admin/meal-coverage">
            <Button variant="outline" size="sm" className="gap-2">
              <Target className="w-4 h-4" /> Cobertura Alimentar
            </Button>
          </Link>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Zap className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{totalCalls}</p>
                <p className="text-xs text-muted-foreground">Chamadas totais</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><Cpu className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-green-600">{deterministicCalls}</p>
                <p className="text-xs text-muted-foreground">Determinísticas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Database className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{cacheHits}</p>
                <p className="text-xs text-muted-foreground">Cache Hits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><DollarSign className="w-5 h-5 text-destructive" /></div>
              <div>
                <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Custo IA real</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><TrendingDown className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-green-600">${savedCost.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Economia gerada</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="functions">
        <TabsList>
          <TabsTrigger value="functions">Por Função</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="distribution">Distribuição</TabsTrigger>
          <TabsTrigger value="users">Top Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="functions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chamadas por Função</CardTitle>
              <CardDescription>Breakdown: determinístico vs IA vs cache</CardDescription>
            </CardHeader>
            <CardContent>
              {functionChart.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhum dado no período selecionado.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={functionChart} layout="vertical" margin={{ left: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="deterministic" stackId="a" fill="#22c55e" name="Determinístico" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="cache" stackId="a" fill="#3b82f6" name="Cache" />
                    <Bar dataKey="ai" stackId="a" fill="#ef4444" name="IA Fallback" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              <div className="mt-4 space-y-2">
                {functionChart.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                    <span className="font-medium">{f.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{f.total} total</Badge>
                      {f.deterministic > 0 && <Badge className="bg-green-500/20 text-green-700 text-[10px]">{f.deterministic} det</Badge>}
                      {f.cache > 0 && <Badge className="bg-blue-500/20 text-blue-700 text-[10px]">{f.cache} cache</Badge>}
                      {f.ai > 0 && <Badge variant="destructive" className="text-[10px]">{f.ai} IA (${f.cost})</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chamadas por Dia</CardTitle>
              <CardDescription>Volume diário por tipo de resolução</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyChart.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhum dado no período selecionado.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="deterministic" stackId="a" fill="#22c55e" name="Determinístico" />
                    <Bar dataKey="cache" stackId="a" fill="#3b82f6" name="Cache" />
                    <Bar dataKey="ai" stackId="a" fill="#ef4444" name="IA Fallback" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Fonte</CardTitle>
              <CardDescription>Proporção entre determinístico, cache e IA</CardDescription>
            </CardHeader>
            <CardContent>
              {sourceChart.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhum dado no período selecionado.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={sourceChart} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {sourceChart.map((_, idx) => (
                        <Cell key={idx} fill={SOURCE_COLORS[idx % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Consumidores de IA</CardTitle>
              <CardDescription>Usuários com mais chamadas de fallback IA</CardDescription>
            </CardHeader>
            <CardContent>
              {topUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhum dado no período selecionado.</p>
              ) : (
                <div className="space-y-2">
                  {topUsers.map((u, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                      <span className="font-mono text-xs">{u.id}…</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{u.total} total</Badge>
                        {u.ai > 0 && <Badge variant="destructive" className="text-[10px]">{u.ai} IA</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Savings Summary */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-green-600" />
            Economia — Fase 3
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Base alimentar</p>
              <p className="text-lg font-bold text-green-600">250+ alimentos</p>
              <p className="text-[10px] text-muted-foreground">TACO/IBGE + sinônimos + pratos compostos</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Funções 100% determinísticas</p>
              <p className="text-lg font-bold text-green-600">6 funções</p>
              <p className="text-[10px] text-muted-foreground">analyze-body, generate-report, briefing, anamnesis, marketing, process-flags</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cache de análises IA</p>
              <p className="text-lg font-bold text-blue-600">TTL 30 dias</p>
              <p className="text-[10px] text-muted-foreground">Evita chamadas repetidas para mesma refeição</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Economia estimada</p>
              <p className="text-lg font-bold text-green-600">~85-90%</p>
              <p className="text-[10px] text-muted-foreground">Redução após Fase 1 + 2 + 3 (base expandida + cache)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
