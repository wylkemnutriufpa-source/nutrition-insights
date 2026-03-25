import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TrainerAnamnesisData } from "./types";
import { EQUIPMENT_OPTIONS, HOURS_OPTIONS } from "./types";

interface Props {
  data: TrainerAnamnesisData;
  onChange: (partial: Partial<TrainerAnamnesisData>) => void;
}

export default function StepAvailability({ data, onChange }: Props) {
  const toggleArray = (field: "available_hours" | "available_equipment", item: string) => {
    const current = data[field] as string[];
    onChange({
      [field]: current.includes(item) ? current.filter(i => i !== item) : [...current, item],
    });
  };

  return (
    <div className="space-y-5">
      {/* Weekly availability */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Dias por semana</label>
          <Select value={data.weekly_availability.toString()} onValueChange={v => onChange({ weekly_availability: parseInt(v) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1,2,3,4,5,6,7].map(n => <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Duração da sessão</label>
          <Select value={data.session_duration.toString()} onValueChange={v => onChange({ session_duration: parseInt(v) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[30,45,60,75,90,120].map(n => <SelectItem key={n} value={n.toString()}>{n} min</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Available hours */}
      <div>
        <label className="text-sm font-medium mb-2 block">Horários disponíveis</label>
        <div className="flex flex-wrap gap-1.5">
          {HOURS_OPTIONS.map(h => (
            <button
              key={h}
              onClick={() => toggleArray("available_hours", h)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                data.available_hours.includes(h)
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="text-sm font-medium mb-2 block">Local de treino</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "gym", label: "Academia", emoji: "🏋️" },
            { value: "home", label: "Casa", emoji: "🏠" },
            { value: "hybrid", label: "Híbrido", emoji: "🔄" },
          ].map(l => (
            <button
              key={l.value}
              onClick={() => onChange({ training_location: l.value })}
              className={`p-3 rounded-lg text-center text-sm font-medium transition-all ${
                data.training_location === l.value
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <div className="text-lg mb-1">{l.emoji}</div>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modality */}
      <div>
        <label className="text-sm font-medium mb-2 block">Modalidade de acompanhamento</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "presencial", label: "Presencial", emoji: "🤝" },
            { value: "online", label: "Online", emoji: "💻" },
            { value: "hibrido", label: "Híbrido", emoji: "📱" },
          ].map(l => (
            <button
              key={l.value}
              onClick={() => onChange({ training_modality: l.value })}
              className={`p-3 rounded-lg text-center text-sm font-medium transition-all ${
                data.training_modality === l.value
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <div className="text-lg mb-1">{l.emoji}</div>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div>
        <label className="text-sm font-medium mb-2 block">Equipamentos disponíveis</label>
        <div className="flex flex-wrap gap-1.5">
          {EQUIPMENT_OPTIONS.map(e => (
            <button
              key={e}
              onClick={() => toggleArray("available_equipment", e)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                data.available_equipment.includes(e)
                  ? "bg-secondary text-secondary-foreground border border-border"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Routine & energy */}
      <div>
        <label className="text-sm font-medium mb-1 block">Rotina de trabalho</label>
        <Input value={data.work_routine} onChange={e => onChange({ work_routine: e.target.value })} placeholder="Ex: CLT 8-18h, home office, flexível..." />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-2 block">Qualidade do sono</label>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { value: "good", label: "Bom 😴" },
              { value: "regular", label: "Regular 😐" },
              { value: "poor", label: "Ruim 😵" },
            ].map(s => (
              <button
                key={s.value}
                onClick={() => onChange({ sleep_quality: s.value })}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  data.sleep_quality === s.value
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Nível de energia</label>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { value: "high", label: "Alto ⚡" },
              { value: "medium", label: "Médio 🔋" },
              { value: "low", label: "Baixo 🪫" },
            ].map(e => (
              <button
                key={e.value}
                onClick={() => onChange({ energy_level: e.value })}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  data.energy_level === e.value
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
