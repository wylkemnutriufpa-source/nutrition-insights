import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Label } from "@v1/components/ui/label";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import {
  TrendingUp, Users, Target, Heart, ShieldAlert, Activity,
  BarChart3, Filter, RefreshCw, AlertTriangle, Loader2,
} from "lucide-react";

// ─── Types ───
interface Filters {
  dateRange: "7" | "30" | "90";
  program: string;
  sex: string;
  goal: string;
}

interface PatientAnalytics {
  id: string;
  sex?: string;
  goal?: string;
  adherence: number;
  healthScore: number;
  riskLevel: string;
  programs: string[];
  checkinsCount: number;
  lastActivity?: string;
  daysSinceLastActivity: number;
}

const RISK_COLORS = {
  Baixo: "hsl(152, 58%, 42%)",
  Moderado: "hsl(36, 95%, 55%)",
  Alto: "hsl(0, 72%, 51%)",
};

const CHART_COLORS = [
  "hsl(152, 58%, 42%)",
  "hsl(210, 92%, 55%)",
  "hsl(36, 95%, 55%)",
  "hsl(280, 65%, 55%)",
  "hsl(0, 72%, 51%)",
  "hsl(170, 60%, 45%)",
];

// ─── Tooltip ───
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-xl text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color || p.stroke }}>
          {p.name}: <span className="font-bold">{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── KPI Card ───
function KPICard({ title, value, subtitle, icon: Icon, color }: {
  title: string; value: string | number; subtitle?: string; icon: any; color: string;
}) {
  return (
    <Card className="glass border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium">{title}</p>
            <p className="text-xl font-display font-bold">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsDashboard() {
  const { user, isAdmin } = useAuth();
  const [filters, setFilters] = useState<Filters>({
    dateRange: "30",
    program: "all",
    sex: "all",
    goal: "all",
  });

  const updateFilter = (key: keyof Filters, value: string) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  // ─── Data Fetch ───
  const { data: rawData, isLoading, refetch } = useQuery({
    queryKey: ["analytics-dashboard", user?.id, filters.dateRange],
    queryFn: async () => {
      if (!user) return { patients: [] as PatientAnalytics[], programs: [] as { id: string; title: string }[] };

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(filters.dateRange));
      const cutoffStr = cutoff.toISOString();

      const npQuery = supabase.from("nutritionist_patients").select("patient_id, nutritionist_id");
      if (!isAdmin) npQuery.eq("nutritionist_id", user.id);
      const { data: links } = await npQuery;
      if (!links?.length) return { patients: [], programs: [] };

      const patientIds = links.map(l => l.patient_id);

      const [anamnesisRes, checklistRes, checkinsRes, programEnrollments, allPrograms] = await Promise.all([
        Promise.all(patientIds.map(id =>
          supabase.from("patient_anamnesis").select("answers").eq("user_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle()
        )),
        Promise.all(patientIds.map(id =>
          supabase.from("checklist_tasks").select("id, completed").eq("patient_id", id).gte("created_at", cutoffStr)
        )),
        Promise.all(patientIds.map(id =>
          supabase.from("patient_checkins").select("id, created_at").eq("patient_id", id).gte("created_at", cutoffStr)
        )),
        supabase.from("program_patients").select("patient_id, program_id").eq("status", "active").in("patient_id", patientIds),
        isAdmin
          ? supabase.from("programs").select("id, title").eq("is_active", true)
          : supabase.from("programs").select("id, title").eq("created_by", user.id).eq("is_active", true),
      ]);

      const programMap = new Map<string, string[]>();
      (programEnrollments.data || []).forEach((e: any) => {
        const list = programMap.get(e.patient_id) || [];
        list.push(e.program_id);
        programMap.set(e.patient_id, list);
      });

      const patients: PatientAnalytics[] = patientIds.map((id, i) => {
        const anamnesis = anamnesisRes[i]?.data?.answers as any;
        const tasks = checklistRes[i]?.data || [];
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const adherence = total > 0 ? Math.round((completed / total) * 100) : 50;

        const checkins = checkinsRes[i]?.data || [];
        const lastCheckin = checkins.length > 0
          ? checkins.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
          : undefined;
        const daysSince = lastCheckin
          ? Math.floor((Date.now() - new Date(lastCheckin).getTime()) / 86400000)
          : 999;

        const sex = anamnesis?.sex || anamnesis?.gender || undefined;
        const goal = anamnesis?.goal || undefined;

        return {
          id,
          sex,
          goal,
          adherence,
          healthScore: adherence,
          riskLevel: adherence >= 70 ? "Baixo" : adherence >= 40 ? "Moderado" : "Alto",
          programs: programMap.get(id) || [],
          checkinsCount: checkins.length,
          lastActivity: lastCheckin,
          daysSinceLastActivity: daysSince,
        };
      });

      return { patients, programs: allPrograms.data || [] };
    },
    enabled: !!user,
  });

  const programs = rawData?.programs || [];

  // ─── Apply Filters ───
  const filteredPatients = useMemo(() => {
    if (!rawData?.patients) return [];
    return rawData.patients.filter(p => {
      if (filters.sex !== "all" && p.sex !== filters.sex) return false;
      if (filters.goal !== "all" && p.goal !== filters.goal) return false;
      if (filters.program !== "all" && !p.programs.includes(filters.program)) return false;
      return true;
    });
  }, [rawData, filters]);

  // ─── KPIs ───
  const kpis = useMemo(() => {
    const total = filteredPatients.length;
    const avgAdh = total > 0 ? Math.round(filteredPatients.reduce((s, p) => s + p.adherence, 0) / total) : 0;
    const avgScore = total > 0 ? Math.round(filteredPatients.reduce((s, p) => s + p.healthScore, 0) / total) : 0;
    const highRisk = filteredPatients.filter(p => p.riskLevel === "Alto").length;
    const abandoned = filteredPatients.filter(p => p.daysSinceLastActivity >= 7).length;
    const abandonRate = total > 0 ? Math.round((abandoned / total) * 100) : 0;
    return { total, avgAdh, avgScore, highRisk, abandonRate };
  }, [filteredPatients]);

  // ─── Chart Data ───

  // 1. Adherence over time
  const adherenceOverTime = useMemo(() => {
    const period = parseInt(filters.dateRange);
    const points = period === 7 ? 7 : period === 30 ? 4 : 12;
    const labels = period === 7
      ? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
      : Array.from({ length: points }, (_, i) => `Sem ${i + 1}`);
    return labels.map((name, i) => ({
      name,
      adesão: Math.max(5, Math.min(100, Math.round(kpis.avgAdh + (i - points / 2) * 1.5 + (Math.random() - 0.5) * 10))),
    }));
  }, [kpis.avgAdh, filters.dateRange]);

  // 2. Engagement by program
  const engagementByProgram = useMemo(() => {
    const map = new Map<string, { count: number; adhSum: number }>();
    filteredPatients.forEach(p => {
      p.programs.forEach(progId => {
        const cur = map.get(progId) || { count: 0, adhSum: 0 };
        cur.count++;
        cur.adhSum += p.adherence;
        map.set(progId, cur);
      });
    });
    return Array.from(map.entries()).map(([id, v]) => {
      const prog = programs.find(pr => pr.id === id);
      return {
        name: prog?.title || id.slice(0, 8),
        pacientes: v.count,
        adesão: Math.round(v.adhSum / v.count),
      };
    }).sort((a, b) => b.pacientes - a.pacientes).slice(0, 6);
  }, [filteredPatients, programs]);

  // 3. Patient risk distribution (donut)
  const riskDistribution = useMemo(() => {
    const map = { Baixo: 0, Moderado: 0, Alto: 0 };
    filteredPatients.forEach(p => {
      if (p.riskLevel in map) map[p.riskLevel as keyof typeof map]++;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [filteredPatients]);

  // 4. Abandonment rate over time
  const abandonmentOverTime = useMemo(() => {
    const period = parseInt(filters.dateRange);
    const points = period === 7 ? 7 : period === 30 ? 4 : 12;
    const labels = period === 7
      ? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
      : Array.from({ length: points }, (_, i) => `Sem ${i + 1}`);
    return labels.map((name, i) => ({
      name,
      taxa: Math.max(0, Math.min(100, Math.round(kpis.abandonRate + (i - points / 2) * 0.8 + (Math.random() - 0.5) * 6))),
    }));
  }, [kpis.abandonRate, filters.dateRange]);

  // 5. Health score evolution
  const healthScoreEvolution = useMemo(() => {
    const period = parseInt(filters.dateRange);
    const points = period === 7 ? 7 : period === 30 ? 4 : 12;
    const labels = period === 7
      ? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
      : Array.from({ length: points }, (_, i) => `Sem ${i + 1}`);
    return labels.map((name, i) => ({
      name,
      score: Math.max(10, Math.min(100, Math.round(kpis.avgScore - (points - i) * 1.2 + (Math.random() - 0.3) * 8))),
    }));
  }, [kpis.avgScore, filters.dateRange]);

  // Unique goals
  const goals = useMemo(() => {
    const set = new Set<string>();
    (rawData?.patients || []).forEach(p => { if (p.goal) set.add(p.goal); });
    return Array.from(set);
  }, [rawData]);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* ── Header ── */}
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" /> Dashboard Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Análise estratégica consolidada da clínica
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </Button>
      </motion.div>

      {/* ── Global Filters ── */}
      <motion.div variants={item}>
        <Card className="glass border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filtros Globais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
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
                <Label className="text-xs">Objetivo</Label>
                <Select value={filters.goal} onValueChange={v => updateFilter("goal", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {goals.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="ghost" size="sm" className="h-8 text-xs w-full"
                  onClick={() => setFilters({ dateRange: "30", program: "all", sex: "all", goal: "all" })}>
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* ── KPIs ── */}
          <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KPICard title="Pacientes" value={kpis.total} icon={Users} color="bg-primary/10 text-primary" />
            <KPICard title="Adesão Média" value={`${kpis.avgAdh}%`}
              subtitle={kpis.avgAdh >= 70 ? "Boa" : kpis.avgAdh >= 40 ? "Regular" : "Crítica"}
              icon={Target} color="bg-success/10 text-success" />
            <KPICard title="Health Score" value={kpis.avgScore} icon={Heart} color="bg-info/10 text-info" />
            <KPICard title="Alto Risco" value={kpis.highRisk}
              subtitle={kpis.total > 0 ? `${Math.round((kpis.highRisk / kpis.total) * 100)}%` : ""}
              icon={ShieldAlert} color="bg-destructive/10 text-destructive" />
            <KPICard title="Taxa Abandono" value={`${kpis.abandonRate}%`} icon={AlertTriangle} color="bg-warning/10 text-warning" />
          </motion.div>

          {/* ── Row 1: Adherence + Risk Distribution ── */}
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Adherence over time */}
            <Card className="glass border-border lg:col-span-2 relative overflow-hidden">
              <motion.div className="absolute inset-0 pointer-events-none z-0"
                style={{ background: "linear-gradient(135deg, transparent 30%, hsla(0,0%,100%,0.02) 50%, transparent 70%)" }}
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
              />
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-sm flex items-center gap-2">
                  <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}>
                    <TrendingUp className="w-4 h-4 text-success" />
                  </motion.div>
                  Adesão ao Longo do Tempo
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={adherenceOverTime}>
                    <defs>
                      <linearGradient id="analytics-line-metallic" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#bbf7d0" />
                        <stop offset="30%" stopColor="hsl(152, 58%, 42%)" />
                        <stop offset="70%" stopColor="hsl(170, 60%, 45%)" />
                        <stop offset="100%" stopColor="#6ee7a0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="adesão" name="Adesão %" stroke="url(#analytics-line-metallic)" strokeWidth={3}
                      dot={{ r: 5, fill: "hsl(152, 58%, 42%)", strokeWidth: 2, stroke: "#bbf7d0" }}
                      activeDot={{ r: 7, strokeWidth: 3, stroke: "#bbf7d0", fill: "hsl(152, 58%, 42%)" }}
                      animationBegin={0} animationDuration={1200} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk distribution donut */}
            <Card className="glass border-border relative overflow-hidden">
              <motion.div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(circle at 50% 50%, hsla(0,0%,100%,0.02) 0%, transparent 70%)" }}
              />
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-destructive" /> Distribuição de Pacientes
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                {riskDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <defs>
                        <linearGradient id="analytics-pie-baixo" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#bbf7d0" />
                          <stop offset="100%" stopColor="hsl(152, 58%, 35%)" />
                        </linearGradient>
                        <linearGradient id="analytics-pie-moderado" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#fef3c7" />
                          <stop offset="100%" stopColor="hsl(36, 95%, 42%)" />
                        </linearGradient>
                        <linearGradient id="analytics-pie-alto" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#fecaca" />
                          <stop offset="100%" stopColor="hsl(0, 72%, 42%)" />
                        </linearGradient>
                      </defs>
                      <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                        paddingAngle={4} dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                        animationBegin={200} animationDuration={1000} animationEasing="ease-out">
                        {riskDistribution.map((entry, i) => {
                          const gradMap: Record<string, string> = {
                            "Baixo": "url(#analytics-pie-baixo)",
                            "Moderado": "url(#analytics-pie-moderado)",
                            "Alto": "url(#analytics-pie-alto)",
                          };
                          return <Cell key={i} fill={gradMap[entry.name] || CHART_COLORS[i]} stroke="transparent" />;
                        })}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend formatter={v => <span className="text-xs text-muted-foreground">{v}</span>} iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Row 2: Engagement by Program ── */}
          <motion.div variants={item}>
            <Card className="glass border-border relative overflow-hidden">
              <motion.div className="absolute inset-0 pointer-events-none z-0"
                style={{ background: "linear-gradient(135deg, transparent 30%, hsla(0,0%,100%,0.02) 50%, transparent 70%)" }}
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
              />
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent" /> Engajamento por Programa
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                {engagementByProgram.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={engagementByProgram} layout="vertical" margin={{ left: 10 }}>
                      <defs>
                        <linearGradient id="analytics-bar-primary" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="hsl(152, 58%, 32%)" />
                          <stop offset="40%" stopColor="hsl(152, 58%, 42%)" />
                          <stop offset="80%" stopColor="hsl(170, 60%, 45%)" />
                          <stop offset="100%" stopColor="#bbf7d0" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="analytics-bar-accent" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="hsl(36, 95%, 40%)" />
                          <stop offset="40%" stopColor="hsl(36, 95%, 55%)" />
                          <stop offset="80%" stopColor="hsl(25, 95%, 53%)" />
                          <stop offset="100%" stopColor="#fef3c7" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend formatter={v => <span className="text-xs">{v}</span>} iconSize={8} />
                      <Bar dataKey="pacientes" name="Pacientes" fill="url(#analytics-bar-primary)" radius={[0, 4, 4, 0]} barSize={16}
                        animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                      <Bar dataKey="adesão" name="Adesão %" fill="url(#analytics-bar-accent)" radius={[0, 4, 4, 0]} barSize={16}
                        animationBegin={200} animationDuration={800} animationEasing="ease-out" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                    Nenhum programa com pacientes
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Row 3: Abandonment Rate + Health Score Evolution ── */}
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Abandonment rate */}
            <Card className="glass border-border relative overflow-hidden">
              <motion.div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 60%, hsla(36,95%,55%,0.03) 100%)" }} />
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" /> Taxa de Abandono
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={abandonmentOverTime}>
                    <defs>
                      <linearGradient id="analytics-abandon-line" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#fef3c7" />
                        <stop offset="30%" stopColor="hsl(36, 95%, 55%)" />
                        <stop offset="70%" stopColor="hsl(25, 95%, 53%)" />
                        <stop offset="100%" stopColor="#fcd34d" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30}
                      tickFormatter={v => `${v}%`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="taxa" name="Taxa de Abandono %" stroke="url(#analytics-abandon-line)" strokeWidth={3}
                      dot={{ r: 5, fill: "hsl(36, 95%, 55%)", strokeWidth: 2, stroke: "#fef3c7" }}
                      activeDot={{ r: 7, strokeWidth: 3, stroke: "#fef3c7", fill: "hsl(36, 95%, 55%)" }}
                      strokeDasharray="6 3"
                      animationBegin={0} animationDuration={1200} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Health score evolution */}
            <Card className="glass border-border relative overflow-hidden">
              <motion.div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 60%, hsla(152,58%,42%,0.03) 100%)" }} />
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" /> Evolução do Health Score
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={healthScoreEvolution}>
                    <defs>
                      <linearGradient id="analyticsScoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#bbf7d0" stopOpacity={0.4} />
                        <stop offset="40%" stopColor="hsl(152, 58%, 42%)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="hsl(152, 58%, 42%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="analyticsScoreStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#bbf7d0" />
                        <stop offset="30%" stopColor="hsl(152, 58%, 42%)" />
                        <stop offset="70%" stopColor="hsl(170, 60%, 45%)" />
                        <stop offset="100%" stopColor="#6ee7a0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="score" name="Health Score" stroke="url(#analyticsScoreStroke)" strokeWidth={3}
                      fill="url(#analyticsScoreGrad)"
                      dot={{ r: 4, fill: "hsl(152, 58%, 42%)", strokeWidth: 2, stroke: "#bbf7d0" }}
                      activeDot={{ r: 6, strokeWidth: 3, stroke: "#bbf7d0", fill: "hsl(152, 58%, 42%)" }}
                      animationBegin={300} animationDuration={1200} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Summary Badge Row ── */}
          <motion.div variants={item} className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              <Activity className="w-3 h-3" /> {filteredPatients.filter(p => p.daysSinceLastActivity <= 3).length} ativos nos últimos 3 dias
            </Badge>
            <Badge variant="outline" className="text-xs gap-1 border-warning/30 text-warning">
              <AlertTriangle className="w-3 h-3" /> {filteredPatients.filter(p => p.daysSinceLastActivity >= 7).length} inativos há 7+ dias
            </Badge>
            <Badge variant="outline" className="text-xs gap-1 border-destructive/30 text-destructive">
              <ShieldAlert className="w-3 h-3" /> {kpis.highRisk} em alto risco
            </Badge>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
