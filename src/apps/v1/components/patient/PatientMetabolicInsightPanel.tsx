import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Activity, Droplets, Apple, Moon, TrendingUp, Shield, Zap } from "lucide-react";
import { safeNum } from "@/lib/formatMacros";

interface MetabolicData {
  score: number;
  hydration: number;
  nutrition: number;
  sleep: number;
  consistency: number;
  weightTrend: number;
  flagsCount: number;
}

function getClassification(score: number) {
  if (score >= 71) return { label: "Zona Terapêutica Ideal", color: "text-success", ring: "stroke-success", bg: "from-success/10 to-success/5", emoji: "🟢", message: "Excelente! Seu metabolismo está respondendo bem ao protocolo." };
  if (score >= 41) return { label: "Adaptação Metabólica", color: "text-warning", ring: "stroke-warning", bg: "from-warning/10 to-warning/5", emoji: "🟡", message: "Seu corpo está se adaptando. Mantenha a consistência." };
  return { label: "Risco Metabólico", color: "text-destructive", ring: "stroke-destructive", bg: "from-destructive/10 to-destructive/5", emoji: "🔴", message: "Atenção: sinais de estresse metabólico detectados. Foco na adesão." };
}

const SUGGESTIONS = [
  "Priorize hidratação antes das refeições principais",
  "Mantenha consistência nos horários das refeições",
  "Registre seu check-in diário para análise mais precisa",
  "Prefira alimentos integrais no café da manhã",
  "Durma ao menos 7h para otimizar resposta metabólica",
  "Aumente a ingestão de fibras para estabilidade glicêmica",
];

export default function PatientMetabolicInsightPanel() {
  const { user } = useAuth();
  const [data, setData] = useState<MetabolicData | null>(null);

  useEffect(() => {
    if (!user) return;
    computeScore(user.id).then(setData);
  }, [user]);

  if (!data) return null;

  const classification = getClassification(safeNum(data?.score));
  const dailySuggestion = SUGGESTIONS[new Date().getDate() % SUGGESTIONS.length];

  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (data.score / 100) * circumference;

  const categories = [
    { label: "Hidratação", value: safeNum(data?.hydration), icon: Droplets, color: "text-info" },
    { label: "Nutrição", value: safeNum(data?.nutrition), icon: Apple, color: "text-success" },
    { label: "Sono", value: safeNum(data?.sleep), icon: Moon, color: "text-accent" },
    { label: "Consistência", value: safeNum(data?.consistency), icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-premium rounded-2xl overflow-hidden shimmer-sweep"
    >
      <div className={`p-5 bg-gradient-to-br ${classification.bg}`}>
        <div className="flex items-center gap-4">
          {/* Gauge */}
          <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
            <svg width={96} height={96} className="-rotate-90">
              <circle cx={48} cy={48} r={42} fill="none" strokeWidth={5} className="stroke-muted/20" />
              <motion.circle
                cx={48} cy={48} r={42} fill="none" strokeWidth={5} strokeLinecap="round"
                className={classification.ring}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div className={`absolute inset-0 flex flex-col items-center justify-center`}>
              <span className={`font-display font-bold text-2xl ${classification.color}`}>{data.score}</span>
              <span className="text-[9px] text-muted-foreground font-medium">SCORE</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Activity className={`w-4 h-4 ${classification.color}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${classification.color}`}>
                {classification.label}
              </span>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{classification.message}</p>
          </div>
        </div>

        {/* Category bars */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.label} className="flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 ${cat.color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground">{cat.label}</span>
                    <span className="text-[10px] font-bold">{cat.value}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-current"
                      style={{ color: `hsl(var(--primary))` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.value}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Daily suggestion */}
        <div className="mt-4 p-3 rounded-xl bg-background/50 backdrop-blur-sm border border-border/30">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Sugestão Clínica do Dia</p>
              <p className="text-xs text-foreground/80">{dailySuggestion}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Score computation (client-side, deterministic) ───
async function computeScore(userId: string): Promise<MetabolicData> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStr = weekAgo.toISOString().split("T")[0];

  const [checkRes, flagsRes, weightRes] = await Promise.all([
    supabase.from("checklist_tasks").select("category, completed").eq("patient_id", userId).gte("date", weekStr),
    supabase.from("patient_clinical_flags").select("id").eq("patient_id", userId).eq("is_active", true),
    supabase.from("physical_assessments").select("weight, assessment_date").eq("patient_id", userId).order("assessment_date", { ascending: false }).limit(2),
  ]);

  const tasks = checkRes.data || [];
  const flagsCount = flagsRes.data?.length || 0;

  // Category scores
  function catScore(key: string) {
    const catTasks = tasks.filter(t => (t.category || "").toLowerCase() === key);
    if (catTasks.length === 0) return 50; // neutral if no data
    const done = catTasks.filter(t => t.completed).length;
    return Math.round((done / catTasks.length) * 100);
  }

  const hydration = catScore("hydration");
  const nutrition = catScore("nutrition");
  const sleep = catScore("sleep");
  const exercise = catScore("exercise");

  // Consistency: overall completion rate
  const totalTasks = tasks.length;
  const totalDone = tasks.filter(t => t.completed).length;
  const consistency = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 50;

  // Weight trend (0-100, 50=neutral)
  const weights = weightRes.data || [];
  let weightTrend = 50;
  if (weights.length >= 2) {
    const diff = (weights[0].weight || 0) - (weights[1].weight || 0);
    weightTrend = diff < -0.5 ? 80 : diff > 0.5 ? 30 : 50;
  }

  // Composite score
  const raw = (
    hydration * 0.15 +
    nutrition * 0.25 +
    sleep * 0.15 +
    consistency * 0.25 +
    weightTrend * 0.10 +
    Math.max(0, 100 - flagsCount * 15) * 0.10
  );

  const score = Math.min(100, Math.max(0, Math.round(raw)));

  return { score, hydration, nutrition, sleep, consistency, weightTrend, flagsCount };
}
