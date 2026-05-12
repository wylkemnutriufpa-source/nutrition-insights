import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Scale, Activity, Flame, TrendingUp, TrendingDown, Minus, Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BodyEvolutionCardProps {
  patientId: string;
  isPatientView?: boolean; // true = patient sees own evolution, false = nutritionist
}

function DeltaBadge({ value, unit = "", lowerIsBetter = false }: { value: number; unit?: string; lowerIsBetter?: boolean }) {
  const good = lowerIsBetter ? value < 0 : value > 0;
  const neutral = Math.abs(value) < 0.1;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
      neutral ? "bg-muted text-muted-foreground" :
      good ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
    }`}>
      {neutral ? <Minus className="w-2.5 h-2.5" /> : good ? <TrendingDown className="w-2.5 h-2.5" /> : <TrendingUp className="w-2.5 h-2.5" />}
      {value >= 0 ? "+" : ""}{value.toFixed(1)}{unit}
    </span>
  );
}

function BMIGauge({ bmi }: { bmi: number }) {
  // Zones: <18.5 | 18.5-25 | 25-30 | 30-35 | 35-40 | >40
  const zones = [
    { label: "Abaixo", max: 18.5, color: "#60a5fa" },
    { label: "Normal", max: 25, color: "#22c55e" },
    { label: "Sobrepeso", max: 30, color: "#f59e0b" },
    { label: "Obeso I", max: 35, color: "#f97316" },
    { label: "Obeso II", max: 40, color: "#ef4444" },
    { label: "Obeso III", max: 50, color: "#dc2626" },
  ];

  const pct = Math.min(Math.max((bmi / 50) * 100, 0), 100);
  const zone = zones.find(z => bmi < z.max) || zones[zones.length - 1];

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <span className="text-xs text-muted-foreground">IMC</span>
        <span className={`text-2xl font-display font-bold`} style={{ color: zone.color }}>{bmi}</span>
      </div>
      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        {/* Color gradient bar */}
        <div className="absolute inset-0 rounded-full" style={{
          background: "linear-gradient(to right, #60a5fa 0%, #22c55e 37%, #f59e0b 50%, #f97316 60%, #ef4444 70%, #dc2626 80%)"
        }} />
        {/* Needle */}
        <motion.div
          className="absolute top-0 bottom-0 w-1 bg-foreground rounded-full shadow-md"
          style={{ left: `calc(${pct}% - 2px)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>16</span><span>18.5</span><span>25</span><span>30</span><span>35</span><span>40+</span>
      </div>
      <p className="text-xs font-medium" style={{ color: zone.color }}>{zone.label}</p>
    </div>
  );
}

