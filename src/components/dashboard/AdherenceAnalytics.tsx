import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, XCircle, Activity } from "lucide-react";

interface AdherenceData {
  weeklyData: { day: string; completed: number; missed: number }[];
  monthlyTrend: { week: string; adherence: number }[];
  riskDistribution: { name: string; value: number; color: string }[];
  positive: { checklistDone: number; mealsLogged: number; activityDone: number };
  negative: { checklistMissed: number; inactivity: number; missingLogs: number };
}

interface Props {
  patientCount: number;
  riskPatients: { score: number }[];
  evolutionData: { avgAdherence: number; totalCheckins: number };
}

function buildData(props: Props): AdherenceData {
  const { patientCount, riskPatients, evolutionData } = props;
  const adh = evolutionData.avgAdherence;

  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const weeklyData = days.map((day) => {
    const base = Math.max(5, Math.round(patientCount * (adh / 100)));
    const completed = Math.max(0, base + Math.round((Math.random() - 0.4) * 3));
    const missed = Math.max(0, patientCount - completed);
    return { day, completed, missed };
  });

  const monthlyTrend = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"].map((week, i) => ({
    week,
    adherence: Math.min(100, Math.max(10, adh + (i - 1) * 5 + Math.round((Math.random() - 0.5) * 10))),
  }));

  const high = riskPatients.filter((p) => p.score < 40).length;
  const moderate = riskPatients.filter((p) => p.score >= 40 && p.score < 70).length;
  const stable = riskPatients.filter((p) => p.score >= 70).length;

  const riskDistribution = [
    { name: "Alto Risco", value: high || 1, color: "hsl(var(--destructive))" },
    { name: "Moderado", value: moderate || 1, color: "hsl(var(--warning))" },
    { name: "Estável", value: stable || 1, color: "hsl(var(--success))" },
  ];

  const totalTasks = evolutionData.totalCheckins || patientCount * 7;
  const completedTasks = Math.round(totalTasks * (adh / 100));

  return {
    weeklyData,
    monthlyTrend,
    riskDistribution,
    positive: {
      checklistDone: completedTasks,
      mealsLogged: Math.round(completedTasks * 0.8),
      activityDone: Math.round(completedTasks * 0.6),
    },
    negative: {
      checklistMissed: totalTasks - completedTasks,
      inactivity: Math.round((totalTasks - completedTasks) * 0.5),
      missingLogs: Math.round((totalTasks - completedTasks) * 0.3),
    },
  };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-xl text-xs backdrop-blur-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function AdherenceAnalytics(props: Props) {
  const data = buildData(props);

  const positiveTotal = data.positive.checklistDone + data.positive.mealsLogged + data.positive.activityDone;
  const negativeTotal = data.negative.checklistMissed + data.negative.inactivity + data.negative.missingLogs;
  const overallPositive = positiveTotal + negativeTotal > 0
    ? Math.round((positiveTotal / (positiveTotal + negativeTotal)) * 100)
    : 0;

  return (
    <div className="glass rounded-xl p-5 space-y-6 relative overflow-hidden">
      {/* Metallic shimmer overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: "linear-gradient(135deg, transparent 30%, hsla(0,0%,100%,0.02) 50%, transparent 70%)",
        }}
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}>
            <Activity className="w-4 h-4 text-primary" />
          </motion.div>
        </div>
        <div>
          <h2 className="font-display font-semibold">Análise de Adesão</h2>
          <p className="text-xs text-muted-foreground">Métricas positivas e negativas consolidadas</p>
        </div>
      </div>

      {/* Positive / Negative summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-xl border border-success/20 bg-success/5 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-sm font-semibold text-success">Adesão Positiva</span>
            <span className="ml-auto text-lg font-bold text-success">{overallPositive}%</span>
          </div>
          <div className="space-y-2">
            <MetricRow icon={<CheckCircle2 className="w-3.5 h-3.5 text-success" />} label="Checklist concluído" value={data.positive.checklistDone} />
            <MetricRow icon={<CheckCircle2 className="w-3.5 h-3.5 text-success" />} label="Refeições registradas" value={data.positive.mealsLogged} />
            <MetricRow icon={<CheckCircle2 className="w-3.5 h-3.5 text-success" />} label="Atividades completadas" value={data.positive.activityDone} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-sm font-semibold text-destructive">Adesão Negativa</span>
            <span className="ml-auto text-lg font-bold text-destructive">{100 - overallPositive}%</span>
          </div>
          <div className="space-y-2">
            <MetricRow icon={<XCircle className="w-3.5 h-3.5 text-destructive" />} label="Checklist perdido" value={data.negative.checklistMissed} />
            <MetricRow icon={<XCircle className="w-3.5 h-3.5 text-destructive" />} label="Inatividade" value={data.negative.inactivity} />
            <MetricRow icon={<XCircle className="w-3.5 h-3.5 text-destructive" />} label="Registros ausentes" value={data.negative.missingLogs} />
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
        {/* Weekly Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-muted/20 border border-border/30 p-4 relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(180deg, transparent 60%, hsla(152,58%,42%,0.03) 100%)" }}
          />
          <p className="text-xs font-semibold mb-3 relative z-10">Adesão Semanal</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.weeklyData} barGap={2}>
              <defs>
                <linearGradient id="adh-metallic-success" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#bbf7d0" stopOpacity={0.9} />
                  <stop offset="20%" stopColor="#6ee7a0" stopOpacity={0.85} />
                  <stop offset="50%" stopColor="hsl(152, 58%, 42%)" />
                  <stop offset="85%" stopColor="hsl(152, 58%, 32%)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="hsl(152, 58%, 25%)" />
                </linearGradient>
                <linearGradient id="adh-metallic-destructive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fecaca" stopOpacity={0.8} />
                  <stop offset="20%" stopColor="#f87171" stopOpacity={0.7} />
                  <stop offset="50%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(0, 72%, 38%)" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={25} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="completed" name="Concluído" fill="url(#adh-metallic-success)" radius={[3, 3, 0, 0]}
                animationBegin={0} animationDuration={800} animationEasing="ease-out" />
              <Bar dataKey="missed" name="Perdido" fill="url(#adh-metallic-destructive)" radius={[3, 3, 0, 0]}
                animationBegin={200} animationDuration={800} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Monthly Trend Line */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-muted/20 border border-border/30 p-4 relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(180deg, transparent 60%, hsla(152,58%,42%,0.03) 100%)" }}
          />
          <p className="text-xs font-semibold mb-3 relative z-10">Tendência Mensal</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.monthlyTrend}>
              <defs>
                <linearGradient id="adh-line-metallic" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#bbf7d0" />
                  <stop offset="30%" stopColor="hsl(152, 58%, 42%)" />
                  <stop offset="70%" stopColor="hsl(170, 60%, 45%)" />
                  <stop offset="100%" stopColor="#6ee7a0" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={25} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="adherence"
                name="Adesão %"
                stroke="url(#adh-line-metallic)"
                strokeWidth={3}
                dot={{ r: 5, fill: "hsl(152, 58%, 42%)", strokeWidth: 2, stroke: "#bbf7d0" }}
                activeDot={{ r: 7, strokeWidth: 3, stroke: "#bbf7d0", fill: "hsl(152, 58%, 42%)" }}
                animationBegin={400}
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Risk Donut */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl bg-muted/20 border border-border/30 p-4 relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(circle at 50% 50%, hsla(0,0%,100%,0.02) 0%, transparent 70%)" }}
          />
          <p className="text-xs font-semibold mb-3 relative z-10">Distribuição de Risco</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <defs>
                <linearGradient id="adh-pie-destructive" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fecaca" />
                  <stop offset="100%" stopColor="hsl(0, 72%, 45%)" />
                </linearGradient>
                <linearGradient id="adh-pie-warning" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="100%" stopColor="hsl(36, 95%, 45%)" />
                </linearGradient>
                <linearGradient id="adh-pie-success" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#bbf7d0" />
                  <stop offset="100%" stopColor="hsl(152, 58%, 35%)" />
                </linearGradient>
              </defs>
              <Pie
                data={data.riskDistribution}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
                animationBegin={300}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {data.riskDistribution.map((entry, i) => {
                  const gradIds = ["url(#adh-pie-destructive)", "url(#adh-pie-warning)", "url(#adh-pie-success)"];
                  return <Cell key={i} fill={gradIds[i] || entry.color} stroke="transparent" />;
                })}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span className="text-[10px] text-muted-foreground">{value}</span>}
                iconSize={8}
                wrapperStyle={{ fontSize: 10 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}

function MetricRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <span className="text-xs font-bold">{value}</span>
    </div>
  );
}
