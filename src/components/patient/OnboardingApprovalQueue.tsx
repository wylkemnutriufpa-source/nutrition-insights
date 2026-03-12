import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Clock, Sparkles, Edit2, ChevronDown,
  Scale, Target, MessageSquare, Loader2, CalendarClock, Zap,
  ClipboardCheck
} from "lucide-react";

interface OnboardingPipeline {
  id: string;
  patient_id: string;
  status: string;
  anamnesis_completed: boolean;
  body_data_completed: boolean;
  preferences_completed: boolean;
  plan_generated: boolean;
  plan_approved: boolean;
  weight: number | null;
  height: number | null;
  wake_time: string | null;
  sleep_time: string | null;
  meal_count: number;
  cooking_preference: string | null;
  food_preferences: any;
  generated_plan_id: string | null;
  generated_plan_data: any;
  use_scheduling_criteria: boolean;
  scheduling_criteria: any;
  rejection_reason: string | null;
  created_at: string;
}

interface Props {
  patientId: string;
  patientName: string;
}

const DEFAULT_CRITERIA = {
  auto_deactivate_previous: true,
  weight_enabled: false,
  weight_loss_kg: 1,
  checklist_enabled: true,
  checklist_min_adherence: 80,
  checklist_days: 14,
  feedback_enabled: true,
  feedback_interval_days: 15,
  extension_days: 15,
  max_extensions: 2,
  current_extensions: 0,
  manual_only: false,
};

