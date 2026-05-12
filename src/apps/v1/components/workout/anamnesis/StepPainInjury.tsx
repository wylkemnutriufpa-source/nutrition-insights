import { motion, useReducedMotion } from "framer-motion";
import { Checkbox } from "@v1/components/ui/checkbox";
import { Slider } from "@v1/components/ui/slider";
import { Badge } from "@v1/components/ui/badge";
import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@v1/lib/utils";
import { OrbitalHeader, OrbitalTextInput } from "@v1/components/onboarding/OrbitalAnamnesisInputs";
import type { TrainerAnamnesisData } from "./types";
import { CONDITIONS_LIST } from "./types";

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

interface Props {
  data: TrainerAnamnesisData;
  onChange: (partial: Partial<TrainerAnamnesisData>) => void;
}

const PAIN_AREAS = [
  "Ombro", "Cotovelo", "Punho", "Cervical", "Lombar",
  "Quadril", "Joelho", "Tornozelo", "Pé", "Dorsal",
];

const MOVEMENT_OPTIONS = [
  "Agachamento profundo", "Overhead press", "Rotação de tronco",
  "Flexão de quadril", "Extensão lombar", "Supino", "Levantamento terra",
  "Corrida/impacto", "Abdução de ombro",
];

function OrbitalChipSelect({ items, selected, onToggle, activeColor = "primary" }: {
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
  activeColor?: "primary" | "destructive" | "amber";
}) {
  const colorMap = {
    primary: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30", shadow: "hsl(var(--primary) / 0.15)" },
    destructive: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30", shadow: "hsl(var(--destructive) / 0.12)" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", border: "border-amber-500/30", shadow: "hsl(45 100% 50% / 0.1)" },
  };
  const c = colorMap[activeColor];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => {
        const active = selected.includes(item);
        return (
          <motion.button
            key={item}
            onClick={() => onToggle(item)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.025, duration: 0.3, ease: EASE_PREMIUM }}
            className={cn(
              "relative px-3.5 py-2 rounded-full text-xs font-semibold transition-all border-2",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active
                ? `${c.bg} ${c.text} ${c.border}`
                : "bg-card/60 text-muted-foreground border-border hover:border-primary/30"
            )}
            style={active ? { boxShadow: `0 0 12px ${c.shadow}` } : {}}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {active && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex mr-1"
              >
                <Check className="w-3 h-3 inline" />
              </motion.span>
            )}
            {item}
          </motion.button>
        );
      })}
    </div>
  );
}

export default function StepPainInjury({ data, onChange }: Props) {
  const reduced = useReducedMotion();

  const toggleArray = (field: "specific_conditions" | "movements_to_avoid" | "movements_that_worsen", item: string) => {
    const current = data[field] as string[];
    onChange({ [field]: current.includes(item) ? current.filter(i => i !== item) : [...current, item] });
  };

  const addPain = (area: string) => {
    if (data.pain_locations.some(p => p.area === area)) {
      onChange({ pain_locations: data.pain_locations.filter(p => p.area !== area) });
    } else {
      onChange({ current_pain: true, pain_locations: [...data.pain_locations, { area, intensity: 5 }] });
    }
  };

  const updatePainIntensity = (area: string, intensity: number) => {
    onChange({ pain_locations: data.pain_locations.map(p => p.area === area ? { ...p, intensity } : p) });
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-5">
      <OrbitalHeader title="Dor, Lesões e Limitações" subtitle="Mapeie áreas de desconforto e restrições de movimento" />

      {/* Current Pain Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl border-2 border-border bg-card/60 flex items-center gap-3"
      >
        <Checkbox
          checked={data.current_pain}
          onCheckedChange={(c) => onChange({ current_pain: !!c, pain_locations: !c ? [] : data.pain_locations })}
        />
        <label className="text-sm font-semibold">Sente dor atualmente?</label>
      </motion.div>

      {data.current_pain && (
        <>
          {/* Pain map */}
          <div>
            <label className="text-sm font-semibold mb-3 block">📍 Onde sente dor?</label>
            <OrbitalChipSelect
              items={PAIN_AREAS}
              selected={data.pain_locations.map(p => p.area)}
              onToggle={addPain}
              activeColor="destructive"
            />
          </div>

          {/* Pain Intensities with orbital styling */}
          {data.pain_locations.length > 0 && (
            <div className="space-y-3">
              {data.pain_locations.map((p, i) => (
                <motion.div
                  key={p.area}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, ease: EASE_PREMIUM }}
                  className="rounded-2xl border-2 border-border bg-card/60 p-4"
                  style={{ boxShadow: p.intensity >= 7 ? "0 0 16px hsl(var(--destructive) / 0.12)" : "0 2px 8px hsl(0 0% 0% / 0.06)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className={cn("w-4 h-4", p.intensity >= 7 ? "text-destructive" : "text-amber-500")} />
                      {p.area}
                    </span>
                    <Badge variant={p.intensity >= 7 ? "destructive" : p.intensity >= 4 ? "secondary" : "outline"} className="text-xs font-bold">
                      {p.intensity}/10
                    </Badge>
                  </div>
                  <Slider value={[p.intensity]} onValueChange={([v]) => updatePainIntensity(p.area, v)} min={1} max={10} step={1} />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                    <span>Leve</span><span>Moderada</span><span>Intensa</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Conditions */}
      <div>
        <label className="text-sm font-semibold mb-3 block">🩺 Condições específicas</label>
        <OrbitalChipSelect items={CONDITIONS_LIST} selected={data.specific_conditions} onToggle={(c) => toggleArray("specific_conditions", c)} activeColor="amber" />
      </div>

      {/* Injuries & Surgeries with orbital text */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <OrbitalTextInput title="Lesões anteriores" value={data.injuries} onChange={(v) => onChange({ injuries: v })} placeholder="Descreva lesões..." />
        <OrbitalTextInput title="Cirurgias" value={data.surgeries} onChange={(v) => onChange({ surgeries: v })} placeholder="Descreva cirurgias..." />
      </div>

      {/* Movements */}
      <div>
        <label className="text-sm font-semibold mb-3 block">🚫 Movimentos que pioram a dor</label>
        <OrbitalChipSelect items={MOVEMENT_OPTIONS} selected={data.movements_that_worsen} onToggle={(m) => toggleArray("movements_that_worsen", m)} activeColor="destructive" />
      </div>

      <div>
        <label className="text-sm font-semibold mb-3 block">⛔ Movimentos a evitar</label>
        <OrbitalChipSelect items={MOVEMENT_OPTIONS} selected={data.movements_to_avoid} onToggle={(m) => toggleArray("movements_to_avoid", m)} activeColor="destructive" />
      </div>

      {/* Physio & Report */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="space-y-2">
        <div className="p-3.5 rounded-2xl border-2 border-border bg-card/60 flex items-center gap-3">
          <Checkbox checked={data.does_physiotherapy} onCheckedChange={c => onChange({ does_physiotherapy: !!c })} />
          <label className="text-sm font-medium">Faz fisioterapia ou reabilitação atualmente</label>
        </div>
        <div className="p-3.5 rounded-2xl border-2 border-border bg-card/60 flex items-center gap-3">
          <Checkbox checked={data.has_medical_report} onCheckedChange={c => onChange({ has_medical_report: !!c })} />
          <label className="text-sm font-medium">Possui laudo ou orientação médica</label>
        </div>
      </motion.div>
    </div>
  );
}
