import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TrainerAnamnesisData } from "./types";
import { MODALITIES } from "./types";

interface Props {
  data: TrainerAnamnesisData;
  onChange: (partial: Partial<TrainerAnamnesisData>) => void;
}

export default function StepTrainingHistory({ data, onChange }: Props) {
  const toggleModality = (m: string) => {
    const list = data.modalities_practiced;
    onChange({
      modalities_practiced: list.includes(m) ? list.filter(i => i !== m) : [...list, m],
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={data.has_trained_before}
          onCheckedChange={c => onChange({ has_trained_before: !!c })}
        />
        <label className="text-sm font-medium">Já treinou antes?</label>
      </div>

      {data.has_trained_before && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Anos de treino</label>
              <Input
                type="number"
                value={data.training_years ?? ""}
                onChange={e => onChange({ training_years: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Frequência anterior</label>
              <Select
                value={data.previous_frequency?.toString() || ""}
                onValueChange={v => onChange({ previous_frequency: parseInt(v) })}
              >
                <SelectTrigger><SelectValue placeholder="x/semana" /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n}x por semana</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Último período de treino</label>
            <Input
              value={data.last_training_period}
              onChange={e => onChange({ last_training_period: e.target.value })}
              placeholder="Ex: Jan-Mar 2025, há 6 meses..."
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Nível percebido</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "beginner", label: "Iniciante", emoji: "🌱" },
                { value: "intermediate", label: "Intermediário", emoji: "🔥" },
                { value: "advanced", label: "Avançado", emoji: "💎" },
              ].map(l => (
                <button
                  key={l.value}
                  onClick={() => onChange({ perceived_level: l.value })}
                  className={`p-3 rounded-lg text-center text-sm font-medium transition-all ${
                    data.perceived_level === l.value
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

          <div>
            <label className="text-sm font-medium mb-2 block">Modalidades praticadas</label>
            <div className="flex flex-wrap gap-1.5">
              {MODALITIES.map(m => (
                <button
                  key={m}
                  onClick={() => toggleModality(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    data.modalities_practiced.includes(m)
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div>
        <label className="text-sm font-medium mb-1 block">Exercícios que gosta</label>
        <Textarea
          value={data.liked_exercises}
          onChange={e => onChange({ liked_exercises: e.target.value })}
          placeholder="Ex: supino, agachamento, corrida..."
          rows={2}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Exercícios que não gosta</label>
        <Textarea
          value={data.disliked_exercises}
          onChange={e => onChange({ disliked_exercises: e.target.value })}
          placeholder="Ex: burpee, prancha, abdominais..."
          rows={2}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Principais dificuldades com treino</label>
        <Textarea
          value={data.training_difficulties}
          onChange={e => onChange({ training_difficulties: e.target.value })}
          placeholder="Falta de motivação, não saber executar, dor, falta de tempo..."
          rows={2}
        />
      </div>
    </div>
  );
}
