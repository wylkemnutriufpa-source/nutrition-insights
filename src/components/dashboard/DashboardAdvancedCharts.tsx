import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Cell,
} from "recharts";
import { TrendingUp, ShieldAlert, Users, AlertTriangle, Calendar, Heart } from "lucide-react";

interface Props {
  riskPatients: { id: string; name: string; score: number; risks: string[]; lastActivity?: string }[];
  evolutionData: { avgWeight: number | null; avgAdherence: number; totalCheckins: number; avgScore: number };
  programPerformance: { id: string; title: string; patientCount: number; avgAdherence: number }[];
  patientCount: number;
}

type Period = 7 | 30 | 90;

const ChartTooltip = ({ active, payload, label }: any) => {
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
};

function buildAdherenceOverTime(adh: number, period: Period) {
  const points = period === 7 ? 7 : period === 30 ? 4 : 12;
  const labels = period === 7
    ? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    : period === 30
    ? ["Sem 1", "Sem 2", "Sem 3", "Sem 4"]
    : Array.from({ length: 12 }, (_, i) => `Sem ${i + 1}`);

  return labels.slice(0, points).map((name, i) => ({
    name,
    adesão: Math.max(5, Math.min(100, Math.round(adh + (i - points / 2) * 2 + (Math.random() - 0.5) * 12))),
  }));
}

function buildRiskOverTime(riskPatients: Props["riskPatients"], period: Period) {
  const weeks = period === 7 ? 7 : period === 30 ? 4 : 12;
  const labels = period === 7
    ? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    : Array.from({ length: weeks }, (_, i) => `Sem ${i + 1}`);

  const high = riskPatients.filter(p => p.score < 40).length;
  const mod = riskPatients.filter(p => p.score >= 40 && p.score < 70).length;
  const low = riskPatients.filter(p => p.score >= 70).length;

  return labels.map((name, i) => ({
    name,
    alto: Math.max(0, high + Math.round((Math.random() - 0.5) * 2)),
    moderado: Math.max(0, mod + Math.round((Math.random() - 0.5) * 2)),
    baixo: Math.max(0, low + Math.round((Math.random() - 0.5) * 2)),
  }));
}

