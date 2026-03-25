import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { TrainerAnamnesisData } from "./types";

interface Props {
  data: TrainerAnamnesisData;
  onChange: (partial: Partial<TrainerAnamnesisData>) => void;
}

export default function StepCoachingStyle({ data, onChange }: Props) {
  return (
    <div className="space-y-5">
      {/* Coaching intensity */}
      <div>
        <label className="text-sm font-medium mb-3 block">Estilo de cobrança preferido</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "gentle", label: "Suave", emoji: "🌸", desc: "Lembretes gentis" },
            { value: "moderate", label: "Moderado", emoji: "💬", desc: "Equilibrado" },
            { value: "firm", label: "Firme", emoji: "🔥", desc: "Cobrança direta" },
          ].map(s => (
            <button
              key={s.value}
              onClick={() => onChange({ coaching_intensity: s.value })}
              className={`p-4 rounded-xl text-center transition-all ${
                data.coaching_intensity === s.value
                  ? "bg-primary/15 border-2 border-primary text-primary"
                  : "bg-muted/50 border border-transparent text-muted-foreground hover:border-border"
              }`}
            >
              <div className="text-2xl mb-1">{s.emoji}</div>
              <div className="text-sm font-medium">{s.label}</div>
              <div className="text-[10px] mt-0.5 opacity-70">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Plan flexibility */}
      <div>
        <label className="text-sm font-medium mb-3 block">Preferência de plano</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "rigid", label: "Rígido", emoji: "📋", desc: "Seguir exatamente o plano" },
            { value: "flexible", label: "Flexível", emoji: "🔄", desc: "Permite adaptações" },
          ].map(p => (
            <button
              key={p.value}
              onClick={() => onChange({ plan_flexibility: p.value })}
              className={`p-4 rounded-xl text-center transition-all ${
                data.plan_flexibility === p.value
                  ? "bg-primary/15 border-2 border-primary text-primary"
                  : "bg-muted/50 border border-transparent text-muted-foreground hover:border-border"
              }`}
            >
              <div className="text-2xl mb-1">{p.emoji}</div>
              <div className="text-sm font-medium">{p.label}</div>
              <div className="text-[10px] mt-0.5 opacity-70">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Toggle preferences */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
          <Checkbox checked={data.wants_reminders} onCheckedChange={c => onChange({ wants_reminders: !!c })} />
          <div>
            <div className="text-sm font-medium">Receber lembretes de treino</div>
            <div className="text-xs text-muted-foreground">Notificações antes e após o horário programado</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
          <Checkbox checked={data.wants_video_tutorials} onCheckedChange={c => onChange({ wants_video_tutorials: !!c })} />
          <div>
            <div className="text-sm font-medium">Vídeos tutoriais nos exercícios</div>
            <div className="text-xs text-muted-foreground">Ver demonstrações durante o treino</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
          <Checkbox checked={data.wants_post_workout_feedback} onCheckedChange={c => onChange({ wants_post_workout_feedback: !!c })} />
          <div>
            <div className="text-sm font-medium">Feedback pós-treino</div>
            <div className="text-xs text-muted-foreground">Registrar esforço e sensações após cada treino</div>
          </div>
        </div>
      </div>

      {/* Final notes */}
      <div>
        <label className="text-sm font-medium mb-1 block">Observações gerais</label>
        <Textarea
          value={data.notes}
          onChange={e => onChange({ notes: e.target.value })}
          placeholder="Informações adicionais que o personal deve saber..."
          rows={3}
        />
      </div>
    </div>
  );
}
