import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertTriangle, CheckCircle2, XCircle, Loader2, User,
  Target, Sparkles, ChevronRight, Scale, UtensilsCrossed,
  ArrowRight, FileText, Eye
} from "lucide-react";

interface PendingPipeline {
  id: string;
  patient_id: string;
  status: string;
  generated_plan_id: string | null;
  generated_plan_data: any;
  weight: number | null;
  height: number | null;
  meal_count: number;
  cooking_preference: string | null;
  created_at: string;
  patient_name?: string;
  patient_avatar?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PendingApprovalsModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState<PendingPipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPipeline, setSelectedPipeline] = useState<PendingPipeline | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("plan_a");
  const [processing, setProcessing] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (open && user) fetchPending();
  }, [open, user]);

  // Realtime for new pending approvals
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("pending-approvals-global")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "onboarding_pipelines",
      }, (payload: any) => {
        if (payload.new?.status === "pending_approval" && payload.new?.nutritionist_id === user.id) {
          fetchPending();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  async function fetchPending() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("onboarding_pipelines" as any)
      .select("*")
      .eq("nutritionist_id", user.id)
      .eq("status", "pending_approval");

    const items = (data || []) as any[];
    if (items.length > 0) {
      const patientIds = items.map((p: any) => p.patient_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", patientIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const enriched = items.map((p: any) => ({
        ...p,
        patient_name: profileMap.get(p.patient_id)?.full_name || "Paciente",
        patient_avatar: profileMap.get(p.patient_id)?.avatar_url,
      }));
      setPipelines(enriched);
    } else {
      setPipelines([]);
    }
    setLoading(false);
  }

  function getAlternatives(pipeline: PendingPipeline) {
    const ex = pipeline.generated_plan_data?.explainability;
    if (!ex) return [];
    return ex.alternative_templates || [];
  }

  function getSelectedTemplate(pipeline: PendingPipeline) {
    const ex = pipeline.generated_plan_data?.explainability;
    if (!ex) return null;
    return ex.selected_template || null;
  }

  async function handleCreateAndEdit() {
    if (!selectedPipeline || !user) return;
    setProcessing(true);
    try {
      const ex = selectedPipeline.generated_plan_data?.explainability;
      const template = ex?.selected_template;
      const templateName = template?.name || "Plano Personalizado";
      const templateSlug = template?.slug || "custom";
      const kcal = template?.base_calories || ex?.calculation?.final_kcal || 0;

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const { data: newPlan, error: planError } = await supabase
        .from("meal_plans")
        .insert({
          nutritionist_id: user.id,
          patient_id: selectedPipeline.patient_id,
          title: `Plano ${templateName}`,
          description: `Plano gerado via protocolo Master (${kcal}kcal)`,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          template_slug: templateSlug,
          generation_source: "protocol_master",
          generation_metadata: selectedPipeline.generated_plan_data,
          plan_status: "under_professional_review",
          is_active: false,
        })
        .select("id")
        .single();

      if (planError || !newPlan) {
        toast.error("Erro ao criar plano: " + (planError?.message || "Tente novamente"));
        setProcessing(false);
        return;
      }

      // Update pipeline with the plan id
      await supabase
        .from("onboarding_pipelines" as any)
        .update({ generated_plan_id: newPlan.id } as any)
        .eq("id", selectedPipeline.id);

      onOpenChange(false);
      navigate(`/meal-plans/${newPlan.id}`);
      toast.success("Plano criado! Revise e aprove quando estiver pronto.");
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Tente novamente"));
    } finally {
      setProcessing(false);
    }
  }

  async function handleApprove() {
    if (!selectedPipeline || !user) return;
    setProcessing(true);

    try {
      const isAlternative = selectedPlan !== "plan_a";
      const alternatives = getAlternatives(selectedPipeline);
      const altIndex = isAlternative ? parseInt(selectedPlan.replace("plan_alt_", "")) : -1;
      const chosenAlt = isAlternative && altIndex >= 0 ? alternatives[altIndex] : null;

      let planId = selectedPipeline.generated_plan_id;

      // If no plan_id exists but we have plan data, create the meal plan now
      if (!planId && selectedPipeline.generated_plan_data) {
        const ex = selectedPipeline.generated_plan_data?.explainability;
        const template = chosenAlt || ex?.selected_template;
        const templateName = template?.name || "Plano Personalizado";
        const templateSlug = template?.slug || "custom";
        const kcal = template?.base_calories || ex?.calculation?.final_kcal || 0;

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        const { data: newPlan, error: planError } = await supabase
          .from("meal_plans")
          .insert({
            nutritionist_id: user.id,
            patient_id: selectedPipeline.patient_id,
            title: `Plano ${templateName}`,
            description: `Plano gerado via protocolo Master (${kcal}kcal)${chosenAlt ? " — alternativa escolhida pelo profissional" : ""}`,
            start_date: startDate.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
            template_slug: templateSlug,
            generation_source: "protocol_master",
            generation_metadata: selectedPipeline.generated_plan_data,
            plan_status: "approved",
            is_active: true,
          })
          .select("id")
          .single();

        if (planError || !newPlan) {
          toast.error("Erro ao criar plano: " + (planError?.message || "Tente novamente"));
          setProcessing(false);
          return;
        }
        planId = newPlan.id;

        // Update pipeline with the new plan id
        await supabase
          .from("onboarding_pipelines" as any)
          .update({ generated_plan_id: planId } as any)
          .eq("id", selectedPipeline.id);

        // Now publish it
        await supabase
          .from("meal_plans")
          .update({ plan_status: "published_to_patient" } as any)
          .eq("id", planId);
      }

      // If plan existed and user chose an alternative, update it
      if (chosenAlt && planId && selectedPipeline.generated_plan_id) {
        await supabase
          .from("meal_plans")
          .update({
            template_slug: chosenAlt.slug,
            generation_metadata: {
              ...(selectedPipeline.generated_plan_data || {}),
              switched_from_original: true,
              original_template: getSelectedTemplate(selectedPipeline)?.slug,
              chosen_alternative: chosenAlt.slug,
              chosen_alternative_name: chosenAlt.name,
            },
            title: `Plano ${chosenAlt.name}`,
            description: `Plano gerado via ${chosenAlt.name} (${chosenAlt.base_calories}kcal) — escolhido como alternativa pelo profissional`,
          } as any)
          .eq("id", planId);
      }

      // Update pipeline as approved
      await supabase
        .from("onboarding_pipelines" as any)
        .update({
          plan_approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          status: "completed",
        } as any)
        .eq("id", selectedPipeline.id);

      // Approve + publish existing meal plan (if it already had a plan_id)
      if (selectedPipeline.generated_plan_id && planId) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        await supabase
          .from("meal_plans")
          .update({ plan_status: "approved" } as any)
          .eq("id", planId);

        await supabase
          .from("meal_plans")
          .update({
            is_active: true,
            plan_status: "published_to_patient",
            start_date: startDate.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
          } as any)
          .eq("id", planId);
      }

      // Notify patient
      await supabase.from("notifications").insert({
        user_id: selectedPipeline.patient_id,
        title: "Plano Alimentar Aprovado! 🎉",
        message: isAlternative
          ? `Seu profissional escolheu o plano ${chosenAlt?.name || "alternativo"} para você. Acesse em 'Minha Dieta'. Validade: 30 dias.`
          : "Seu plano foi revisado e aprovado. Acesse em 'Minha Dieta'. Validade: 30 dias.",
        type: "success",
        action_url: "/my-diet",
      });

      toast.success(`Plano de ${selectedPipeline.patient_name} aprovado!`);
      setPipelines((prev) => prev.filter((p) => p.id !== selectedPipeline.id));
      setSelectedPipeline(null);
      setSelectedPlan("plan_a");

      if (pipelines.length <= 1) onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao aprovar: " + (err.message || "Tente novamente"));
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!selectedPipeline || !rejectReason.trim()) {
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
      .eq("id", selectedPipeline.id);

    if (selectedPipeline.generated_plan_id) {
      await supabase.from("meal_plans").delete().eq("id", selectedPipeline.generated_plan_id);
    }

    await supabase.from("notifications").insert({
      user_id: selectedPipeline.patient_id,
      title: "Plano Precisa de Ajustes",
      message: `Seu plano não foi aprovado: ${rejectReason}. Ajuste seus dados e gere um novo.`,
      type: "warning",
      action_url: "/onboarding",
    });

    toast.success(`Plano de ${selectedPipeline.patient_name} rejeitado.`);
    setPipelines((prev) => prev.filter((p) => p.id !== selectedPipeline.id));
    setSelectedPipeline(null);
    setRejectMode(false);
    setRejectReason("");
    setProcessing(false);

    if (pipelines.length <= 1) onOpenChange(false);
  }

  const pendingCount = pipelines.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Planos Pendentes de Aprovação
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingCount}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea type="always" className="flex-1 min-h-0 -mx-6 px-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pipelines.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-muted-foreground">Nenhum plano pendente de aprovação!</p>
            </div>
          ) : !selectedPipeline ? (
            /* ── List view ── */
            <div className="space-y-3 py-2">
              {pipelines.map((p) => {
                const template = getSelectedTemplate(p);
                const altCount = getAlternatives(p).length;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <Card
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => { setSelectedPipeline(p); setSelectedPlan("plan_a"); setRejectMode(false); }}
                    >
                      <CardContent className="py-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{p.patient_name}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {template && (
                              <Badge variant="secondary" className="text-xs">
                                {template.name} • {template.base_calories}kcal
                              </Badge>
                            )}
                            {altCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                +{altCount} alternativa{altCount > 1 ? "s" : ""}
                              </Badge>
                            )}
                            {p.weight && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Scale className="w-3 h-3" /> {p.weight}kg
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* ── Detail view ── */
            <div className="space-y-5 py-2">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedPipeline(null); setRejectMode(false); }}>
                ← Voltar à lista
              </Button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{selectedPipeline.patient_name}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {selectedPipeline.weight && <span>Peso: {selectedPipeline.weight}kg</span>}
                    {selectedPipeline.height && <span>• Altura: {selectedPipeline.height}cm</span>}
                    {selectedPipeline.meal_count && <span>• {selectedPipeline.meal_count} refeições/dia</span>}
                  </div>
                </div>
              </div>

              {/* Explainability summary */}
              {(() => {
                const ex = selectedPipeline.generated_plan_data?.explainability;
                if (!ex) return null;
                const calc = ex.calculation || {};
                const profile = ex.patient_profile || {};
                const macros = ex.macros || {};
                return (
                  <Card className="bg-muted/30">
                    <CardContent className="py-3 space-y-2 text-sm">
                      <p className="font-semibold flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                        <Target className="w-4 h-4" /> Análise do Protocolo
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Objetivo:</span> <strong>{profile.goal}</strong></div>
                        <div><span className="text-muted-foreground">TMB:</span> <strong>{calc.tmb} kcal</strong></div>
                        <div><span className="text-muted-foreground">TDEE:</span> <strong>{calc.tdee} kcal</strong></div>
                        <div><span className="text-muted-foreground">Meta:</span> <strong className="text-primary">{calc.final_kcal} kcal/dia</strong></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-1.5 rounded bg-background"><span className="text-muted-foreground">P:</span> <strong>{macros.protein}g</strong></div>
                        <div className="text-center p-1.5 rounded bg-background"><span className="text-muted-foreground">C:</span> <strong>{macros.carbs}g</strong></div>
                        <div className="text-center p-1.5 rounded bg-background"><span className="text-muted-foreground">G:</span> <strong>{macros.fat}g</strong></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {!rejectMode ? (
                <>
                  {/* Info card */}
                  {selectedPipeline.generated_plan_id ? (
                    <Card className="border-dashed border-primary/40 bg-primary/5">
                      <CardContent className="py-3 text-center text-sm text-muted-foreground space-y-1">
                        <Sparkles className="w-4 h-4 inline mr-1 text-primary" />
                        Plano gerado com sucesso. Clique em <strong>"Analisar e Editar"</strong> para revisar, fazer ajustes e depois aprovar diretamente no editor.
                      </CardContent>
                    </Card>
                  ) : selectedPipeline.generated_plan_data ? (
                    <Card className="border-dashed border-primary/40 bg-primary/5">
                      <CardContent className="py-3 text-center text-sm text-muted-foreground space-y-1">
                        <Sparkles className="w-4 h-4 inline mr-1 text-primary" />
                        Plano gerado com sucesso. Clique em <strong>"Criar e Editar Plano"</strong> para criar o plano no sistema e editá-lo antes de aprovar.
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-dashed border-amber-500/40 bg-amber-500/5">
                      <CardContent className="py-3 text-center text-sm text-muted-foreground">
                        <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-500" />
                        Plano ainda não foi gerado. Rejeite ou aguarde a geração automática.
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                /* Reject form */
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-destructive">Rejeitar plano de {selectedPipeline.patient_name}</p>
                  <div className="space-y-2">
                    <Label>Motivo da rejeição</Label>
                    <Textarea
                      placeholder="Ex: Necessário ajustar calorias, dados inconsistentes..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setRejectMode(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectReason.trim()} className="flex-1">
                      {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Confirmar Rejeição
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* ── Sticky action buttons at bottom ── */}
        {selectedPipeline && !rejectMode && (
          <div className="border-t pt-4 -mx-6 px-6 flex gap-3">
            {selectedPipeline.generated_plan_id ? (
              <Button
                className="flex-1 gradient-primary shadow-glow"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/meal-plans/${selectedPipeline.generated_plan_id}`);
                }}
              >
                <FileText className="w-4 h-4 mr-2" /> Analisar e Editar o Plano
              </Button>
            ) : selectedPipeline.generated_plan_data ? (
              <Button
                className="flex-1 gradient-primary shadow-glow"
                disabled={processing}
                onClick={async () => {
                  await handleCreateAndEdit();
                }}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                Criar e Editar Plano
              </Button>
            ) : null}
            <Button variant="destructive" onClick={() => setRejectMode(true)} disabled={processing}>
              <XCircle className="w-4 h-4 mr-2" /> Rejeitar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Hook to check for pending approvals count */
export function usePendingApprovals() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { count: c } = await supabase
        .from("onboarding_pipelines" as any)
        .select("id", { count: "exact", head: true })
        .eq("nutritionist_id", user.id)
        .eq("status", "pending_approval");
      setCount(c || 0);
    };
    check();

    const ch = supabase
      .channel("pending-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "onboarding_pipelines" }, () => check())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return count;
}
