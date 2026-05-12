import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@v1/lib/utils";
import {
  OrbitalHeader,
  OrbitalMultiSelect,
  OrbitalSlider,
  OrbitalTextInput,
} from "@v1/components/onboarding/OrbitalAnamnesisInputs";
import { RadialOrbitalSelector } from "@v1/components/ui/radial-orbital-selector";
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

      <RadialOrbitalSelector
        title="📍 Local de treino"
        options={[
          { id: "gym", label: "Academia", emoji: "🏋️", description: "Treino em academia com equipamentos completos" },
          { id: "home", label: "Casa", emoji: "🏠", description: "Treino em casa com equipamentos limitados ou peso corporal" },
          { id: "hybrid", label: "Híbrido", emoji: "🔄", description: "Alterna entre academia e casa conforme o dia" },
        ]}
        value={data.training_location}
        onChange={(v) => onChange({ training_location: v })}
        showConfirmButton={false}
      />

      <RadialOrbitalSelector
        title="🤝 Modalidade de acompanhamento"
        options={[
          { id: "presencial", label: "Presencial", emoji: "🤝", description: "Acompanhamento presencial direto com o personal" },
          { id: "online", label: "Online", emoji: "💻", description: "Treinos a distância com acompanhamento virtual" },
          { id: "hibrido", label: "Híbrido", emoji: "📱", description: "Sessões presenciais e online combinadas" },
        ]}
        value={data.training_modality}
        onChange={(v) => onChange({ training_modality: v })}
        showConfirmButton={false}
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

      <RadialOrbitalSelector
        title="😴 Qualidade do sono"
        options={[
          { id: "good", label: "Bom", emoji: "😴", description: "Dorme bem, acorda descansado e com energia" },
          { id: "regular", label: "Regular", emoji: "😐", description: "Sono irregular, nem sempre acorda disposto" },
          { id: "poor", label: "Ruim", emoji: "😵", description: "Dificuldade para dormir, insônia ou sono fragmentado" },
        ]}
        value={data.sleep_quality}
        onChange={(v) => onChange({ sleep_quality: v })}
        showConfirmButton={false}
      />

      <RadialOrbitalSelector
        title="⚡ Nível de energia"
        options={[
          { id: "high", label: "Alto", emoji: "⚡", description: "Energia constante ao longo do dia, pronto para treinar" },
          { id: "medium", label: "Médio", emoji: "🔋", description: "Energia ok, mas com quedas em alguns momentos do dia" },
          { id: "low", label: "Baixo", emoji: "🪫", description: "Cansaço frequente, falta de disposição para atividades" },
        ]}
        value={data.energy_level}
        onChange={(v) => onChange({ energy_level: v })}
        showConfirmButton={false}
      />
    </div>
  );
}
