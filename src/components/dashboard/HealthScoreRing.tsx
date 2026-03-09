import { motion } from "framer-motion";

interface HealthScoreProps {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

function getScoreConfig(score: number) {
  if (score >= 75) return { color: "text-success", bg: "bg-success/10", ring: "stroke-success", label: "Ótimo", emoji: "🟢" };
  if (score >= 50) return { color: "text-warning", bg: "bg-warning/10", ring: "stroke-warning", label: "Médio", emoji: "🟡" };
  return { color: "text-destructive", bg: "bg-destructive/10", ring: "stroke-destructive", label: "Baixo", emoji: "🔴" };
}

export default function HealthScoreRing({ score, label, size = "md" }: HealthScoreProps) {
  const config = getScoreConfig(score);
  const sizes = {
    sm: { w: 48, stroke: 4, text: "text-sm", r: 18 },
    md: { w: 72, stroke: 5, text: "text-xl", r: 28 },
    lg: { w: 96, stroke: 6, text: "text-3xl", r: 38 },
  };
  const s = sizes[size];
  const circumference = 2 * Math.PI * s.r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: s.w, height: s.w }}>
        <svg width={s.w} height={s.w} className="-rotate-90">
          <circle
            cx={s.w / 2}
            cy={s.w / 2}
            r={s.r}
            fill="none"
            strokeWidth={s.stroke}
            className="stroke-muted/30"
          />
          <motion.circle
            cx={s.w / 2}
            cy={s.w / 2}
            r={s.r}
            fill="none"
            strokeWidth={s.stroke}
            strokeLinecap="round"
            className={config.ring}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center font-display font-bold ${s.text} ${config.color}`}>
          {score}
        </div>
      </div>
      {label && <p className="text-xs text-muted-foreground font-medium">{label}</p>}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${config.bg} ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}

// Utility function to calculate patient health score
export function calculateHealthScore(data: {
  hasAnamnesis: boolean;
  checklistCompletion: number; // 0-100
  mealsLogged: number; // last 7 days
  weightEntries: number; // total assessments
  currentStreak: number;
  daysAsPatient: number;
}): number {
  let score = 0;
  
  // Anamnesis completed (20 points)
  if (data.hasAnamnesis) score += 20;
  
  // Checklist adherence (25 points)
  score += (data.checklistCompletion / 100) * 25;
  
  // Meal logging consistency (20 points) - expect ~3/day * 7 = 21
  const mealRatio = Math.min(data.mealsLogged / 14, 1);
  score += mealRatio * 20;
  
  // Weight/assessment tracking (15 points)
  const assessmentScore = Math.min(data.weightEntries / 3, 1);
  score += assessmentScore * 15;
  
  // Streak consistency (20 points)
  const streakScore = Math.min(data.currentStreak / 7, 1);
  score += streakScore * 20;
  
  return Math.round(Math.min(score, 100));
}