export default function OnboardingApprovalQueue({ patientId, patientName }: Props) {
  const { user } = useAuth();
  const [pipeline, setPipeline] = useState<OnboardingPipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [useScheduling, setUseScheduling] = useState(false);
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPipeline();
  }, [patientId]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`onboarding-${patientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "onboarding_pipelines", filter: `patient_id=eq.${patientId}` }, () => fetchPipeline())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [patientId]);

  async function fetchPipeline() {
    const { data } = await supabase
      .from("onboarding_pipelines" as any)
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();
    if (data) {
      setPipeline(data as any);
      setUseScheduling((data as any).use_scheduling_criteria || false);
      setCriteria((data as any).scheduling_criteria || DEFAULT_CRITERIA);
    }
    setLoading(false);
  }

  async function handleCreatePipeline() {
    if (!user) return;
    setCreating(true);
    const { error } = await supabase
      .from("onboarding_pipelines" as any)
      .insert({
        patient_id: patientId,
        nutritionist_id: user.id,
        status: "pending_anamnesis",
      } as any);
    if (error) {
      if (error.code === "23505") toast.info("Pipeline já existe para este paciente");
      else toast.error("Erro ao criar pipeline");
    } else {
      toast.success("Onboarding ativado! Paciente receberá o fluxo automático.");
      // Notify patient
      await supabase.from("notifications").insert({
        user_id: patientId,
        title: "Onboarding Ativado! 🚀",
        message: "Seu nutricionista ativou o fluxo automático de onboarding. Complete as etapas para receber seu plano alimentar personalizado.",
        type: "success",
        action_url: "/onboarding",
      });
      fetchPipeline();
    }
    setCreating(false);
  }

  async function handleApprove() {
    if (!pipeline || !user) return;
    setProcessing(true);

    // Update pipeline as approved
    await supabase
      .from("onboarding_pipelines" as any)
      .update({
        plan_approved: true,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        status: "completed",
        use_scheduling_criteria: useScheduling,
        scheduling_criteria: criteria,
      } as any)
      .eq("id", pipeline.id);

    // Activate the meal plan
    if (pipeline.generated_plan_id) {
      await supabase
        .from("meal_plans")
        .update({ is_active: true })
        .eq("id", pipeline.generated_plan_id);

      // If scheduling criteria enabled, create a plan_schedule
      if (useScheduling) {
        const activateDate = new Date();
        activateDate.setDate(activateDate.getDate() + (criteria.checklist_days || 14));

        await supabase
          .from("plan_schedules" as any)
          .insert({
            meal_plan_id: pipeline.generated_plan_id,
            activate_at: activateDate.toISOString().split("T")[0],
            criteria: criteria,
            status: "scheduled",
          } as any);
      }
    }

    // Notify patient
    await supabase.from("notifications").insert({
      user_id: patientId,
      title: "Plano Alimentar Aprovado! 🎉",
      message: "Seu plano alimentar foi revisado e aprovado pelo profissional. Acesse agora em 'Minha Dieta'.",
      type: "success",
      action_url: "/my-diet",
    });

    toast.success("Plano aprovado e ativado com sucesso!");
    fetchPipeline();
    setProcessing(false);
  }

  async function handleReject() {
    if (!pipeline || !rejectReason.trim()) {
      toast.error("Informe o motivo da rejeição");
      return;
    }
    setProcessing(true);

    await supabase
      .from("onboarding_pipelines" as any)
      .update({
        status: "rejected",
        rejection_reason: rejectReason,
        plan_generated: false,
      } as any)
      .eq("id", pipeline.id);

    // Delete the generated plan
    if (pipeline.generated_plan_id) {
      await supabase.from("meal_plans").delete().eq("id", pipeline.generated_plan_id);
    }

    // Notify patient
    await supabase.from("notifications").insert({
      user_id: patientId,
      title: "Plano Precisa de Ajustes",
      message: `Seu plano não foi aprovado: ${rejectReason}. Ajuste seus dados e gere um novo.`,
      type: "warning",
      action_url: "/onboarding",
    });

    toast.success("Plano rejeitado. Paciente foi notificado.");
    setRejectDialog(false);
    setRejectReason("");
    fetchPipeline();
    setProcessing(false);
  }

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  // No pipeline - show activation button
  if (!pipeline) {
    return (
      <Card>
        <CardContent className="py-6 text-center space-y-4">
          <Sparkles className="w-12 h-12 text-primary mx-auto" />
          <h3 className="text-lg font-semibold">Onboarding Automático</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Ative o fluxo automático para {patientName}. O paciente preencherá anamnese, dados corporais e preferências, e a IA gerará um pré-plano para sua aprovação.
          </p>
          <Button onClick={handleCreatePipeline} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
            Ativar Onboarding Automático
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Pipeline exists - show status
  const stepsDone = [
    pipeline.anamnesis_completed,
    pipeline.body_data_completed,
    pipeline.preferences_completed,
    pipeline.plan_generated,
    pipeline.plan_approved,
  ].filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Onboarding Pipeline
          </span>
          <Badge variant={pipeline.status === "completed" ? "default" : pipeline.status === "pending_approval" ? "secondary" : "outline"}>
            {pipeline.status === "completed" ? "✅ Completo" :
             pipeline.status === "pending_approval" ? "⏳ Aguardando Aprovação" :
             pipeline.status === "rejected" ? "❌ Rejeitado" :
             `Etapa ${stepsDone}/5`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Steps overview */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "Anamnese", done: pipeline.anamnesis_completed },
            { label: "Corpo", done: pipeline.body_data_completed },
            { label: "Prefs", done: pipeline.preferences_completed },
            { label: "Plano", done: pipeline.plan_generated },
            { label: "Aprovado", done: pipeline.plan_approved },
          ].map((s, i) => (
            <div key={i} className={`text-center p-2 rounded-lg text-xs font-medium ${
              s.done ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            }`}>
              {s.done ? "✅" : "⬜"} {s.label}
            </div>
          ))}
        </div>

        {/* Patient data summary */}
        {(pipeline.weight || pipeline.height) && (
          <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            {pipeline.weight && <div><span className="text-muted-foreground">Peso:</span> <strong>{pipeline.weight}kg</strong></div>}
            {pipeline.height && <div><span className="text-muted-foreground">Altura:</span> <strong>{pipeline.height}cm</strong></div>}
            {pipeline.meal_count && <div><span className="text-muted-foreground">Refeições:</span> <strong>{pipeline.meal_count}/dia</strong></div>}
            {pipeline.cooking_preference && <div><span className="text-muted-foreground">Preparo:</span> <strong>{pipeline.cooking_preference}</strong></div>}
          </div>
        )}

        {/* Approval actions */}
        {pipeline.status === "pending_approval" && (
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm font-medium">O pré-plano foi gerado pela IA. Revise e decida:</p>

            {/* Link to edit the plan */}
            {pipeline.generated_plan_id && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/meal-plans/${pipeline.generated_plan_id}`}>
                  <Edit2 className="w-4 h-4 mr-2" /> Revisar/Editar Plano
                </a>
              </Button>
            )}

            {/* Scheduling Criteria - same as Biquíni Branco */}
            <Collapsible open={criteriaOpen} onOpenChange={setCriteriaOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4" />
                    Programar Planos (Critérios Biquíni Branco)
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${criteriaOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                <div className="flex items-center gap-3">
                  <Switch checked={useScheduling} onCheckedChange={setUseScheduling} />
                  <Label>Ativar programação automática de planos</Label>
                </div>

                {useScheduling && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3 p-3 bg-muted/50 rounded-lg"
                  >
                    {/* Weight criteria */}
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={criteria.weight_enabled}
                        onCheckedChange={(v) => setCriteria({ ...criteria, weight_enabled: v })}
                      />
                      <Scale className="w-4 h-4 text-primary" />
                      <Label className="flex-1">Perda de peso mínima</Label>
                      <Input
                        type="number"
                        className="w-20"
                        value={criteria.weight_loss_kg}
                        onChange={(e) => setCriteria({ ...criteria, weight_loss_kg: Number(e.target.value) })}
                        disabled={!criteria.weight_enabled}
                      />
                      <span className="text-xs text-muted-foreground">kg</span>
                    </div>

                    {/* Checklist adherence */}
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={criteria.checklist_enabled}
                        onCheckedChange={(v) => setCriteria({ ...criteria, checklist_enabled: v })}
                      />
                      <ClipboardCheck className="w-4 h-4 text-primary" />
                      <Label className="flex-1">Adesão checklist</Label>
                      <Input
                        type="number"
                        className="w-20"
                        value={criteria.checklist_min_adherence}
                        onChange={(e) => setCriteria({ ...criteria, checklist_min_adherence: Number(e.target.value) })}
                        disabled={!criteria.checklist_enabled}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>

                    {/* Checklist days */}
                    {criteria.checklist_enabled && (
                      <div className="flex items-center gap-3 pl-10">
                        <Label className="flex-1">Período de avaliação</Label>
                        <Input
                          type="number"
                          className="w-20"
                          value={criteria.checklist_days}
                          onChange={(e) => setCriteria({ ...criteria, checklist_days: Number(e.target.value) })}
                        />
                        <span className="text-xs text-muted-foreground">dias</span>
                      </div>
                    )}

                    {/* Feedback compliance */}
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={criteria.feedback_enabled}
                        onCheckedChange={(v) => setCriteria({ ...criteria, feedback_enabled: v })}
                      />
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <Label className="flex-1">Feedback a cada</Label>
                      <Input
                        type="number"
                        className="w-20"
                        value={criteria.feedback_interval_days}
                        onChange={(e) => setCriteria({ ...criteria, feedback_interval_days: Number(e.target.value) })}
                        disabled={!criteria.feedback_enabled}
                      />
                      <span className="text-xs text-muted-foreground">dias</span>
                    </div>

                    {/* Extension settings */}
                    <div className="flex items-center gap-3">
                      <Target className="w-4 h-4 text-muted-foreground ml-6" />
                      <Label className="flex-1">Extensão automática</Label>
                      <Input
                        type="number"
                        className="w-20"
                        value={criteria.extension_days}
                        onChange={(e) => setCriteria({ ...criteria, extension_days: Number(e.target.value) })}
                      />
                      <span className="text-xs text-muted-foreground">dias</span>
                    </div>
                    <div className="flex items-center gap-3 pl-10">
                      <Label className="flex-1">Máx. extensões</Label>
                      <Input
                        type="number"
                        className="w-20"
                        value={criteria.max_extensions}
                        onChange={(e) => setCriteria({ ...criteria, max_extensions: Number(e.target.value) })}
                      />
                    </div>
                  </motion.div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Approve / Reject buttons */}
            <div className="flex gap-3">
              <Button onClick={handleApprove} className="flex-1" disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Aprovar e Ativar Plano
              </Button>
              <Button variant="destructive" onClick={() => setRejectDialog(true)} disabled={processing}>
                <XCircle className="w-4 h-4 mr-2" /> Rejeitar
              </Button>
            </div>
          </div>
        )}

        {/* Completed state */}
        {pipeline.status === "completed" && (
          <div className="text-center py-4 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-success mx-auto" />
            <p className="text-sm text-muted-foreground">Onboarding completo. Plano ativo.</p>
            {useScheduling && <Badge variant="outline"><CalendarClock className="w-3 h-3 mr-1" /> Programação automática ativa</Badge>}
          </div>
        )}
      </CardContent>

      {/* Reject dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Pré-Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Motivo da rejeição</Label>
            <Textarea
              placeholder="Ex: Necessário ajustar as calorias, dados inconsistentes..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
