import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { TrendingDown, TrendingUp, Minus, Scale, Target, Flag } from "lucide-react";

interface BodyEvolutionTimelineProps {
  userId: string;
}

interface WeightEntry {
  weight: number;
  date: string;
}

export default function BodyEvolutionTimeline({ userId }: BodyEvolutionTimelineProps) {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;

    Promise.all([
      supabase
        .from("patient_checkins")
        .select("weight, created_at")
        .eq("patient_id", userId)
        .not("weight", "is", null)
        .order("created_at", { ascending: true })
        .limit(20),
      supabase
        .from("patient_anamnesis")
        .select("answers")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1),
    ]).then(([checkinsRes, anamRes]) => {
      const raw = (checkinsRes.data || []).map((c: any) => ({
        weight: c.weight,
        date: c.created_at,
      }));
      setEntries(raw);

      const answers = anamRes.data?.[0]?.answers as any;
      if (answers?.target_weight) {
        setTargetWeight(Number(answers.target_weight));
      }
    });
  }, [userId]);

  if (entries.length === 0) {
    return (
      <div className="glass rounded-xl p-4 shadow-card">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Scale className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">Evolução Corporal</p>
        </div>
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhum registro de peso ainda. Faça seu primeiro check-in!
        </p>
      </div>
    );
  }

  const firstWeight = entries[0].weight;
  const lastWeight = entries[entries.length - 1].weight;
  const totalChange = lastWeight - firstWeight;
  const progressToTarget = targetWeight
    ? Math.min(100, Math.max(0, Math.round(((firstWeight - lastWeight) / (firstWeight - targetWeight)) * 100)))
    : null;

  // Normalize for visual bar
  const allWeights = entries.map((e) => e.weight);
  const minW = Math.min(...allWeights) - 1;
  const maxW = Math.max(...allWeights) + 1;
  const range = maxW - minW || 1;

  return (
    <div className="glass rounded-xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Scale className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Evolução Corporal</p>
            <div className="flex items-center gap-1">
              <span className="font-display font-bold text-lg">{lastWeight}kg</span>
              <span className={`text-xs font-semibold flex items-center gap-0.5 ${
                totalChange < 0 ? "text-success" : totalChange > 0 ? "text-destructive" : "text-muted-foreground"
              }`}>
                {totalChange < 0 ? <TrendingDown className="w-3 h-3" /> : totalChange > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                {totalChange > 0 ? "+" : ""}{totalChange.toFixed(1)}kg
              </span>
            </div>
          </div>
        </div>
        {targetWeight && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Meta</p>
            <p className="text-sm font-semibold flex items-center gap-1">
              <Target className="w-3 h-3 text-primary" /> {targetWeight}kg
            </p>
          </div>
        )}
      </div>

      {/* Weight chart mini */}
      <div className="flex items-end gap-1 h-12 mb-2">
        {entries.map((e, i) => {
          const height = ((e.weight - minW) / range) * 100;
          const isLast = i === entries.length - 1;
          return (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className={`flex-1 rounded-t-sm ${isLast ? "bg-primary" : "bg-primary/30"}`}
              title={`${e.weight}kg - ${new Date(e.date).toLocaleDateString("pt-BR")}`}
            />
          );
        })}
      </div>

      {/* Progress to target */}
      {progressToTarget !== null && (
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{firstWeight}kg</span>
            <span className="font-semibold text-primary">{progressToTarget}% para a meta</span>
            <span>{targetWeight}kg</span>
          </div>
          <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressToTarget}%` }}
              transition={{ duration: 1 }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-success"
            />
          </div>
        </div>
      )}

      {/* Milestones */}
      <div className="flex gap-2 mt-3">
        {entries.length >= 3 && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-success/10 text-success">
            ✓ 3+ registros
          </span>
        )}
        {Math.abs(totalChange) >= 2 && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            🎯 {Math.abs(totalChange).toFixed(1)}kg evolução
          </span>
        )}
        {progressToTarget !== null && progressToTarget >= 50 && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-warning/10 text-warning">
            🏆 Metade do caminho!
          </span>
        )}
      </div>
    </div>
  );
}
