import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Brain, Search, AlertTriangle, TrendingUp, Database, ShieldCheck, Target, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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

const SOURCE_COLORS: Record<string, string> = {
  deterministic: "#22c55e",
  cache_hit: "#3b82f6",
  ai_fallback: "#ef4444",
  unknown: "#94a3b8",
};

const COST_PER_AI_CALL = 0.003;

export default function MealCoverageDashboard() {
  const [data, setData] = useState<UsageRow[]>([]);
  const [period, setPeriod] = useState("30");
  const [loading, setLoading] = useState(true);
  const [foodDbCount, setFoodDbCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - parseInt(period));

      const [{ data: rows }, { count }] = await Promise.all([
        supabase
          .from("ai_usage_tracking")
          .select("feature_key, used_at, user_id, metadata")
          .eq("feature_key", "analyze-meal")
          .gte("used_at", since.toISOString())
          .order("used_at", { ascending: false })
          .limit(1000),
        supabase
          .from("ifj_food_database" as any)
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
      ]);

      setData((rows as UsageRow[]) || []);
      setFoodDbCount(count || 0);
      setLoading(false);
    };
    fetchData();
  }, [period]);

  const mealData = data.filter(r => r.feature_key === "analyze-meal" && getSource(r) !== "unknown");

  // ─── KPIs ───
  const totalCalls = mealData.length;
  const deterministicCalls = mealData.filter(r => getSource(r) === "deterministic").length;
  const cacheHits = mealData.filter(r => getSource(r) === "cache_hit").length;
  const aiFallbacks = mealData.filter(r => getSource(r) === "ai_fallback").length;
  const deterministicRate = totalCalls > 0 ? Math.round((deterministicCalls / totalCalls) * 100) : 0;
  const cacheRate = totalCalls > 0 ? Math.round((cacheHits / totalCalls) * 100) : 0;
  const aiRate = totalCalls > 0 ? Math.round((aiFallbacks / totalCalls) * 100) : 0;
  const costSaved = (deterministicCalls + cacheHits) * COST_PER_AI_CALL;
  const costSpent = aiFallbacks * COST_PER_AI_CALL;

  // ─── Unmatched items aggregation ───
  const unmatchedAgg = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of mealData) {
      const meta = row.metadata as Record<string, unknown> | null;
      const items = meta?.unmatched_items as string[] | undefined;
      if (items) {
        for (const item of items) {
          const clean = item.toLowerCase().trim();
          if (clean.length > 1) counts[clean] = (counts[clean] || 0) + 1;
        }
      }
    }
    return Object.entries(counts)
      .map(([item, count]) => ({ item, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);
  }, [mealData]);

  // ─── Top AI-triggering users ───
  const topAIUsers = useMemo(() => {
    const counts: Record<string, { total: number; ai: number }> = {};
    for (const row of mealData) {
      if (!counts[row.user_id]) counts[row.user_id] = { total: 0, ai: 0 };
      counts[row.user_id].total++;
      if (getSource(row) === "ai_fallback") counts[row.user_id].ai++;
    }
    return Object.entries(counts)
      .map(([id, stats]) => ({ id: id.slice(0, 8), ...stats }))
      .filter(u => u.ai > 0)
      .sort((a, b) => b.ai - a.ai)
      .slice(0, 10);
  }, [mealData]);

  // ─── Daily trend ───
  const dailyTrend = useMemo(() => {
    const byDay: Record<string, { det: number; cache: number; ai: number }> = {};
    for (const row of mealData) {
      const day = row.used_at.slice(0, 10);
      if (!byDay[day]) byDay[day] = { det: 0, cache: 0, ai: 0 };
      const src = getSource(row);
      if (src === "deterministic") byDay[day].det++;
      else if (src === "cache_hit") byDay[day].cache++;
      else if (src === "ai_fallback") byDay[day].ai++;
    }
    return Object.entries(byDay)
      .map(([date, v]) => ({ date: date.slice(5), ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [mealData]);

  // ─── Match method distribution ───
  const matchMethodStats = useMemo(() => {
    let synonym = 0, plural = 0, compound = 0, total = 0;
    for (const row of mealData) {
      const meta = row.metadata as Record<string, unknown> | null;
      if (!meta) continue;
      total++;
      if (meta.used_synonym_match) synonym++;
      if (meta.used_plural_normalization) plural++;
      if (meta.used_compound_match) compound++;
    }
    return { synonym, plural, compound, total };
  }, [mealData]);

  // ─── Gap suggestions ───
  const gapSuggestions = useMemo(() => {
    return unmatchedAgg.map(item => ({
      ...item,
      impact: item.count >= 5 ? "alto" : item.count >= 2 ? "medio" : "baixo",
    }));
  }, [unmatchedAgg]);

  // ─── Source pie chart ───
  const sourceChart = [
    { name: "Determinístico", value: deterministicCalls },
    { name: "Cache Hit", value: cacheHits },
    { name: "Fallback IA", value: aiFallbacks },
  ].filter(d => d.value > 0);

  const PIE_COLORS = ["#22c55e", "#3b82f6", "#ef4444"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin/ai-usage">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h2 className="text-2xl font-display font-bold flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" />
              Cobertura Alimentar — Fase 4
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Observabilidade do motor determinístico analyze-meal
            </p>
          </div>
        </div>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{totalCalls}</p>
            <p className="text-xs text-muted-foreground">Análises totais</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="pt-5">
            <p className="text-2xl font-bold text-green-600">{deterministicRate}%</p>
            <p className="text-xs text-muted-foreground">Taxa determinística</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20">
          <CardContent className="pt-5">
            <p className="text-2xl font-bold text-blue-600">{cacheRate}%</p>
            <p className="text-xs text-muted-foreground">Taxa cache hit</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardContent className="pt-5">
            <p className="text-2xl font-bold text-destructive">{aiRate}%</p>
            <p className="text-xs text-muted-foreground">Taxa fallback IA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold text-green-600">${costSaved.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Economia gerada</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{foodDbCount}</p>
            <p className="text-xs text-muted-foreground">Alimentos na base</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="gaps">Lacunas</TabsTrigger>
          <TabsTrigger value="matching">Matching</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Fonte</CardTitle>
              </CardHeader>
              <CardContent>
                {sourceChart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={sourceChart} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {sourceChart.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tendência Diária</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyTrend.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="det" stackId="a" fill="#22c55e" name="Determinístico" />
                      <Bar dataKey="cache" stackId="a" fill="#3b82f6" name="Cache" />
                      <Bar dataKey="ai" stackId="a" fill="#ef4444" name="IA" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Match methods card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Métodos de Matching Utilizados
              </CardTitle>
              <CardDescription>
                Em {matchMethodStats.total} análises com metadados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{matchMethodStats.synonym}</p>
                  <p className="text-xs text-muted-foreground">Usaram sinônimos</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{matchMethodStats.plural}</p>
                  <p className="text-xs text-muted-foreground">Normalização plural</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{matchMethodStats.compound}</p>
                  <p className="text-xs text-muted-foreground">Match composto</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gaps */}
        <TabsContent value="gaps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Alimentos Não Encontrados (Top 30)
              </CardTitle>
              <CardDescription>
                Itens que mais acionam fallback IA — cadastrar estes reduz custo direto
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gapSuggestions.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">
                  Nenhum item não encontrado no período — excelente cobertura! 🎉
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alimento / Descrição</TableHead>
                      <TableHead className="text-center">Vezes</TableHead>
                      <TableHead className="text-center">Impacto</TableHead>
                      <TableHead className="text-center">Sugestão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gapSuggestions.map((g, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{g.item}</TableCell>
                        <TableCell className="text-center">{g.count}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={g.impact === "alto" ? "destructive" : g.impact === "medio" ? "secondary" : "outline"}
                            className="text-[10px]">
                            {g.impact}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {g.impact === "alto" ? "Cadastrar urgente" : g.impact === "medio" ? "Cadastrar" : "Avaliar"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Economy projection */}
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Projeção de Economia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Se cadastrar top 10 itens</p>
                  <p className="text-lg font-bold text-green-600">
                    ~${(gapSuggestions.slice(0, 10).reduce((s, g) => s + g.count, 0) * COST_PER_AI_CALL).toFixed(3)}/período
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Se cadastrar top 20 itens</p>
                  <p className="text-lg font-bold text-green-600">
                    ~${(gapSuggestions.slice(0, 20).reduce((s, g) => s + g.count, 0) * COST_PER_AI_CALL).toFixed(3)}/período
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Se cadastrar todos os 30</p>
                  <p className="text-lg font-bold text-green-600">
                    ~${(gapSuggestions.reduce((s, g) => s + g.count, 0) * COST_PER_AI_CALL).toFixed(3)}/período
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Matching details */}
        <TabsContent value="matching" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Detalhes de Matching
              </CardTitle>
              <CardDescription>Análise detalhada da resolução alimentar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 rounded-lg bg-green-500/10">
                  <p className="text-2xl font-bold text-green-600">{deterministicCalls}</p>
                  <p className="text-xs text-muted-foreground">Resolvidos localmente</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-500/10">
                  <p className="text-2xl font-bold text-blue-600">{cacheHits}</p>
                  <p className="text-xs text-muted-foreground">Servidos do cache</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-destructive/10">
                  <p className="text-2xl font-bold text-destructive">{aiFallbacks}</p>
                  <p className="text-xs text-muted-foreground">Enviados para IA</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{foodDbCount}</p>
                  <p className="text-xs text-muted-foreground">Alimentos ativos</p>
                </div>
              </div>

              {/* Recent AI fallback reasons */}
              <h4 className="font-medium text-sm mb-2">Últimas análises com fallback IA</h4>
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {mealData
                  .filter(r => getSource(r) === "ai_fallback")
                  .slice(0, 15)
                  .map((row, i) => {
                    const meta = row.metadata as Record<string, unknown> | null;
                    return (
                      <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                        <div>
                          <span className="text-muted-foreground">{new Date(row.used_at).toLocaleDateString("pt-BR")}</span>
                          <span className="mx-2">·</span>
                          <span>match: {String(meta?.match_ratio ?? "?")}</span>
                          <span className="mx-2">·</span>
                          <span>items: {String(meta?.matched_count ?? "?")}/{String(meta?.total_items ?? "?")}</span>
                        </div>
                        <Badge variant="destructive" className="text-[9px]">
                          {String(meta?.ai_reason ?? "low_match")}
                        </Badge>
                      </div>
                    );
                  })}
                {mealData.filter(r => getSource(r) === "ai_fallback").length === 0 && (
                  <p className="text-center text-muted-foreground py-4">Nenhum fallback IA no período 🎉</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Top Usuários — Fallback IA
              </CardTitle>
              <CardDescription>Usuários que mais geram chamadas IA no analyze-meal</CardDescription>
            </CardHeader>
            <CardContent>
              {topAIUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhum fallback IA no período</p>
              ) : (
                <div className="space-y-2">
                  {topAIUsers.map((u, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/50">
                      <span className="font-mono text-xs">{u.id}…</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{u.total} total</Badge>
                        <Badge variant="destructive" className="text-[10px]">
                          {u.ai} IA (${(u.ai * COST_PER_AI_CALL).toFixed(3)})
                        </Badge>
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
  );
}
