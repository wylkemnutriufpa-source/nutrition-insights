import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Activity, Save } from "lucide-react";
import { toast } from "sonner";

const SUBJECTIVE_FIELDS = [
  { key: "hunger", label: "Fome", emoji: "🍽️" },
  { key: "energy", label: "Energia", emoji: "⚡" },
  { key: "sleep_quality", label: "Sono", emoji: "😴" },
  { key: "pump", label: "Pump", emoji: "💪" },
  { key: "libido", label: "Libido", emoji: "🔥" },
  { key: "retention", label: "Retenção", emoji: "💧" },
  { key: "digestion", label: "Digestão", emoji: "🫃" },
  { key: "performance", label: "Performance", emoji: "🏋️" },
] as const;

interface Props {
  athleteId: string;
  coachId: string;
}

export default function AthleteCheckinForm({ athleteId, coachId }: Props) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    weight: "",
    adherence_pct: "",
    training_load: "",
    training_volume: "",
    cardio_minutes: "",
    steps: "",
    notes: "",
    hunger: 5, energy: 5, sleep_quality: 5, pump: 5,
    libido: 5, retention: 5, digestion: 5, performance: 5,
  });

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coach_athlete_checkins" as any).insert({
        athlete_id: athleteId,
        coach_id: coachId,
        tenant_id: tenantId,
        weight: form.weight ? Number(form.weight) : null,
        adherence_pct: form.adherence_pct ? Number(form.adherence_pct) : null,
        training_load: form.training_load ? Number(form.training_load) : null,
        training_volume: form.training_volume ? Number(form.training_volume) : null,
        cardio_minutes: form.cardio_minutes ? Number(form.cardio_minutes) : null,
        steps: form.steps ? Number(form.steps) : null,
        notes: form.notes || null,
        hunger: form.hunger,
        energy: form.energy,
        sleep_quality: form.sleep_quality,
        pump: form.pump,
        libido: form.libido,
        retention: form.retention,
        digestion: form.digestion,
        performance: form.performance,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-checkins", athleteId] });
      toast.success("Check-in registrado com sucesso!");
      setForm({
        weight: "", adherence_pct: "", training_load: "", training_volume: "",
        cardio_minutes: "", steps: "", notes: "",
        hunger: 5, energy: 5, sleep_quality: 5, pump: 5,
        libido: 5, retention: 5, digestion: 5, performance: 5,
      });
    },
    onError: () => toast.error("Erro ao registrar check-in."),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Novo Check-in
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="Peso (kg)" value={form.weight} onChange={v => set("weight", v)} />
          <NumField label="Aderência (%)" value={form.adherence_pct} onChange={v => set("adherence_pct", v)} />
          <NumField label="Carga (kg)" value={form.training_load} onChange={v => set("training_load", v)} />
          <NumField label="Volume (sets)" value={form.training_volume} onChange={v => set("training_volume", v)} />
          <NumField label="Cardio (min)" value={form.cardio_minutes} onChange={v => set("cardio_minutes", v)} />
          <NumField label="Steps" value={form.steps} onChange={v => set("steps", v)} />
        </div>

        {/* Subjective markers */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Marcadores Subjetivos (1-10)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUBJECTIVE_FIELDS.map(f => (
              <div key={f.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{f.emoji} {f.label}</Label>
                  <span className="text-sm font-bold text-primary">{(form as any)[f.key]}</span>
                </div>
                <Slider
                  min={1} max={10} step={1}
                  value={[(form as any)[f.key]]}
                  onValueChange={([v]) => set(f.key, v)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label>Observações</Label>
          <Textarea
            value={form.notes}
            onChange={e => set("notes", e.target.value)}
            placeholder="Observações sobre o atleta..."
            rows={3}
          />
        </div>

        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {mutation.isPending ? "Salvando..." : "Registrar Check-in"}
        </Button>
      </CardContent>
    </Card>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder="—" />
    </div>
  );
}
