import { motion, useReducedMotion } from "framer-motion";
import { Checkbox } from "@v1/components/ui/checkbox";
import { Check } from "lucide-react";
import { cn } from "@v1/lib/utils";
import { OrbitalHeader, OrbitalTextInput } from "@v1/components/onboarding/OrbitalAnamnesisInputs";
import { RadialOrbitalSelector } from "@v1/components/ui/radial-orbital-selector";
import type { TrainerAnamnesisData } from "./types";

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

interface Props {
  data: TrainerAnamnesisData;
  onChange: (partial: Partial<TrainerAnamnesisData>) => void;
}

export default function StepCoachingStyle({ data, onChange }: Props) {
  const reduced = useReducedMotion();

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <OrbitalHeader title="Estilo de Acompanhamento" subtitle="Como você prefere ser acompanhado?" />

      <RadialOrbitalSelector
        title="🎯 Estilo de cobrança preferido"
        options={[
          { id: "gentle", label: "Suave", emoji: "🌸", description: "Acompanhamento leve, sem pressão, respeitando seu ritmo" },
          { id: "moderate", label: "Moderado", emoji: "💬", description: "Equilíbrio entre incentivo e cobrança, com metas realistas" },
          { id: "firm", label: "Firme", emoji: "🔥", description: "Cobrança direta e objetiva para máxima performance" },
        ]}
        value={data.coaching_intensity}
        onChange={(v) => onChange({ coaching_intensity: v })}
        showConfirmButton={false}
      />

      <RadialOrbitalSelector
        title="📋 Preferência de plano"
        options={[
          { id: "rigid", label: "Rígido", emoji: "📋", description: "Plano fixo e estruturado, seguir exatamente como prescrito" },
          { id: "flexible", label: "Flexível", emoji: "🔄", description: "Plano adaptável, com opções de troca e ajustes conforme o dia" },
        ]}
        value={data.plan_flexibility}
        onChange={(v) => onChange({ plan_flexibility: v })}
        showConfirmButton={false}
      />

      {/* Toggle preferences with orbital styling */}
      <div className="space-y-2.5">
        {[
          { key: "wants_reminders" as const, label: "Receber lembretes de treino", desc: "Notificações antes e após o horário programado", emoji: "🔔" },
          { key: "wants_video_tutorials" as const, label: "Vídeos tutoriais nos exercícios", desc: "Ver demonstrações durante o treino", emoji: "🎬" },
          { key: "wants_post_workout_feedback" as const, label: "Feedback pós-treino", desc: "Registrar esforço e sensações após cada treino", emoji: "📊" },
        ].map((item, i) => {
          const active = data[item.key];
          return (
            <motion.button
              key={item.key}
              onClick={() => onChange({ [item.key]: !active })}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35, ease: EASE_PREMIUM }}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all border-2",
                active
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card/60 hover:border-primary/20"
              )}
              style={active ? { boxShadow: "0 0 16px hsl(var(--primary) / 0.1)" } : { boxShadow: "0 2px 6px hsl(0 0% 0% / 0.06)" }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-xl shrink-0">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className={cn("text-sm font-semibold", active ? "text-primary" : "text-foreground")}>{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
              <div className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all",
                active ? "bg-primary border-primary" : "border-border bg-card"
              )}>
                {active && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
              </div>
            </motion.button>
          );
        })}
      </div>

      <OrbitalTextInput
        title="Observações gerais"
        subtitle="Algo mais que o personal deve saber?"
        value={data.notes}
        onChange={(v) => onChange({ notes: v })}
        placeholder="Informações adicionais que o personal deve saber..."
      />
    </div>
  );
}
