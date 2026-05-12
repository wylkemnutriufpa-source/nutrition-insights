import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import { TrendingDown, TrendingUp, Minus, Scale, Flame, Target, Award, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface EvolutionData {
  currentWeight: number | null;
  previousWeight: number | null;
  currentBf: number | null;
  previousBf: number | null;
  currentLean: number | null;
  previousLean: number | null;
  goalWeight: number | null;
  totalAssessments: number;
  firstWeight: number | null;
}

export default function PatientEvolutionSummary() {
  const { user } = useAuth();
  const [data, setData] = useState<EvolutionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("physical_assessments")
      .select("weight, body_fat_percentage, lean_mass, goal_weight, assessment_date")
      .eq("patient_id", user.id)
      .order("assessment_date", { ascending: false })
      .limit(50)
      .then(({ data: assessments }) => {
        if (!assessments || assessments.length === 0) {
          setLoading(false);
          return;
        }
        const latest = assessments[0];
        const prev = assessments.length > 1 ? assessments[1] : null;
        const first = assessments[assessments.length - 1];

        setData({
          currentWeight: latest.weight,
          previousWeight: prev?.weight ?? null,
          currentBf: latest.body_fat_percentage,
          previousBf: prev?.body_fat_percentage ?? null,
          currentLean: latest.lean_mass,
          previousLean: prev?.lean_mass ?? null,
          goalWeight: latest.goal_weight,
          totalAssessments: assessments.length,
          firstWeight: first.weight,
        });
        setLoading(false);
      });
  }, [user]);

  if (loading) return null;
  if (!data) return null;

  const weightDelta = data.currentWeight && data.previousWeight ? data.currentWeight - data.previousWeight : null;
  const bfDelta = data.currentBf && data.previousBf ? data.currentBf - data.previousBf : null;
  const leanDelta = data.currentLean && data.previousLean ? data.currentLean - data.previousLean : null;
  const totalLost = data.currentWeight && data.firstWeight ? data.firstWeight - data.currentWeight : null;

  // Goal progress
  const goalProgress =
    data.goalWeight && data.firstWeight && data.currentWeight
      ? Math.min(100, Math.max(0, ((data.firstWeight - data.currentWeight) / (data.firstWeight - data.goalWeight)) * 100))
      : null;

  const DeltaBadge = ({ value, unit, inverse }: { value: number | null; unit: string; inverse?: boolean }) => {
    if (value === null) return <span className="text-xs text-muted-foreground">—</span>;
    const isGood = inverse ? value < 0 : value > 0;
    const isNeutral = value === 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isNeutral ? "text-muted-foreground" : isGood ? "text-emerald-500" : "text-destructive"}`}>
        {isNeutral ? <Minus className="w-3 h-3" /> : value > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {value > 0 ? "+" : ""}{value.toFixed(1)}{unit}
      </span>
    );
  };

  const metrics = [
    {
      icon: Scale,
      label: "Peso",
      value: data.currentWeight ? `${data.currentWeight.toFixed(1)} kg` : "—",
      delta: weightDelta,
      unit: "kg",
      inverse: true, // losing weight is good
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: Flame,
      label: "Gordura",
      value: data.currentBf ? `${data.currentBf.toFixed(1)}%` : "—",
      delta: bfDelta,
      unit: "%",
      inverse: true,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      icon: Target,
      label: "Massa Magra",
      value: data.currentLean ? `${data.currentLean.toFixed(1)} kg` : "—",
      delta: leanDelta,
      unit: "kg",
      inverse: false, // gaining lean mass is good
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" /> Minha Evolução
        </h2>
        <Link to="/v1/journey" className="text-xs text-primary hover:underline flex items-center gap-1">
          Ver jornada <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <motion.div
            key={m.label}
            whileHover={{ y: -2 }}
            className="rounded-lg bg-card border border-border p-3 text-center"
          >
            <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center mx-auto mb-2`}>
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <p className="font-display font-bold text-lg leading-tight">{m.value}</p>
            <p className="text-[10px] text-muted-foreground mb-1">{m.label}</p>
            <DeltaBadge value={m.delta} unit={m.unit} inverse={m.inverse} />
          </motion.div>
        ))}
      </div>

      {/* Goal progress */}
      {goalProgress !== null && data.goalWeight && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Meta: {data.goalWeight.toFixed(0)} kg</span>
            <span className="font-semibold text-primary">{goalProgress.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${goalProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full gradient-primary rounded-full"
            />
          </div>
          {totalLost !== null && totalLost > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              🎉 Você já perdeu <span className="font-bold text-primary">{totalLost.toFixed(1)} kg</span> desde o início!
            </p>
          )}
        </div>
      )}

      {/* Motivational message */}
      {data.totalAssessments >= 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10"
        >
          <p className="text-sm">
            {weightDelta !== null && weightDelta < 0
              ? "💪 Ótimo progresso! Continue assim!"
              : leanDelta !== null && leanDelta > 0
              ? "🏋️ Sua massa magra está aumentando. Excelente!"
              : "🌟 Cada passo conta. Mantenha o foco!"}
          </p>
        </motion.div>
      )}
    </div>
  );
}
