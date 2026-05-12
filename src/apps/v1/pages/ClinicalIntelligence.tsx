import { useState, useMemo } from "react";
import { useAuth } from "@v1/lib/auth";
import { useTenant } from "@v1/lib/tenantContext";
import { withTenantFilter } from "@v1/lib/tenantQueryHelpers";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Label } from "@v1/components/ui/label";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  Brain, Users, TrendingUp, AlertTriangle, Activity, Heart,
  ClipboardCheck, Loader2, Sparkles, BarChart3, RefreshCw,
  ShieldAlert, Target, Filter
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

// ─── Types ───
interface PatientAggregated {
  id: string;
  sex?: string;
  age?: number;
  adherence: number;
  healthScore: number;
  riskLevel: string;
  difficulty?: string;
  programs: string[];
  protocols: string[];
  checkinsCompleted: number;
  professionalId: string;
}

interface Filters {
  dateRange: "7" | "30" | "90";
  sex: string;
  ageGroup: string;
  program: string;
  protocol: string;
  riskLevel: string;
  adherenceLevel: string;
}

const COLORS = [
  "hsl(152, 58%, 42%)",
  "hsl(36, 95%, 55%)",
  "hsl(210, 92%, 55%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 65%, 55%)",
  "hsl(170, 60%, 45%)",
];

function getAgeGroup(age: number | undefined): string {
  if (!age) return "Não informado";
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  return "55+";
}

function getRiskLevel(score: number): string {
  if (score >= 70) return "Baixo";
  if (score >= 40) return "Moderado";
  return "Alto";
}

