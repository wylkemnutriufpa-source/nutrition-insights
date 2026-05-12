import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { useTenant } from "@v1/lib/tenantContext";
import { VISUAL_VERDICT_OPTIONS } from "@v1/lib/coachAnalysisEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Slider } from "@v1/components/ui/slider";
import { Textarea } from "@v1/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Activity, Save } from "lucide-react";
import { toast } from "sonner";
import CoachPhotoUploader from "./CoachPhotoUploader";

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
    visual_observation: "",
    visual_verdict: "maintained",
    front_photo_path: "",
    side_photo_path: "",
    back_photo_path: "",
    hunger: 5, energy: 5, sleep_quality: 5, pump: 5,
    libido: 5, retention: 5, digestion: 5, performance: 5,
  });

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const handlePhotoUploaded = (position: "front" | "side" | "back", path: string) => {
    set(`${position}_photo_path`, path);
  };

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
        visual_observation: form.visual_observation || null,
        visual_verdict: form.visual_verdict,
        front_photo_url: form.front_photo_path || null,
        side_photo_url: form.side_photo_path || null,
        back_photo_url: form.back_photo_path || null,
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

      await supabase.from("coach_timeline" as any).insert({
        athlete_id: athleteId,
        coach_id: coachId,
        tenant_id: tenantId,
        event_type: "checkin",
        title: `Check-in registrado${form.weight ? ` — ${form.weight}kg` : ""}`,
        description: form.notes || `Aderência: ${form.adherence_pct || "—"}%, Energia: ${form.energy}/10`,
        metadata: {
          weight: form.weight ? Number(form.weight) : null,
          adherence: form.adherence_pct ? Number(form.adherence_pct) : null,
          has_photos: !!(form.front_photo_path || form.side_photo_path || form.back_photo_path),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-checkins", athleteId] });
      queryClient.invalidateQueries({ queryKey: ["coach-timeline", athleteId] });
      toast.success("Check-in registrado com sucesso!");
      setForm({
        weight: "", adherence_pct: "", training_load: "", training_volume: "",
        cardio_minutes: "", steps: "", notes: "", visual_observation: "", visual_verdict: "maintained",
        front_photo_path: "", side_photo_path: "", back_photo_path: "",
        hunger: 5, energy: 5, sleep_quality: 5, pump: 5,
        libido: 5, retention: 5, digestion: 5, performance: 5,
      });
    },
    onError: () => toast.error("Erro ao registrar check-in."),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
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

          {/* Photo Upload */}
          <CoachPhotoUploader
            athleteId={athleteId}
            onUploaded={handlePhotoUploaded}
            frontPath={form.front_photo_path}
            sidePath={form.side_photo_path}
            backPath={form.back_photo_path}
          />

          {/* Visual observation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Observação Visual do Coach</Label>
              <Textarea
                value={form.visual_observation}
                onChange={e => set("visual_observation", e.target.value)}
                placeholder="Ex: deltoides mais definidos, retenção abdominal..."
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Veredicto Visual</Label>
              <Select value={form.visual_verdict} onValueChange={v => set("visual_verdict", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VISUAL_VERDICT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Observações Gerais</Label>
            <Textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="Observações sobre o atleta..."
              rows={2}
            />
          </div>

          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            {mutation.isPending ? "Salvando..." : "Registrar Check-in"}
          </Button>
        </CardContent>
      </Card>
    </div>
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
