import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OrbitalHeader,
  OrbitalSingleSelect,
  OrbitalMultiSelect,
  OrbitalSlider,
  OrbitalTextInput,
} from "@/components/onboarding/OrbitalAnamnesisInputs";
import type { TrainerAnamnesisData } from "./types";
import { EQUIPMENT_OPTIONS, HOURS_OPTIONS } from "./types";

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

interface Props {
  data: TrainerAnamnesisData;
  onChange: (partial: Partial<TrainerAnamnesisData>) => void;
}

export default function StepAvailability({ data, onChange }: Props) {
  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <OrbitalHeader title="Disponibilidade e Estrutura" subtitle="Configure seu tempo, local e equipamentos" />

      <OrbitalSlider
        title="Dias por semana"
        subtitle="Quantos dias consegue treinar?"
        value={data.weekly_availability}
        onChange={(v) => onChange({ weekly_availability: v })}
        min={1}
        max={7}
        step={1}
        unit="dias"
      />

      <OrbitalSlider
        title="Duração da sessão"
        subtitle="Tempo disponível por treino"
        value={data.session_duration}
        onChange={(v) => onChange({ session_duration: v })}
        min={30}
        max={120}
        step={15}
        unit="min"
      />

      {/* Available hours as orbital multi-select */}
      <OrbitalMultiSelect
        title="⏰ Horários disponíveis"
        subtitle="Selecione os períodos que pode treinar"
        options={HOURS_OPTIONS.map(h => ({ label: h, emoji: "🕐", value: h }))}
        value={data.available_hours}
        onChange={(v) => onChange({ available_hours: v })}
      />

      <OrbitalSingleSelect
        title="📍 Local de treino"
        options={[
          { value: "gym", label: "Academia", emoji: "🏋️" },
          { value: "home", label: "Casa", emoji: "🏠" },
          { value: "hybrid", label: "Híbrido", emoji: "🔄" },
        ]}
        value={data.training_location}
        onChange={(v) => onChange({ training_location: v })}
      />

      <OrbitalSingleSelect
        title="🤝 Modalidade de acompanhamento"
        options={[
          { value: "presencial", label: "Presencial", emoji: "🤝" },
          { value: "online", label: "Online", emoji: "💻" },
          { value: "hibrido", label: "Híbrido", emoji: "📱" },
        ]}
        value={data.training_modality}
        onChange={(v) => onChange({ training_modality: v })}
      />

      {/* Equipment as orbital chips */}
      <div>
        <label className="text-sm font-semibold mb-3 block text-center">🏋️ Equipamentos disponíveis</label>
        <div className="flex flex-wrap gap-2 justify-center">
          {EQUIPMENT_OPTIONS.map((e, i) => {
            const active = data.available_equipment.includes(e);
            return (
              <motion.button
                key={e}
                onClick={() => {
                  const current = data.available_equipment;
                  onChange({ available_equipment: current.includes(e) ? current.filter(x => x !== e) : [...current, e] });
                }}
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
                {e}
              </motion.button>
            );
          })}
        </div>
      </div>

      <OrbitalTextInput
        title="Rotina de trabalho"
        value={data.work_routine}
        onChange={(v) => onChange({ work_routine: v })}
        placeholder="Ex: CLT 8-18h, home office, flexível..."
      />

      <OrbitalSingleSelect
        title="😴 Qualidade do sono"
        options={[
          { value: "good", label: "Bom", emoji: "😴" },
          { value: "regular", label: "Regular", emoji: "😐" },
          { value: "poor", label: "Ruim", emoji: "😵" },
        ]}
        value={data.sleep_quality}
        onChange={(v) => onChange({ sleep_quality: v })}
      />

      <OrbitalSingleSelect
        title="⚡ Nível de energia"
        options={[
          { value: "high", label: "Alto", emoji: "⚡" },
          { value: "medium", label: "Médio", emoji: "🔋" },
          { value: "low", label: "Baixo", emoji: "🪫" },
        ]}
        value={data.energy_level}
        onChange={(v) => onChange({ energy_level: v })}
      />
    </div>
  );
}
