import { motion, useReducedMotion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@v1/lib/utils";
import { OrbitalHeader } from "@v1/components/onboarding/OrbitalAnamnesisInputs";
import { RadialOrbitalSelector } from "@v1/components/ui/radial-orbital-selector";
import type { TrainerAnamnesisData } from "./types";
import { GOAL_OPTIONS } from "./types";

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

interface Props {
  data: TrainerAnamnesisData;
  onChange: (partial: Partial<TrainerAnamnesisData>) => void;
}

const GOAL_DESCRIPTIONS: Record<string, string> = {
  fat_loss: "Redução de gordura com treinos focados em gasto calórico e preservação muscular",
  hypertrophy: "Ganho de massa muscular com cargas progressivas e volume de treino",
  conditioning: "Melhora da capacidade cardiovascular e resistência física geral",
  mobility: "Amplitude de movimento, flexibilidade e prevenção de lesões",
  rehab: "Recuperação de lesões com exercícios terapêuticos e corretivos",
  performance: "Maximizar rendimento atlético com treinos especializados",
  posture: "Correção postural e fortalecimento de músculos estabilizadores",
  quality_of_life: "Bem-estar geral, disposição e saúde funcional no dia a dia",
};

export default function StepGoals({ data, onChange }: Props) {
  const reduced = useReducedMotion();

  const selectPrimary = (key: string) => {
    onChange({
      primary_goal: key,
      secondary_goals: data.secondary_goals.filter(g => g !== key),
    });
  };

  const toggleSecondary = (key: string) => {
    if (key === data.primary_goal) return;
    const list = data.secondary_goals;
    onChange({ secondary_goals: list.includes(key) ? list.filter(g => g !== key) : [...list, key] });
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <OrbitalHeader title="Objetivo do Treino" subtitle="Defina o foco principal e metas secundárias" />

      {/* Primary goal — RadialOrbitalSelector */}
      <div>
        <label className="text-sm font-semibold mb-3 block text-center">🎯 Objetivo Principal</label>
        <RadialOrbitalSelector
          title=""
          options={GOAL_OPTIONS.map(g => ({
            id: g.key,
            label: g.label,
            emoji: g.icon,
            description: GOAL_DESCRIPTIONS[g.key] || "",
          }))}
          value={data.primary_goal}
          onChange={selectPrimary}
          showConfirmButton={false}
        />
      </div>

      {/* Secondary goals — orbital chips */}
      {data.primary_goal && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <label className="text-sm font-semibold">Objetivos Secundários <span className="font-normal text-muted-foreground">(opcional)</span></label>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {GOAL_OPTIONS.filter(g => g.key !== data.primary_goal).map((g, i) => {
              const isActive = data.secondary_goals.includes(g.key);
              return (
                <motion.button
                  key={g.key}
                  onClick={() => toggleSecondary(g.key)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.3, ease: EASE_PREMIUM }}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 border-2",
                    isActive
                      ? "bg-accent/80 text-accent-foreground border-primary/20"
                      : "bg-card/60 text-muted-foreground border-border hover:border-primary/30"
                  )}
                  style={isActive ? { boxShadow: "0 0 12px hsl(var(--primary) / 0.12)" } : {}}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isActive && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <Check className="w-3 h-3" />
                    </motion.span>
                  )}
                  {g.icon} {g.label}
                </motion.button>
              );
            })}
          </div>

          {data.secondary_goals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center justify-center gap-2 mt-3"
            >
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">{data.secondary_goals.length} secundário{data.secondary_goals.length !== 1 ? "s" : ""}</span>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
