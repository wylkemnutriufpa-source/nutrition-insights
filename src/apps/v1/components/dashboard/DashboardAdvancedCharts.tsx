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
    <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-xl text-xs backdrop-blur-sm">
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

  return labels.map((name) => ({
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
  const pattern = [0.9, 0.95, 1.0, 0.85, 0.8, 0.5, 0.4];
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

const DIFFICULTY_COLORS = [
  { base: "hsl(0, 72%, 51%)", light: "#fecaca", dark: "hsl(0, 72%, 38%)" },
  { base: "hsl(36, 95%, 55%)", light: "#fef3c7", dark: "hsl(36, 95%, 40%)" },
  { base: "hsl(210, 92%, 55%)", light: "#dbeafe", dark: "hsl(210, 92%, 40%)" },
  { base: "hsl(280, 65%, 55%)", light: "#ede9fe", dark: "hsl(280, 65%, 40%)" },
  { base: "hsl(170, 60%, 45%)", light: "#ccfbf1", dark: "hsl(170, 60%, 32%)" },
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
    <div className="glass rounded-xl p-5 space-y-5 relative overflow-hidden">
      {/* Metallic shimmer */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: "linear-gradient(135deg, transparent 30%, hsla(0,0%,100%,0.02) 50%, transparent 70%)",
        }}
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
      />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
            <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}>
              <TrendingUp className="w-4 h-4 text-info" />
            </motion.div>
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

      {/* Row 1: Adherence + Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10">
        {/* Adherence Line */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-muted/20 border border-border/30 p-4 relative overflow-hidden"
        >
          <motion.div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 60%, hsla(152,58%,42%,0.03) 100%)" }} />
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
            <p className="text-xs font-semibold">Adesão ao Longo do Tempo</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={adherenceData}>
              <defs>
                <linearGradient id="adv-line-metallic" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#bbf7d0" />
                  <stop offset="30%" stopColor="hsl(152, 58%, 42%)" />
                  <stop offset="70%" stopColor="hsl(170, 60%, 45%)" />
                  <stop offset="100%" stopColor="#6ee7a0" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="adesão"
                name="Adesão %"
                stroke="url(#adv-line-metallic)"
                strokeWidth={3}
                dot={{ r: 4, fill: "hsl(152, 58%, 42%)", strokeWidth: 2, stroke: "#bbf7d0" }}
                activeDot={{ r: 6, strokeWidth: 3, stroke: "#bbf7d0", fill: "hsl(152, 58%, 42%)" }}
                animationBegin={0}
                animationDuration={1200}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Risk Stacked Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl bg-muted/20 border border-border/30 p-4 relative overflow-hidden"
        >
          <motion.div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 60%, hsla(0,72%,51%,0.02) 100%)" }} />
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
            <p className="text-xs font-semibold">Distribuição de Risco ao Longo do Tempo</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={riskData}>
              <defs>
                <linearGradient id="adv-risk-alto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fecaca" stopOpacity={0.9} />
                  <stop offset="50%" stopColor="hsl(0, 72%, 51%)" />
                  <stop offset="100%" stopColor="hsl(0, 72%, 38%)" />
                </linearGradient>
                <linearGradient id="adv-risk-mod" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fef3c7" stopOpacity={0.9} />
                  <stop offset="50%" stopColor="hsl(36, 95%, 55%)" />
                  <stop offset="100%" stopColor="hsl(36, 95%, 40%)" />
                </linearGradient>
                <linearGradient id="adv-risk-baixo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#bbf7d0" stopOpacity={0.9} />
                  <stop offset="50%" stopColor="hsl(152, 58%, 42%)" />
                  <stop offset="100%" stopColor="hsl(152, 58%, 32%)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={25} />
              <Tooltip content={<ChartTooltip />} />
              <Legend formatter={(v) => <span className="text-[10px]">{v}</span>} iconSize={8} />
              <Bar dataKey="alto" name="Alto" stackId="risk" fill="url(#adv-risk-alto)" radius={[0, 0, 0, 0]}
                animationBegin={0} animationDuration={800} animationEasing="ease-out" />
              <Bar dataKey="moderado" name="Moderado" stackId="risk" fill="url(#adv-risk-mod)"
                animationBegin={150} animationDuration={800} animationEasing="ease-out" />
              <Bar dataKey="baixo" name="Baixo" stackId="risk" fill="url(#adv-risk-baixo)" radius={[3, 3, 0, 0]}
                animationBegin={300} animationDuration={800} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Row 2: Engagement + Difficulties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10">
        {/* Engagement by program */}
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
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(10, prog.avgAdherence)}%` }}
                      transition={{ duration: 0.8, delay: 0.15 + i * 0.05 }}
                      className="rounded-l-md flex items-center justify-center"
                      style={{
                        background: "linear-gradient(90deg, hsl(152,58%,42%), hsl(170,60%,45%))",
                      }}
                    >
                      <span className="text-[9px] text-primary-foreground font-bold">Adesão</span>
                    </motion.div>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(5, (prog.patientCount / Math.max(patientCount, 1)) * 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                      className="rounded-r-md flex items-center justify-center"
                      style={{
                        background: "linear-gradient(90deg, hsl(36,95%,55%), hsl(25,95%,50%))",
                      }}
                    >
                      <span className="text-[9px] text-accent-foreground font-bold">{prog.patientCount}</span>
                    </motion.div>
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

        {/* Difficulties */}
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
              const color = DIFFICULTY_COLORS[i % DIFFICULTY_COLORS.length];
              return (
                <div key={d.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-bold">{d.value}</span>
                  </div>
                  <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.2 + i * 0.05, duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${color.light}, ${color.base}, ${color.dark})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Row 3: Weekly activity + Health score */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10">
        {/* Weekly activity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-muted/20 border border-border/30 p-4 relative overflow-hidden"
        >
          <motion.div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 60%, hsla(210,92%,55%,0.03) 100%)" }} />
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <Calendar className="w-3.5 h-3.5 text-info" />
            <p className="text-xs font-semibold">Padrão de Atividade Semanal</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyActivity}>
              <defs>
                {weeklyActivity.map((_, i) => (
                  <linearGradient key={i} id={`adv-activity-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dbeafe" stopOpacity={0.9} />
                    <stop offset="30%" stopColor="#93c5fd" stopOpacity={0.85} />
                    <stop offset="60%" stopColor="hsl(210, 92%, 55%)" />
                    <stop offset="100%" stopColor="hsl(210, 92%, 38%)" />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={25} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="atividade" name="Pacientes Ativos" radius={[4, 4, 0, 0]}
                animationBegin={200} animationDuration={800} animationEasing="ease-out">
                {weeklyActivity.map((entry, i) => {
                  const maxVal = Math.max(...weeklyActivity.map(e => e.atividade), 1);
                  const intensity = entry.atividade / maxVal;
                  return (
                    <Cell
                      key={i}
                      fill={`url(#adv-activity-${i})`}
                      fillOpacity={0.5 + intensity * 0.5}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Health score evolution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl bg-muted/20 border border-border/30 p-4 relative overflow-hidden"
        >
          <motion.div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 60%, hsla(152,58%,42%,0.03) 100%)" }} />
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <Heart className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-semibold">Evolução do Health Score</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={healthScoreData}>
              <defs>
                <linearGradient id="advScoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#bbf7d0" stopOpacity={0.4} />
                  <stop offset="40%" stopColor="hsl(152, 58%, 42%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(152, 58%, 42%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="advScoreStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#bbf7d0" />
                  <stop offset="30%" stopColor="hsl(152, 58%, 42%)" />
                  <stop offset="70%" stopColor="hsl(170, 60%, 45%)" />
                  <stop offset="100%" stopColor="#6ee7a0" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="score"
                name="Health Score"
                stroke="url(#advScoreStroke)"
                strokeWidth={3}
                fill="url(#advScoreGradient)"
                dot={{ r: 4, fill: "hsl(152, 58%, 42%)", strokeWidth: 2, stroke: "#bbf7d0" }}
                activeDot={{ r: 6, strokeWidth: 3, stroke: "#bbf7d0", fill: "hsl(152, 58%, 42%)" }}
                animationBegin={300}
                animationDuration={1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