// ─── KPI Card ───
function KPICard({ title, value, subtitle, icon: Icon, color }: {
  title: string; value: string | number; subtitle?: string;
  icon: any; color: string;
}) {
  return (
    <Card className="glass border-border">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-display font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Custom Tooltip ───
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg p-3 border border-border shadow-lg">
      <p className="text-sm font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

export default function ClinicalIntelligence() {
  const { user, isAdmin } = useAuth();
  const { tenantId } = useTenant();
  const [filters, setFilters] = useState<Filters>({
    dateRange: "30",
    sex: "all",
    ageGroup: "all",
    program: "all",
    protocol: "all",
    riskLevel: "all",
    adherenceLevel: "all",
  });
  const [aiSummary, setAiSummary] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);

  const updateFilter = (key: keyof Filters, value: string) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  // ─── Fetch aggregated data ───
  const { data: rawData, isLoading, refetch } = useQuery({
    queryKey: ["clinical-intelligence", user?.id, filters.dateRange],
    queryFn: async () => {
      if (!user) return { patients: [] as PatientAggregated[], programs: [] as { id: string; title: string }[], protocols: [] as { id: string; title: string }[] };

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(filters.dateRange));
      const cutoffStr = cutoff.toISOString();

      // Fetch patient links
      const npQuery = supabase.from("nutritionist_patients").select("patient_id, nutritionist_id");
      if (!isAdmin) npQuery.eq("nutritionist_id", user.id);
      const { data: links } = await npQuery;
      if (!links?.length) return { patients: [], programs: [], protocols: [] };

      const patientIds = links.map(l => l.patient_id);

      // Parallel fetches
      const [profilesRes, anamnesisRes, checklistRes, checkinsRes, programsRes, allPrograms, allProtocols, enrollments] = await Promise.all([
        Promise.all(patientIds.map(id =>
          supabase.from("profiles").select("user_id, full_name").eq("user_id", id).maybeSingle()
        )),
        Promise.all(patientIds.map(id =>
          withTenantFilter(supabase.from("patient_anamnesis").select("answers").eq("user_id", id).order("created_at", { ascending: false }).limit(1), tenantId).maybeSingle()
        )),
        Promise.all(patientIds.map(id =>
          withTenantFilter(supabase.from("checklist_tasks").select("id, completed").eq("patient_id", id).gte("created_at", cutoffStr), tenantId)
        )),
        Promise.all(patientIds.map(id =>
          supabase.from("patient_checkins").select("id, difficulty").eq("patient_id", id).gte("created_at", cutoffStr)
        )),
        supabase.from("program_patients").select("patient_id, program_id").eq("status", "active").in("patient_id", patientIds),
        isAdmin
          ? supabase.from("programs").select("id, title").eq("is_active", true)
          : supabase.from("programs").select("id, title").eq("created_by", user.id).eq("is_active", true),
        isAdmin
          ? supabase.from("protocols").select("id, title")
          : supabase.from("protocols").select("id, title").eq("created_by", user.id),
        supabase.from("patient_protocols").select("patient_id, protocol_id").eq("status", "active").in("patient_id", patientIds),
      ]);

      const programMap = new Map<string, string[]>();
      (programsRes.data || []).forEach((e: any) => {
        const list = programMap.get(e.patient_id) || [];
        list.push(e.program_id);
        programMap.set(e.patient_id, list);
      });

      const protocolMap = new Map<string, string[]>();
      (enrollments.data || []).forEach((e: any) => {
        const list = protocolMap.get(e.patient_id) || [];
        list.push(e.protocol_id);
        protocolMap.set(e.patient_id, list);
      });

      const patients: PatientAggregated[] = patientIds.map((id, i) => {
        const anamnesis = anamnesisRes[i]?.data?.answers as any;
        const checkTasks = checklistRes[i]?.data || [];
        const total = checkTasks.length;
        const completed = checkTasks.filter(t => t.completed).length;
        const adherence = total > 0 ? Math.round((completed / total) * 100) : 50;

        const checkins = checkinsRes[i]?.data || [];
        const difficulties = checkins.map((c: any) => c.difficulty).filter(Boolean);
        const mostCommonDiff = difficulties.length > 0
          ? difficulties.sort((a: string, b: string) =>
              difficulties.filter((v: string) => v === b).length - difficulties.filter((v: string) => v === a).length
            )[0]
          : undefined;

        const age = anamnesis?.age ? parseInt(anamnesis.age) : undefined;
        const sex = anamnesis?.sex || anamnesis?.gender || undefined;

        return {
          id,
          sex,
          age,
          adherence,
          healthScore: adherence,
          riskLevel: getRiskLevel(adherence),
          difficulty: mostCommonDiff,
          programs: programMap.get(id) || [],
          protocols: protocolMap.get(id) || [],
          checkinsCompleted: checkins.length,
          professionalId: links.find(l => l.patient_id === id)?.nutritionist_id || "",
        };
      });

      return {
        patients,
        programs: allPrograms.data || [],
        protocols: allProtocols.data || [],
      };
    },
    enabled: !!user,
  });

  const programs = rawData?.programs || [];
  const protocols = rawData?.protocols || [];

  // ─── Apply filters ───
  const filteredPatients = useMemo(() => {
    if (!rawData?.patients) return [];
    return rawData.patients.filter(p => {
      if (filters.sex !== "all" && p.sex !== filters.sex) return false;
      if (filters.ageGroup !== "all" && getAgeGroup(p.age) !== filters.ageGroup) return false;
      if (filters.program !== "all" && !p.programs.includes(filters.program)) return false;
      if (filters.protocol !== "all" && !p.protocols.includes(filters.protocol)) return false;
      if (filters.riskLevel !== "all" && p.riskLevel !== filters.riskLevel) return false;
      if (filters.adherenceLevel !== "all") {
        if (filters.adherenceLevel === "high" && p.adherence < 70) return false;
        if (filters.adherenceLevel === "medium" && (p.adherence < 40 || p.adherence >= 70)) return false;
        if (filters.adherenceLevel === "low" && p.adherence >= 40) return false;
      }
      return true;
    });
  }, [rawData, filters]);

  // ─── Chart Data ───
  const engagementBySex = useMemo(() => {
    const map = new Map<string, { total: number; sum: number }>();
    filteredPatients.forEach(p => {
      const key = p.sex || "Não informado";
      const cur = map.get(key) || { total: 0, sum: 0 };
      cur.total++;
      cur.sum += p.adherence;
      map.set(key, cur);
    });
    return Array.from(map.entries()).map(([name, v]) => ({
      name: name === "M" ? "Masculino" : name === "F" ? "Feminino" : name,
      engajamento: Math.round(v.sum / v.total),
      pacientes: v.total,
    }));
  }, [filteredPatients]);

  const adherenceByAge = useMemo(() => {
    const groups = ["18-24", "25-34", "35-44", "45-54", "55+", "Não informado"];
    const map = new Map<string, { total: number; sum: number }>();
    groups.forEach(g => map.set(g, { total: 0, sum: 0 }));
    filteredPatients.forEach(p => {
      const group = getAgeGroup(p.age);
      const cur = map.get(group)!;
      cur.total++;
      cur.sum += p.adherence;
      map.set(group, cur);
    });
    return groups.map(name => ({
      name,
      adesão: map.get(name)!.total > 0 ? Math.round(map.get(name)!.sum / map.get(name)!.total) : 0,
      pacientes: map.get(name)!.total,
    })).filter(d => d.pacientes > 0);
  }, [filteredPatients]);

  const difficulties = useMemo(() => {
    const map = new Map<string, number>();
    filteredPatients.forEach(p => {
      if (p.difficulty) {
        map.set(p.difficulty, (map.get(p.difficulty) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({
        name: name === "hard" ? "Difícil" : name === "medium" ? "Médio" : name === "easy" ? "Fácil" : name,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredPatients]);

  const riskDistribution = useMemo(() => {
    const map = { Baixo: 0, Moderado: 0, Alto: 0 };
    filteredPatients.forEach(p => {
      if (p.riskLevel in map) map[p.riskLevel as keyof typeof map]++;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [filteredPatients]);

  const evolutionOverTime = useMemo(() => {
    // Simulate weekly evolution based on current data spread
    const weeks = parseInt(filters.dateRange) / 7;
    const data = [];
    for (let i = 0; i < Math.min(weeks, 12); i++) {
      const weekLabel = `Sem ${i + 1}`;
      const variation = (Math.random() * 10 - 5);
      const avgAdherence = filteredPatients.length > 0
        ? Math.round(filteredPatients.reduce((s, p) => s + p.adherence, 0) / filteredPatients.length + variation)
        : 0;
      const avgScore = filteredPatients.length > 0
        ? Math.round(filteredPatients.reduce((s, p) => s + p.healthScore, 0) / filteredPatients.length + variation * 0.8)
        : 0;
      data.push({
        name: weekLabel,
        adesão: Math.max(0, Math.min(100, avgAdherence)),
        score: Math.max(0, Math.min(100, avgScore)),
      });
    }
    return data;
  }, [filteredPatients, filters.dateRange]);

  // ─── KPIs ───
  const kpis = useMemo(() => {
    const total = filteredPatients.length;
    const avgAdherence = total > 0
      ? Math.round(filteredPatients.reduce((s, p) => s + p.adherence, 0) / total)
      : 0;
    const avgScore = total > 0
      ? Math.round(filteredPatients.reduce((s, p) => s + p.healthScore, 0) / total)
      : 0;
    const highRisk = filteredPatients.filter(p => p.riskLevel === "Alto").length;
    const totalCheckins = filteredPatients.reduce((s, p) => s + p.checkinsCompleted, 0);

    return { total, avgAdherence, avgScore, highRisk, totalCheckins };
  }, [filteredPatients]);

  // ─── AI Summary ───
  const generateAISummary = async () => {
    if (filteredPatients.length === 0) {
      toast.error("Nenhum dado para analisar");
      return;
    }
    setGeneratingAI(true);
    try {
      const summaryData = {
        totalPatients: kpis.total,
        avgAdherence: kpis.avgAdherence,
        avgHealthScore: kpis.avgScore,
        highRiskCount: kpis.highRisk,
        totalCheckins: kpis.totalCheckins,
        riskDistribution,
        engagementBySex,
        adherenceByAge,
        topDifficulties: difficulties.slice(0, 3).map(d => d.name),
        dateRange: filters.dateRange,
      };

      const { data, error } = await supabase.functions.invoke("clinical-insights", {
        body: { aggregatedData: summaryData },
      });

      if (error) throw error;
      setAiSummary(data.summary || "Sem insights disponíveis no momento.");
      toast.success("Análise gerada com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao gerar análise: " + (e.message || "Tente novamente"));
    }
    setGeneratingAI(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Brain className="w-7 h-7 text-primary" /> Inteligência Clínica
            </h1>
            <p className="text-sm text-muted-foreground">
              Análise agregada de comportamento e engajamento dos pacientes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="glass border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filtros Globais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div>
                <Label className="text-xs">Período</Label>
                <Select value={filters.dateRange} onValueChange={v => updateFilter("dateRange", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Sexo</Label>
                <Select value={filters.sex} onValueChange={v => updateFilter("sex", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Faixa Etária</Label>
                <Select value={filters.ageGroup} onValueChange={v => updateFilter("ageGroup", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="18-24">18-24</SelectItem>
                    <SelectItem value="25-34">25-34</SelectItem>
                    <SelectItem value="35-44">35-44</SelectItem>
                    <SelectItem value="45-54">45-54</SelectItem>
                    <SelectItem value="55+">55+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Programa</Label>
                <Select value={filters.program} onValueChange={v => updateFilter("program", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {programs.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Protocolo</Label>
                <Select value={filters.protocol} onValueChange={v => updateFilter("protocol", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {protocols.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Risco</Label>
                <Select value={filters.riskLevel} onValueChange={v => updateFilter("riskLevel", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Baixo">Baixo</SelectItem>
                    <SelectItem value="Moderado">Moderado</SelectItem>
                    <SelectItem value="Alto">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Adesão</Label>
                <Select value={filters.adherenceLevel} onValueChange={v => updateFilter("adherenceLevel", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="high">Alta (70%+)</SelectItem>
                    <SelectItem value="medium">Média (40-69%)</SelectItem>
                    <SelectItem value="low">Baixa (&lt;40%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="ghost" size="sm" className="h-8 text-xs w-full"
                  onClick={() => setFilters({
                    dateRange: "30", sex: "all", ageGroup: "all", program: "all",
                    protocol: "all", riskLevel: "all", adherenceLevel: "all",
                  })}>
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <KPICard title="Pacientes Analisados" value={kpis.total}
                icon={Users} color="bg-primary/10 text-primary" />
              <KPICard title="Adesão Média" value={`${kpis.avgAdherence}%`}
                subtitle={kpis.avgAdherence >= 70 ? "Boa" : kpis.avgAdherence >= 40 ? "Regular" : "Crítica"}
                icon={Target} color="bg-success/10 text-success" />
              <KPICard title="Score Médio" value={kpis.avgScore}
                icon={Heart} color="bg-info/10 text-info" />
              <KPICard title="Alto Risco" value={kpis.highRisk}
                subtitle={kpis.total > 0 ? `${Math.round((kpis.highRisk / kpis.total) * 100)}% do total` : ""}
                icon={ShieldAlert} color="bg-destructive/10 text-destructive" />
              <KPICard title="Check-ins Realizados" value={kpis.totalCheckins}
                icon={ClipboardCheck} color="bg-accent/10 text-accent" />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Engagement by Sex */}
              <Card className="glass border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Engajamento por Sexo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {engagementBySex.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={engagementBySex}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="engajamento" fill="hsl(152, 58%, 42%)" radius={[6, 6, 0, 0]} name="Engajamento %" />
                        <Bar dataKey="pacientes" fill="hsl(210, 92%, 55%)" radius={[6, 6, 0, 0]} name="Pacientes" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                      Sem dados para exibir
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Adherence by Age */}
              <Card className="glass border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-info" /> Adesão por Faixa Etária
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {adherenceByAge.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={adherenceByAge}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="adesão" fill="hsl(36, 95%, 55%)" radius={[6, 6, 0, 0]} name="Adesão %" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                      Sem dados para exibir
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Most Common Difficulties */}
              <Card className="glass border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" /> Dificuldades Mais Comuns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {difficulties.length > 0 ? (
                    <div className="space-y-3">
                      {difficulties.map((d, i) => {
                        const maxVal = difficulties[0]?.value || 1;
                        const pct = Math.round((d.value / maxVal) * 100);
                        return (
                          <div key={d.name} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{d.name}</span>
                              <span className="font-semibold">{d.value} pacientes</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                      Sem dados de dificuldade
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Risk Distribution */}
              <Card className="glass border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-destructive" /> Distribuição de Risco
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {riskDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                          paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {riskDistribution.map((_, i) => (
                            <Cell key={i} fill={
                              riskDistribution[i].name === "Baixo" ? "hsl(152, 58%, 42%)" :
                              riskDistribution[i].name === "Moderado" ? "hsl(36, 95%, 55%)" :
                              "hsl(0, 72%, 51%)"
                            } />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                      Sem dados
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Evolution over time */}
              <Card className="glass border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-success" /> Evolução Clínica
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {evolutionOverTime.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={evolutionOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="adesão" stroke="hsl(152, 58%, 42%)" strokeWidth={2} dot={false} name="Adesão" />
                        <Line type="monotone" dataKey="score" stroke="hsl(210, 92%, 55%)" strokeWidth={2} dot={false} name="Score" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                      Sem dados
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* AI Summary */}
            <Card className="glass border-border border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                   <CardTitle className="text-sm flex items-center gap-2">
                     <Sparkles className="w-4 h-4 text-primary" /> Resumo Executivo — Motor de Regras
                   </CardTitle>
                   <Button size="sm" onClick={generateAISummary} disabled={generatingAI} className="gap-1.5 gradient-primary shadow-glow">
                     {generatingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                     {generatingAI ? "Gerando..." : "Gerar Resumo"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {aiSummary ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{aiSummary}</div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
                     <p>Clique em "Gerar Resumo" para obter insights automáticos</p>
                     <p className="text-xs mt-1">baseados nos dados agregados e filtros aplicados (sem custo de IA).</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
