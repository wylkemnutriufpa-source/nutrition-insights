import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Brain, TrendingDown, Zap, DollarSign, Activity, Cpu } from "lucide-react";

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
  metadata: any;
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

      setData(rows || []);
      setLoading(false);
    };
    fetchData();
  }, [period]);

  // Aggregations
  const byFunction = data.reduce<Record<string, number>>((acc, r) => {
    acc[r.feature_key] = (acc[r.feature_key] || 0) + 1;
    return acc;
  }, {});

  const byUser = data.reduce<Record<string, number>>((acc, r) => {
    acc[r.user_id] = (acc[r.user_id] || 0) + 1;
    return acc;
  }, {});

  const byDay = data.reduce<Record<string, number>>((acc, r) => {
    const day = r.used_at.slice(0, 10);
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const functionChart = Object.entries(byFunction)
    .map(([name, count]) => ({ name: name.replace(/-/g, " "), count, cost: ((COST_PER_CALL[name] || 0.003) * count).toFixed(3) }))
    .sort((a, b) => b.count - a.count);

  const dailyChart = Object.entries(byDay)
    .map(([date, count]) => ({ date: date.slice(5), count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalCalls = data.length;
  const totalCost = data.reduce((sum, r) => sum + (COST_PER_CALL[r.feature_key] || 0.003), 0);
  const uniqueUsers = new Set(data.map(r => r.user_id)).size;

  // Estimate savings: functions that are now deterministic
  const deterministicFunctions = ["analyze-body", "generate-report", "ifj-predictive-briefing", "analyze-anamnesis", "generate-feature-marketing"];
  const savedCalls = data.filter(r => deterministicFunctions.includes(r.feature_key)).length;

  const pieData = Object.entries(byFunction)
    .map(([name, value]) => ({ name: name.replace(/-/g, " "), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Monitoramento de Custo IA
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Controle de chamadas e economia após migração determinística</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Zap className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{totalCalls}</p>
                <p className="text-xs text-muted-foreground">Chamadas IA totais</p>
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
                <p className="text-xs text-muted-foreground">Custo estimado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10"><Activity className="w-5 h-5 text-accent" /></div>
              <div>
                <p className="text-2xl font-bold">{uniqueUsers}</p>
                <p className="text-xs text-muted-foreground">Usuários únicos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><Cpu className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-green-600">{savedCalls}</p>
                <p className="text-xs text-muted-foreground">Chamadas migradas (economia)</p>
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
        </TabsList>

        <TabsContent value="functions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chamadas por Função</CardTitle>
              <CardDescription>Funções mais utilizadas e custo estimado</CardDescription>
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
                    <Tooltip formatter={(value: number) => [value, "Chamadas"]} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Cost table */}
              <div className="mt-4 space-y-2">
                {functionChart.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                    <span className="font-medium">{f.name}</span>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{f.count} calls</Badge>
                      <Badge variant={parseFloat(f.cost) > 0 ? "destructive" : "outline"} className="text-[10px]">
                        ${f.cost}
                      </Badge>
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
            </CardHeader>
            <CardContent>
              {dailyChart.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhum dado no período selecionado.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Função</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhum dado no período selecionado.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
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
            Economia após Desacoplamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Funções 100% determinísticas</p>
              <p className="text-lg font-bold text-green-600">6 funções</p>
              <p className="text-[10px] text-muted-foreground">analyze-body, generate-report, ifj-predictive-briefing, analyze-anamnesis, generate-feature-marketing, process-anamnesis-flags</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Funções híbridas</p>
              <p className="text-lg font-bold text-primary">2 funções</p>
              <p className="text-[10px] text-muted-foreground">analyze-meal (DB lookup + fallback IA), clinical-decision-support (engine + copilot)</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Economia estimada mensal</p>
              <p className="text-lg font-bold text-green-600">~70-80%</p>
              <p className="text-[10px] text-muted-foreground">Redução de custo IA após migração Fase 1 + Fase 2</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
