import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { DECISION_LABELS } from "@/lib/coachAnalysisEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PenLine, Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  athleteId: string;
}

const MANUAL_TYPES = [
  "maintain_protocol", "increase_carbs", "reduce_carbs", "adjust_cardio_up",
  "adjust_cardio_down", "strategic_refeed", "reduce_volume", "deload",
  "hold_protocol", "review_recovery", "review_meal_distribution", "water_manipulation", "other",
];

export default function CoachManualDecision({ athleteId }: Props) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    decision_type: "maintain_protocol",
    reason: "",
    expected_impact: "",
  });

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.reason.trim()) throw new Error("Motivo obrigatório");

      const { error } = await supabase.from("coach_decisions" as any).insert({
        athlete_id: athleteId,
        coach_id: user!.id,
        tenant_id: tenantId,
        decision_type: form.decision_type,
        reason: form.reason.trim(),
        data_basis: "Decisão manual do coach",
        confidence_level: "high",
        expected_impact: form.expected_impact.trim() || null,
        coach_reason: form.reason.trim(),
        is_manual: true,
        status: "accepted",
        applied_at: new Date().toISOString(),
      });
      if (error) throw error;

      await supabase.from("coach_timeline" as any).insert({
        athlete_id: athleteId,
        coach_id: user!.id,
        tenant_id: tenantId,
        event_type: "decision_accepted",
        title: `Decisão manual: ${DECISION_LABELS[form.decision_type] || form.decision_type}`,
        description: form.reason.trim(),
        metadata: { decision_type: form.decision_type, is_manual: true },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-timeline", athleteId] });
      toast.success("Decisão manual registrada!");
      setForm({ decision_type: "maintain_protocol", reason: "", expected_impact: "" });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao registrar decisão."),
  });

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="w-full">
        <PenLine className="h-3.5 w-3.5 mr-1.5" /> Registrar Decisão Manual
      </Button>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <PenLine className="h-4 w-4 text-primary" />
          Decisão Manual do Coach
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Tipo da Decisão</Label>
          <Select value={form.decision_type} onValueChange={v => set("decision_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MANUAL_TYPES.map(t => (
                <SelectItem key={t} value={t}>{DECISION_LABELS[t] || t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Motivo *</Label>
          <Textarea
            value={form.reason}
            onChange={e => set("reason", e.target.value)}
            placeholder="Descreva o motivo da decisão..."
            rows={2}
          />
        </div>
        <div>
          <Label className="text-xs">Impacto Esperado</Label>
          <Input
            value={form.expected_impact}
            onChange={e => set("expected_impact", e.target.value)}
            placeholder="Ex: Melhora de 0.5kg/semana"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => mutation.mutate()} disabled={!form.reason.trim() || mutation.isPending}>
            <Save className="h-3.5 w-3.5 mr-1" /> {mutation.isPending ? "Salvando..." : "Registrar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        </div>
      </CardContent>
    </Card>
  );
}
