import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Droplets, Apple, Moon, Dumbbell } from "lucide-react";

interface MetabolicScoreProps {
  userId: string;
}

const CATEGORIES = [
  { key: "hydration", label: "Hidratação", icon: Droplets, color: "bg-blue-500" },
  { key: "nutrition", label: "Nutrição", icon: Apple, color: "bg-emerald-500" },
  { key: "exercise", label: "Exercício", icon: Dumbbell, color: "bg-orange-500" },
  { key: "sleep", label: "Sono", icon: Moon, color: "bg-indigo-500" },
];

export default function MetabolicScore({ userId }: MetabolicScoreProps) {
  const [score, setScore] = useState(0);
  const [categoryScores, setCategoryScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!userId) return;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    supabase
      .from("checklist_tasks")
      .select("category, completed")
      .eq("patient_id", userId)
      .gte("date", weekAgo.toISOString().split("T")[0])
      .then(({ data }) => {
        if (!data || data.length === 0) return;

        const grouped: Record<string, { total: number; done: number }> = {};
        for (const t of data) {
          const cat = t.category?.toLowerCase() || "other";
          if (!grouped[cat]) grouped[cat] = { total: 0, done: 0 };
          grouped[cat].total++;
          if (t.completed) grouped[cat].done++;
        }

        const scores: Record<string, number> = {};
        let totalScore = 0;
        let count = 0;
        for (const cat of CATEGORIES) {
          const g = grouped[cat.key];
          if (g && g.total > 0) {
            scores[cat.key] = Math.round((g.done / g.total) * 100);
          } else {
            scores[cat.key] = 0;
          }
          totalScore += scores[cat.key];
          count++;
        }

        setCategoryScores(scores);
        setScore(count > 0 ? Math.round(totalScore / count) : 0);
      });
  }, [userId]);

  const getScoreEmoji = () => {
    if (score >= 80) return "🔥";
    if (score >= 60) return "⚡";
    if (score >= 40) return "💪";
    return "🌱";
  };

  return (
    <div className="glass rounded-xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Score Metabólico</p>
            <p className="font-display font-bold text-lg leading-none">
              {score}<span className="text-sm font-normal text-muted-foreground">/100</span>
              <span className="ml-1">{getScoreEmoji()}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {CATEGORIES.map((cat) => {
          const catScore = categoryScores[cat.key] || 0;
          const Icon = cat.icon;
          return (
            <div key={cat.key} className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-[10px] text-muted-foreground w-16 truncate">{cat.label}</span>
              <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${catScore}%` }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className={`h-full rounded-full ${cat.color}`}
                />
              </div>
              <span className="text-[10px] font-semibold w-8 text-right">{catScore}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
