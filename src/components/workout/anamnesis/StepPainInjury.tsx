import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import type { TrainerAnamnesisData, PainLocation } from "./types";
import { CONDITIONS_LIST } from "./types";

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

export default function StepPainInjury({ data, onChange }: Props) {
  const toggleArray = (field: "specific_conditions" | "movements_to_avoid" | "movements_that_worsen", item: string) => {
    const current = data[field] as string[];
    onChange({
      [field]: current.includes(item) ? current.filter(i => i !== item) : [...current, item],
    });
  };

  const addPain = (area: string) => {
    if (data.pain_locations.some(p => p.area === area)) {
      onChange({ pain_locations: data.pain_locations.filter(p => p.area !== area) });
    } else {
      onChange({
        current_pain: true,
        pain_locations: [...data.pain_locations, { area, intensity: 5 }],
      });
    }
  };

  const updatePainIntensity = (area: string, intensity: number) => {
    onChange({
      pain_locations: data.pain_locations.map(p =>
        p.area === area ? { ...p, intensity } : p
      ),
    });
  };

  return (
    <div className="space-y-5">
      {/* Current Pain Toggle */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={data.current_pain}
          onCheckedChange={(c) => onChange({ current_pain: !!c, pain_locations: !c ? [] : data.pain_locations })}
        />
        <label className="text-sm font-medium">Sente dor atualmente?</label>
      </div>

      {data.current_pain && (
        <>
          {/* Pain Areas */}
          <div>
            <label className="text-sm font-medium mb-2 block">Onde sente dor?</label>
            <div className="flex flex-wrap gap-1.5">
              {PAIN_AREAS.map(area => {
                const active = data.pain_locations.some(p => p.area === area);
                return (
                  <button
                    key={area}
                    onClick={() => addPain(area)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      active
                        ? "bg-destructive/15 text-destructive border border-destructive/30"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {area}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pain Intensities */}
          {data.pain_locations.length > 0 && (
            <div className="space-y-3">
              {data.pain_locations.map(p => (
                <div key={p.area} className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      {p.area}
                    </span>
                    <Badge variant={p.intensity >= 7 ? "destructive" : p.intensity >= 4 ? "secondary" : "outline"} className="text-xs">
                      {p.intensity}/10
                    </Badge>
                  </div>
                  <Slider
                    value={[p.intensity]}
                    onValueChange={([v]) => updatePainIntensity(p.area, v)}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>Leve</span><span>Moderada</span><span>Intensa</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Conditions */}
      <div>
        <label className="text-sm font-medium mb-2 block">Condições específicas</label>
        <div className="flex flex-wrap gap-1.5">
          {CONDITIONS_LIST.map(c => (
            <button
              key={c}
              onClick={() => toggleArray("specific_conditions", c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                data.specific_conditions.includes(c)
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Injuries & Surgeries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Lesões anteriores</label>
          <Textarea value={data.injuries} onChange={(e) => onChange({ injuries: e.target.value })} placeholder="Descreva lesões..." rows={2} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Cirurgias</label>
          <Textarea value={data.surgeries} onChange={(e) => onChange({ surgeries: e.target.value })} placeholder="Descreva cirurgias..." rows={2} />
        </div>
      </div>

      {/* Movements */}
      <div>
        <label className="text-sm font-medium mb-2 block">Movimentos que pioram a dor</label>
        <div className="flex flex-wrap gap-1.5">
          {MOVEMENT_OPTIONS.map(m => (
            <button
              key={m}
              onClick={() => toggleArray("movements_that_worsen", m)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                data.movements_that_worsen.includes(m)
                  ? "bg-destructive/15 text-destructive border border-destructive/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Movimentos a evitar</label>
        <div className="flex flex-wrap gap-1.5">
          {MOVEMENT_OPTIONS.map(m => (
            <button
              key={m}
              onClick={() => toggleArray("movements_to_avoid", m)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                data.movements_to_avoid.includes(m)
                  ? "bg-destructive/15 text-destructive border border-destructive/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Physio & Report */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Checkbox checked={data.does_physiotherapy} onCheckedChange={c => onChange({ does_physiotherapy: !!c })} />
          <label className="text-sm">Faz fisioterapia ou reabilitação atualmente</label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox checked={data.has_medical_report} onCheckedChange={c => onChange({ has_medical_report: !!c })} />
          <label className="text-sm">Possui laudo ou orientação médica</label>
        </div>
      </div>
    </div>
  );
}