export default function BodyEvolutionCard({ patientId, isPatientView = false }: BodyEvolutionCardProps) {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("physical_assessments" as any)
        .select("*")
        .eq("patient_id", patientId)
        .order("assessment_date", { ascending: true })
        .limit(15);
      setAssessments((data as any[]) || []);
      setLoading(false);
    })();
  }, [patientId]);

  const latest = assessments[assessments.length - 1];
  const previous = assessments[assessments.length - 2];

  const chartData = useMemo(() => assessments.map(a => ({
    date: new Date(a.assessment_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    peso: a.weight ? +a.weight : null,
    gordura: a.body_fat_percentage ? +a.body_fat_percentage : null,
    magra: a.lean_mass ? +a.lean_mass : null,
    imc: a.bmi ? +a.bmi : null,
    cintura: a.waist ? +a.waist : null,
    quadril: a.hip ? +a.hip : null,
    bracoD: a.right_arm ? +a.right_arm : null,
    get: a.tdee ? +a.tdee : null,
    tmb: a.bmr ? +a.bmr : null,
  })), [assessments]);

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (assessments.length === 0) return (
    <div className="glass rounded-xl p-8 text-center">
      <Scale className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
      <h3 className="font-display font-semibold text-lg mb-2">Nenhuma avaliação registrada</h3>
      {!isPatientView && (
        <Button onClick={() => navigate(`/physical-assessment?patientId=${patientId}`)} className="gradient-primary gap-2 shadow-glow mt-2">
          <Activity className="w-4 h-4" /> Fazer primeira avaliação
        </Button>
      )}
    </div>
  );

  const tooltipStyle = {
    contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 },
    labelStyle: { color: "hsl(var(--foreground))" },
  };

  return (
    <div className="space-y-6">
      {/* Latest summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Peso", value: latest?.weight, unit: "kg", color: "text-primary", prev: previous?.weight, lowerBetter: true },
          { label: "% Gordura", value: latest?.body_fat_percentage, unit: "%", color: "text-orange-400", prev: previous?.body_fat_percentage, lowerBetter: true },
          { label: "Massa Magra", value: latest?.lean_mass, unit: "kg", color: "text-blue-400", prev: previous?.lean_mass, lowerBetter: false },
          { label: "Cintura", value: latest?.waist, unit: "cm", color: "text-warning", prev: previous?.waist, lowerBetter: true },
          { label: "TMB", value: latest?.bmr, unit: "kcal", color: "text-red-400", prev: previous?.bmr },
          { label: "GET", value: latest?.tdee, unit: "kcal", color: "text-success", prev: previous?.tdee },
        ].map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className={`text-xl font-display font-bold ${item.color}`}>
              {item.value ? (+item.value).toFixed(1) : "—"}{item.value ? item.unit : ""}
            </p>
            {item.prev && item.value && (
              <div className="flex justify-center mt-1">
                <DeltaBadge value={+item.value - +item.prev} unit={item.unit} lowerIsBetter={item.lowerBetter} />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* BMI Gauge */}
      {latest?.bmi && (
        <div className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" /> Índice de Massa Corporal (IMC)
          </h3>
          <div className="max-w-sm">
            <BMIGauge bmi={+latest.bmi} />
          </div>
        </div>
      )}

      {/* Goal progress */}
      {(latest?.goal_weight || latest?.goal_body_fat) && (
        <div className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Progresso em Direção às Metas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latest.goal_weight && latest.weight && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Peso atual → meta</span>
                  <span className="font-semibold">{(+latest.weight).toFixed(1)}kg <ArrowRight className="w-3 h-3 inline" /> {(+latest.goal_weight).toFixed(1)}kg</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  {(() => {
                    const first = assessments[0]?.weight ? +assessments[0].weight : +latest.weight;
                    const goal = +latest.goal_weight;
                    const curr = +latest.weight;
                    const totalChange = Math.abs(first - goal);
                    const achieved = Math.abs(first - curr);
                    const pct = totalChange > 0 ? Math.min(100, (achieved / totalChange) * 100) : 0;
                    return (
                      <>
                        <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
                      </>
                    );
                  })()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Faltam {Math.abs(+latest.weight - +latest.goal_weight).toFixed(1)}kg para a meta
                </p>
              </div>
            )}
            {latest.goal_body_fat && latest.body_fat_percentage && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gordura atual → meta</span>
                  <span className="font-semibold">{(+latest.body_fat_percentage).toFixed(1)}% <ArrowRight className="w-3 h-3 inline" /> {(+latest.goal_body_fat).toFixed(1)}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  {(() => {
                    const first = assessments[0]?.body_fat_percentage ? +assessments[0].body_fat_percentage : +latest.body_fat_percentage;
                    const goal = +latest.goal_body_fat;
                    const curr = +latest.body_fat_percentage;
                    const totalChange = Math.abs(first - goal);
                    const achieved = Math.abs(first - curr);
                    const pct = totalChange > 0 ? Math.min(100, (achieved / totalChange) * 100) : 0;
                    return <motion.div className="h-full rounded-full bg-orange-400" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />;
                  })()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Faltam {Math.abs(+latest.body_fat_percentage - +latest.goal_body_fat).toFixed(1)}% para a meta
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {assessments.length >= 2 && (
        <>
          {/* Weight evolution */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" /> Evolução do Peso
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="kg" />
                <Tooltip {...tooltipStyle} />
                {latest?.goal_weight && (
                  <ReferenceLine y={+latest.goal_weight} stroke="hsl(var(--success))" strokeDasharray="4 4" label={{ value: `Meta ${latest.goal_weight}kg`, fill: "hsl(var(--success))", fontSize: 10 }} />
                )}
                <Area type="monotone" dataKey="peso" stroke="hsl(var(--primary))" fill="url(#gWeight)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} name="Peso (kg)" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Body composition */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" /> Composição Corporal
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis yAxisId="fat" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                <YAxis yAxisId="lean" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="kg" />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {latest?.goal_body_fat && (
                  <ReferenceLine yAxisId="fat" y={+latest.goal_body_fat} stroke="#22c55e" strokeDasharray="4 4" label={{ value: `Meta ${latest.goal_body_fat}%`, fill: "#22c55e", fontSize: 10 }} />
                )}
                <Line yAxisId="fat" type="monotone" dataKey="gordura" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} name="% Gordura" connectNulls />
                <Line yAxisId="lean" type="monotone" dataKey="magra" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 4 }} name="Massa Magra (kg)" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Circumference evolution */}
          {chartData.some(d => d.cintura || d.quadril || d.bracoD) && (
            <div className="glass rounded-xl p-5">
              <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" /> Evolução das Circunferências (cm)
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="cm" />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="cintura" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Cintura" connectNulls />
                  <Line type="monotone" dataKey="quadril" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} name="Quadril" connectNulls />
                  <Line type="monotone" dataKey="bracoD" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} name="Braço D" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Energy chart */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-400" /> Gasto Energético
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gTmb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gGet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="kcal" />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="tmb" stroke="#f87171" fill="url(#gTmb)" strokeWidth={2} dot={{ r: 3 }} name="TMB (kcal)" connectNulls />
                <Area type="monotone" dataKey="get" stroke="#a78bfa" fill="url(#gGet)" strokeWidth={2} dot={{ r: 3 }} name="GET (kcal)" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Open full assessment button */}
      {!isPatientView && (
        <Button onClick={() => navigate(`/physical-assessment?patientId=${patientId}`)} className="gradient-primary gap-2 shadow-glow">
          <Activity className="w-4 h-4" /> Nova Avaliação / Ver Completa
        </Button>
      )}
    </div>
  );
}
