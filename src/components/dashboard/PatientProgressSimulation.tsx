import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Sparkles, Target, ArrowRight } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";

interface PatientSimulationData {
  id: string;
  name: string;
  currentWeight: number | null;
  adherence: number;
  streak: number;
  weeklyWeightChange?: number;
}

interface Props {
  patients: PatientSimulationData[];
  loading?: boolean;
}

const chartConfig: ChartConfig = {
  current: { label: "Projeção Atual", color: "hsl(var(--warning))" },
  improved: { label: "Projeção Otimizada", color: "hsl(var(--primary))" },
};

function generateProjection(
  weight: number,
  adherence: number,
  weeks: number
): { current: number[]; improved: number[] } {
  const currentRate = adherence >= 70 ? 0.4 : adherence >= 40 ? 0.2 : 0.05;
  const improvedRate = 0.5;

  const current: number[] = [weight];
  const improved: number[] = [weight];

  for (let w = 1; w <= weeks; w++) {
    current.push(
      Math.round((current[w - 1] - currentRate) * 10) / 10
    );
    improved.push(
      Math.round((improved[w - 1] - improvedRate) * 10) / 10
    );
  }

  return { current, improved };
}

function generateMotivation(adherence: number, currentLoss: number, improvedLoss: number): string {
  const diff = Math.round((improvedLoss - currentLoss) * 10) / 10;
  if (adherence >= 70) {
    return `Excelente! Com sua adesão atual de ${adherence}%, você está no caminho certo. Aumentando a consistência para 80%+, pode perder mais ${diff}kg nas próximas semanas.`;
  }
  if (adherence >= 40) {
    return `Sua adesão de ${adherence}% mostra progresso. Com mais consistência (80%+), você poderia perder ${diff}kg a mais. Pequenas mudanças fazem grande diferença! 💪`;
  }
  return `Sua adesão atual de ${adherence}% está baixa, mas nunca é tarde para recomeçar. Alcançando 80% de consistência, a diferença seria de ${diff}kg. Vamos juntos! 🚀`;
}

export default function PatientProgressSimulation({ patients, loading }: Props) {
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [projectionWeeks, setProjectionWeeks] = useState(8);

  const eligiblePatients = useMemo(
    () => patients.filter((p) => p.currentWeight && p.currentWeight > 0),
    [patients]
  );

  const activePatient = useMemo(() => {
    if (selectedPatient) return eligiblePatients.find((p) => p.id === selectedPatient);
    return eligiblePatients[0] || null;
  }, [selectedPatient, eligiblePatients]);

  const projection = useMemo(() => {
    if (!activePatient?.currentWeight) return null;
    return generateProjection(activePatient.currentWeight, activePatient.adherence, projectionWeeks);
  }, [activePatient, projectionWeeks]);

  const chartData = useMemo(() => {
    if (!projection) return [];
    return projection.current.map((val, i) => ({
      week: i === 0 ? "Atual" : `Sem ${i}`,
      current: val,
      improved: projection.improved[i],
    }));
  }, [projection]);

  const currentLoss = projection ? projection.current[0] - projection.current[projection.current.length - 1] : 0;
  const improvedLoss = projection ? projection.improved[0] - projection.improved[projection.improved.length - 1] : 0;

  const motivation = activePatient
    ? generateMotivation(activePatient.adherence, currentLoss, improvedLoss)
    : "";

  if (loading) {
    return (
      <div className="glass rounded-xl p-5">
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (eligiblePatients.length === 0) {
    return (
      <div className="glass rounded-xl p-5 text-center">
        <TrendingDown className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhum paciente com dados de peso para simulação.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-semibold">Simulação de Progresso</h2>
            <p className="text-xs text-muted-foreground">
              Projeção baseada na adesão atual vs otimizada
            </p>
          </div>
        </div>
        <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
          {[4, 8].map((w) => (
            <button
              key={w}
              onClick={() => setProjectionWeeks(w)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
                projectionWeeks === w
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {w} sem
            </button>
          ))}
        </div>
      </div>

      {/* Patient selector */}
      {eligiblePatients.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {eligiblePatients.slice(0, 8).map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPatient(p.id)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                (selectedPatient || eligiblePatients[0]?.id) === p.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* Projection summary cards */}
      {activePatient && projection && (
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-warning/10 border border-warning/20 p-4 text-center"
          >
            <p className="text-[10px] uppercase font-semibold text-warning tracking-wider mb-1">
              Projeção Atual
            </p>
            <p className="font-display text-lg font-bold">
              {projection.current[0]}kg{" "}
              <ArrowRight className="w-3 h-3 inline text-warning" />{" "}
              {projection.current[projection.current.length - 1]}kg
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              -{currentLoss.toFixed(1)}kg em {projectionWeeks} semanas
            </p>
            <p className="text-[10px] text-muted-foreground">
              Adesão: {activePatient.adherence}%
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center"
          >
            <p className="text-[10px] uppercase font-semibold text-primary tracking-wider mb-1">
              Projeção Otimizada
            </p>
            <p className="font-display text-lg font-bold">
              {projection.improved[0]}kg{" "}
              <ArrowRight className="w-3 h-3 inline text-primary" />{" "}
              {projection.improved[projection.improved.length - 1]}kg
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              -{improvedLoss.toFixed(1)}kg em {projectionWeeks} semanas
            </p>
            <p className="text-[10px] text-primary/70">Adesão: 80%+</p>
          </motion.div>
        </div>
      )}

      {/* Line chart */}
      {chartData.length > 0 && (
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="week" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
            <YAxis
              domain={["dataMin - 1", "dataMax + 1"]}
              tick={{ fontSize: 10 }}
              className="fill-muted-foreground"
              width={35}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="current"
              stroke="var(--color-current)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ r: 3 }}
              name="current"
            />
            <Line
              type="monotone"
              dataKey="improved"
              stroke="var(--color-improved)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              name="improved"
            />
          </LineChart>
        </ChartContainer>
      )}

      {/* AI Motivation */}
      {motivation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-gradient-to-r from-primary/5 via-card to-accent/5 border border-primary/15 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary mb-1">
                Copilot · Motivação Inteligente
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {motivation}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
