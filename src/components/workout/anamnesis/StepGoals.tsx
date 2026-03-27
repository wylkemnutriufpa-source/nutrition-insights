import { motion, useReducedMotion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrbitalHeader } from "@/components/onboarding/OrbitalAnamnesisInputs";
import type { TrainerAnamnesisData } from "./types";
import { GOAL_OPTIONS } from "./types";

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

interface Props {
  data: TrainerAnamnesisData;
  onChange: (partial: Partial<TrainerAnamnesisData>) => void;
}

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

      {/* Primary goal — orbital grid */}
      <div>
        <label className="text-sm font-semibold mb-3 block text-center">🎯 Objetivo Principal</label>
        <div className="grid grid-cols-2 gap-3">
          {GOAL_OPTIONS.map((g, i) => {
            const isActive = data.primary_goal === g.key;
            return (
              <motion.button
                key={g.key}
                onClick={() => selectPrimary(g.key)}
                initial={{ opacity: 0, y: 16 }}
                animate={{
                  opacity: isActive ? 1 : data.primary_goal ? 0.65 : 1,
                  y: 0,
                  scale: isActive ? 1.02 : data.primary_goal ? 0.97 : 1,
                }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: EASE_PREMIUM }}
                whileHover={{ scale: isActive ? 1.04 : 1.03 }}
                whileTap={{ scale: 0.96 }}
                className={cn(
                  "relative flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card/60 hover:border-primary/40 hover:bg-card/80"
                )}
                style={isActive ? {
                  boxShadow: "0 0 24px hsl(var(--primary) / 0.2), 0 4px 16px hsl(0 0% 0% / 0.15)",
                } : { boxShadow: "0 2px 8px hsl(0 0% 0% / 0.08)" }}
              >
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
                  >
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </motion.div>
                )}

                {isActive && !reduced && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ border: "1px solid hsl(var(--primary) / 0.3)" }}
                    animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}

                <span className="text-3xl">{g.icon}</span>
                <span className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-foreground/80")}>{g.label}</span>
                {isActive && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] font-bold text-primary">
                    PRINCIPAL
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
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
