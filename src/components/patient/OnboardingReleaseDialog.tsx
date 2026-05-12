import { useState } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { releaseOnboarding } from "@v1/lib/serverTransitions";
import { toast } from "sonner";
import { Button } from "@v1/components/ui/button";
import { Label } from "@v1/components/ui/label";
import { Input } from "@v1/components/ui/input";
import { Textarea } from "@v1/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Rocket, Loader2, Lock, CheckCircle2 } from "lucide-react";

interface Props {
  patientId: string;
  patientName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onReleased: () => void;
}

export default function OnboardingReleaseDialog({ patientId, patientName, open, onOpenChange, onReleased }: Props) {
  const { user } = useAuth();
  const [releasing, setReleasing] = useState(false);
  const [form, setForm] = useState({
    contracted_plan: "",
    primary_goal: "",
    nutrition_strategy: "",
    followup_intensity: "moderate",
    estimated_duration: "90",
    notes: "",
  });

  const handleRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !patientId) return;
    setReleasing(true);

    try {
      const releaseConfig = {
        contracted_plan: form.contracted_plan,
        primary_goal: form.primary_goal,
        nutrition_strategy: form.nutrition_strategy,
        followup_intensity: form.followup_intensity,
        estimated_duration_days: parseInt(form.estimated_duration),
        notes: form.notes,
      };

      // Use server-authoritative RPC for the core transition
      const result = await releaseOnboarding(patientId, user.id, releaseConfig);
      if (!result.success) throw new Error(result.error || "Erro ao liberar onboarding");

      // Log in timeline (supplementary, non-critical)
      await supabase.from("patient_timeline").insert({
        patient_id: patientId,
        event_type: "onboarding_released",
        title: "Onboarding liberado pelo profissional",
        description: `Objetivo: ${form.primary_goal || "Não definido"} | Estratégia: ${form.nutrition_strategy || "Não definida"} | Duração estimada: ${form.estimated_duration} dias`,
        created_by: user.id,
      });

      toast.success("Onboarding liberado com sucesso!");
      onOpenChange(false);
      onReleased();
    } catch (err: any) {
      toast.error(err.message || "Erro ao liberar onboarding");
    }
    setReleasing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Rocket className="w-5 h-5 text-primary" />
            Liberar Onboarding — {patientName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleRelease} className="space-y-4">
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm text-warning-foreground">
            <Lock className="w-4 h-4 inline mr-1.5" />
            O paciente só poderá iniciar o onboarding após esta liberação.
          </div>

          <div>
            <Label>Plano Contratado</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {[
                { value: "mensal", label: "Mensal", icon: "📅" },
                { value: "trimestral", label: "Trimestral", icon: "📆" },
                { value: "semestral", label: "Semestral", icon: "🗓️" },
                { value: "anual", label: "Anual", icon: "📋" },
              ].map((plan) => (
                <Button
                  key={plan.value}
                  type="button"
                  variant={form.contracted_plan === plan.value ? "default" : "outline"}
                  className={`h-14 flex flex-col gap-0.5 ${form.contracted_plan === plan.value ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setForm({ ...form, contracted_plan: plan.value })}
                >
                  <span className="text-lg">{plan.icon}</span>
                  <span className="text-xs">{plan.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Objetivo Principal</Label>
            <Select value={form.primary_goal} onValueChange={(v) => setForm({ ...form, primary_goal: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lose_weight">Emagrecimento</SelectItem>
                <SelectItem value="gain_muscle">Ganho de massa</SelectItem>
                <SelectItem value="maintain">Manutenção</SelectItem>
                <SelectItem value="health">Saúde geral</SelectItem>
                <SelectItem value="clinical">Tratamento clínico</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Estratégia Nutricional Inicial</Label>
            <Select value={form.nutrition_strategy} onValueChange={(v) => setForm({ ...form, nutrition_strategy: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="flexible">Dieta Flexível</SelectItem>
                <SelectItem value="low_carb">Low Carb</SelectItem>
                <SelectItem value="ketogenic">Cetogênica</SelectItem>
                <SelectItem value="mediterranean">Mediterrânea</SelectItem>
                <SelectItem value="vegetarian">Vegetariana</SelectItem>
                <SelectItem value="vegan">Vegana</SelectItem>
                <SelectItem value="custom">Personalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Intensidade de Acompanhamento</Label>
              <Select value={form.followup_intensity} onValueChange={(v) => setForm({ ...form, followup_intensity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Leve (mensal)</SelectItem>
                  <SelectItem value="moderate">Moderado (quinzenal)</SelectItem>
                  <SelectItem value="intensive">Intensivo (semanal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duração Estimada (dias)</Label>
              <Input
                type="number"
                value={form.estimated_duration}
                onChange={(e) => setForm({ ...form, estimated_duration: e.target.value })}
                min={7}
                max={365}
              />
            </div>
          </div>

          <div>
            <Label>Observações Clínicas (opcional)</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas sobre o paciente, contexto da consulta..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full gap-2" disabled={releasing || !form.primary_goal}>
            {releasing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Liberando...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Liberar Onboarding</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
