import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import {
  OrbitalHeader,
  OrbitalNumberInput,
  OrbitalTextInput,
} from "@/components/onboarding/OrbitalAnamnesisInputs";
import { RadialOrbitalSelector } from "@/components/ui/radial-orbital-selector";
import type { TrainerAnamnesisData } from "./types";
import { MODALITIES } from "./types";

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

interface Props {
  data: TrainerAnamnesisData;
  onChange: (partial: Partial<TrainerAnamnesisData>) => void;
}

export default function StepTrainingHistory({ data, onChange }: Props) {
  const toggleModality = (m: string) => {
    const list = data.modalities_practiced;
    onChange({ modalities_practiced: list.includes(m) ? list.filter(i => i !== m) : [...list, m] });
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <OrbitalHeader title="Histórico de Treino" subtitle="Conte sobre sua experiência com exercícios" />

      {/* Has trained toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl border-2 border-border bg-card/60 flex items-center gap-3"
      >
        <Checkbox checked={data.has_trained_before} onCheckedChange={c => onChange({ has_trained_before: !!c })} />
        <label className="text-sm font-semibold">Já treinou antes?</label>
      </motion.div>

      {data.has_trained_before && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <OrbitalNumberInput
              title="Anos de treino"
              value={data.training_years?.toString() ?? ""}
              onChange={(v) => onChange({ training_years: v ? parseInt(v) : null })}
              placeholder="0"
              min={0}
              max={50}
              unit="anos"
            />
            <OrbitalNumberInput
              title="Frequência anterior"
              value={data.previous_frequency?.toString() ?? ""}
              onChange={(v) => onChange({ previous_frequency: v ? parseInt(v) : null })}
              placeholder="0"
              min={1}
              max={7}
              unit="x/sem"
            />
          </div>

          <OrbitalTextInput
            title="Último período de treino"
            value={data.last_training_period}
            onChange={(v) => onChange({ last_training_period: v })}
            placeholder="Ex: Jan-Mar 2025, há 6 meses..."
          />

          <RadialOrbitalSelector
            title="Nível percebido"
            subtitle="Como você se classifica?"
            options={[
              { id: "beginner", label: "Iniciante", emoji: "🌱", description: "Pouca ou nenhuma experiência com treinos estruturados" },
              { id: "intermediate", label: "Intermediário", emoji: "🔥", description: "Já treina há algum tempo com certa regularidade e técnica" },
              { id: "advanced", label: "Avançado", emoji: "💎", description: "Experiência sólida, boa técnica e consciência corporal" },
            ]}
            value={data.perceived_level}
            onChange={(v) => onChange({ perceived_level: v })}
            showConfirmButton={false}
          />

          {/* Modalities with orbital chips */}
          <div>
            <label className="text-sm font-semibold mb-3 block text-center">🏋️ Modalidades praticadas</label>
            <div className="flex flex-wrap gap-2 justify-center">
              {MODALITIES.map((m, i) => {
                const active = data.modalities_practiced.includes(m);
                return (
                  <motion.button
                    key={m}
                    onClick={() => toggleModality(m)}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.025, duration: 0.3, ease: EASE_PREMIUM }}
                    className={cn(
                      "relative px-3.5 py-2 rounded-full text-xs font-semibold transition-all border-2",
                      active
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-card/60 text-muted-foreground border-border hover:border-primary/30"
                    )}
                    style={active ? { boxShadow: "0 0 12px hsl(var(--primary) / 0.15)" } : {}}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {active && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex mr-1">
                        <Check className="w-3 h-3 inline" />
                      </motion.span>
                    )}
                    {m}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <OrbitalTextInput
        title="Exercícios que gosta"
        value={data.liked_exercises}
        onChange={(v) => onChange({ liked_exercises: v })}
        placeholder="Ex: supino, agachamento, corrida..."
      />

      <OrbitalTextInput
        title="Exercícios que não gosta"
        value={data.disliked_exercises}
        onChange={(v) => onChange({ disliked_exercises: v })}
        placeholder="Ex: burpee, prancha, abdominais..."
      />

      <OrbitalTextInput
        title="Principais dificuldades com treino"
        value={data.training_difficulties}
        onChange={(v) => onChange({ training_difficulties: v })}
        placeholder="Falta de motivação, não saber executar, dor, falta de tempo..."
      />
    </div>
  );
}