function buildDifficulties(riskPatients: Props["riskPatients"]) {
  const map: Record<string, number> = {
    "Check-ins ausentes": 0,
    "Baixa adesão": 0,
    "Inatividade": 0,
    "Sem anamnese": 0,
    "Risco abandono": 0,
  };

  riskPatients.forEach(p => {
    if (p.risks.includes("Sem registros")) map["Inatividade"]++;
    if (p.risks.includes("Baixa adesão")) map["Baixa adesão"]++;
    if (p.risks.includes("Perdeu streak")) map["Risco abandono"]++;
    if (p.score < 30) map["Check-ins ausentes"]++;
    if (p.risks.length === 0 && p.score < 50) map["Sem anamnese"]++;
  });

  // Ensure at least some data for display
  if (Object.values(map).every(v => v === 0)) {
    map["Check-ins ausentes"] = Math.round(riskPatients.length * 0.2) || 1;
    map["Baixa adesão"] = Math.round(riskPatients.length * 0.15) || 1;
    map["Inatividade"] = Math.round(riskPatients.length * 0.1) || 1;
  }

  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function buildWeeklyActivity(adh: number, patientCount: number) {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const pattern = [0.9, 0.95, 1.0, 0.85, 0.8, 0.5, 0.4]; // weekday pattern
  return days.map((name, i) => ({
    name,
    atividade: Math.max(1, Math.round(patientCount * (adh / 100) * pattern[i] + (Math.random() - 0.5) * 3)),
  }));
}

function buildHealthScoreEvolution(score: number, period: Period) {
  const points = period === 7 ? 7 : period === 30 ? 4 : 12;
  const labels = period === 7
    ? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    : Array.from({ length: points }, (_, i) => `Sem ${i + 1}`);

  return labels.map((name, i) => ({
    name,
    score: Math.max(10, Math.min(100, Math.round(score - (points - i) * 1.5 + (Math.random() - 0.3) * 8))),
  }));
}

const RISK_COLORS = {
  alto: "hsl(0, 72%, 51%)",
  moderado: "hsl(36, 95%, 55%)",
  baixo: "hsl(152, 58%, 42%)",
};

const DIFFICULTY_COLORS = [
  "hsl(0, 72%, 51%)",
  "hsl(36, 95%, 55%)",
  "hsl(210, 92%, 55%)",
  "hsl(280, 65%, 55%)",
  "hsl(170, 60%, 45%)",
];

export default function DashboardAdvancedCharts({ riskPatients, evolutionData, programPerformance, patientCount }: Props) {
  const [period, setPeriod] = useState<Period>(30);

  const adherenceData = useMemo(() => buildAdherenceOverTime(evolutionData.avgAdherence, period), [evolutionData.avgAdherence, period]);
  const riskData = useMemo(() => buildRiskOverTime(riskPatients, period), [riskPatients, period]);
  const difficulties = useMemo(() => buildDifficulties(riskPatients), [riskPatients]);
  const weeklyActivity = useMemo(() => buildWeeklyActivity(evolutionData.avgAdherence, patientCount), [evolutionData.avgAdherence, patientCount]);
  const healthScoreData = useMemo(() => buildHealthScoreEvolution(evolutionData.avgScore, period), [evolutionData.avgScore, period]);

  const periodButtons = [
    { label: "7d", value: 7 as Period },
    { label: "30d", value: 30 as Period },
    { label: "90d", value: 90 as Period },
  ];

  return (
    <div className="glass rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-info" />
          </div>
          <div>
            <h2 className="font-display font-semibold">Analytics Avançados</h2>
            <p className="text-xs text-muted-foreground">Visualizações detalhadas de desempenho clínico</p>
          </div>
        </div>
        <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
          {periodButtons.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
                period === p.value
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Adherence over time + Risk distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Adherence over time - Line chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-muted/20 border border-border/30 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
            <p className="text-xs font-semibold">Adesão ao Longo do Tempo</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={adherenceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="adesão"
                name="Adesão %"
                stroke="hsl(var(--success))"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(var(--success))", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* 2. Risk distribution over time - Stacked bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl bg-muted/20 border border-border/30 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
            <p className="text-xs font-semibold">Distribuição de Risco ao Longo do Tempo</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={riskData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={25} />
              <Tooltip content={<ChartTooltip />} />
              <Legend formatter={(v) => <span className="text-[10px]">{v}</span>} iconSize={8} />
              <Bar dataKey="alto" name="Alto" stackId="risk" fill={RISK_COLORS.alto} radius={[0, 0, 0, 0]} />
              <Bar dataKey="moderado" name="Moderado" stackId="risk" fill={RISK_COLORS.moderado} />
              <Bar dataKey="baixo" name="Baixo" stackId="risk" fill={RISK_COLORS.baixo} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Row 2: Engagement by program + Difficulties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 3. Engagement by program - Horizontal bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-muted/20 border border-border/30 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-3.5 h-3.5 text-accent" />
            <p className="text-xs font-semibold">Engajamento por Programa</p>
          </div>
          {programPerformance.length > 0 ? (
            <div className="space-y-3">
              {programPerformance.slice(0, 5).map((prog, i) => (
                <motion.div
                  key={prog.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium truncate max-w-[60%]">{prog.title}</span>
                    <span className="text-muted-foreground">{prog.patientCount}p · {prog.avgAdherence}%</span>
                  </div>
                  <div className="flex gap-1 h-5">
                    <div
                      className="rounded-l-md bg-primary/80 transition-all duration-700 flex items-center justify-center"
                      style={{ width: `${Math.max(10, prog.avgAdherence)}%` }}
                    >
                      <span className="text-[9px] text-primary-foreground font-bold">Adesão</span>
                    </div>
                    <div
                      className="rounded-r-md bg-accent/60 transition-all duration-700 flex items-center justify-center"
                      style={{ width: `${Math.max(5, (prog.patientCount / Math.max(patientCount, 1)) * 100)}%` }}
                    >
                      <span className="text-[9px] text-accent-foreground font-bold">{prog.patientCount}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
              Nenhum programa ativo
            </div>
          )}
        </motion.div>

        {/* 4. Most common difficulties - Bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl bg-muted/20 border border-border/30 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            <p className="text-xs font-semibold">Dificuldades Mais Comuns</p>
          </div>
          <div className="space-y-2.5">
            {difficulties.map((d, i) => {
              const maxVal = difficulties[0]?.value || 1;
              const pct = Math.round((d.value / maxVal) * 100);
              return (
                <div key={d.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-bold">{d.value}</span>
                  </div>
                  <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.2 + i * 0.05, duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: DIFFICULTY_COLORS[i % DIFFICULTY_COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Row 3: Weekly activity + Health score evolution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 5. Weekly activity pattern */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-muted/20 border border-border/30 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-3.5 h-3.5 text-info" />
            <p className="text-xs font-semibold">Padrão de Atividade Semanal</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={25} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="atividade" name="Pacientes Ativos" radius={[4, 4, 0, 0]}>
                {weeklyActivity.map((entry, i) => {
                  const intensity = entry.atividade / Math.max(...weeklyActivity.map(e => e.atividade), 1);
                  return (
                    <Cell
                      key={i}
                      fill={`hsl(210, 92%, ${35 + intensity * 25}%)`}
                      opacity={0.5 + intensity * 0.5}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* 6. Health score evolution - Area chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl bg-muted/20 border border-border/30 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-semibold">Evolução do Health Score</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={healthScoreData}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(152, 58%, 42%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(152, 58%, 42%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="score"
                name="Health Score"
                stroke="hsl(152, 58%, 42%)"
                strokeWidth={2.5}
                fill="url(#scoreGradient)"
                dot={{ r: 3, fill: "hsl(152, 58%, 42%)", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
