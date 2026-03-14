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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

  async function handleApprove() {
    if (!selectedPipeline || !user) return;
    setProcessing(true);

    const isAlternative = selectedPlan !== "plan_a";
    const alternatives = getAlternatives(selectedPipeline);
    const altIndex = isAlternative ? parseInt(selectedPlan.replace("plan_alt_", "")) : -1;
    const chosenAlt = isAlternative && altIndex >= 0 ? alternatives[altIndex] : null;

    // If user chose an alternative, we need to regenerate the plan with that template
    if (chosenAlt && selectedPipeline.generated_plan_id) {
      // Update the meal plan with the alternative template info
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
        .eq("id", selectedPipeline.generated_plan_id);
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

    // Approve + publish the meal plan
    if (selectedPipeline.generated_plan_id) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      await supabase
        .from("meal_plans")
        .update({ plan_status: "approved" } as any)
        .eq("id", selectedPipeline.generated_plan_id);

      await supabase
        .from("meal_plans")
        .update({
          is_active: true,
          plan_status: "published_to_patient",
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
        } as any)
        .eq("id", selectedPipeline.generated_plan_id);
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
    setProcessing(false);

    if (pipelines.length <= 1) onOpenChange(false);
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
            /* ── Detail view with Plan A / Plan B selection ── */
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
                  {/* Plan selection */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Escolha o plano para {selectedPipeline.patient_name}:
                    </p>

                    <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="space-y-2">
                      {/* Plan A - Selected template */}
                      {(() => {
                        const selected = getSelectedTemplate(selectedPipeline);
                        if (!selected) return null;
                        return (
                          <Label
                            htmlFor="plan_a"
                            className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedPlan === "plan_a"
                                ? "border-primary bg-primary/5"
                                : "border-muted hover:border-muted-foreground/30"
                            }`}
                          >
                            <RadioGroupItem value="plan_a" id="plan_a" className="mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">Opção A — {selected.name}</span>
                                <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                  Recomendado
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {selected.base_calories} kcal • Score: {selected.score} pontos
                              </p>
                              {selected.reasons?.map((r: string, i: number) => (
                                <span key={i} className="text-xs text-muted-foreground block mt-0.5">✓ {r}</span>
                              ))}
                            </div>
                          </Label>
                        );
                      })()}

                      {/* Plan B, C... - Alternative templates */}
                      {getAlternatives(selectedPipeline).map((alt: any, idx: number) => {
                        const value = `plan_alt_${idx}`;
                        const letter = String.fromCharCode(66 + idx); // B, C, D...
                        return (
                          <Label
                            key={value}
                            htmlFor={value}
                            className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedPlan === value
                                ? "border-primary bg-primary/5"
                                : "border-muted hover:border-muted-foreground/30"
                            }`}
                          >
                            <RadioGroupItem value={value} id={value} className="mt-0.5" />
                            <div className="flex-1">
                              <span className="font-semibold">Opção {letter} — {alt.name}</span>
                              <p className="text-xs text-muted-foreground mt-1">
                                {alt.base_calories} kcal • Score: {alt.score} pontos
                              </p>
                              {alt.reasons?.map((r: string, i: number) => (
                                <span key={i} className="text-xs text-muted-foreground block mt-0.5">✓ {r}</span>
                              ))}
                            </div>
                          </Label>
                        );
                      })}
                    </RadioGroup>
                  </div>

                  {/* Primary: Analyze/Edit plan buttons */}
                  {selectedPipeline.generated_plan_id ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="w-full border-primary/50 text-primary hover:bg-primary/10"
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/meal-plans/${selectedPipeline.generated_plan_id}`);
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" /> Editar Plano
                      </Button>
                      <Button variant="outline" className="w-full border-primary/50 text-primary hover:bg-primary/10" asChild>
                        <a href={`/meal-plans/${selectedPipeline.generated_plan_id}`} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4 mr-2" /> Analisar em Nova Aba
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <Card className="border-dashed border-amber-500/40 bg-amber-500/5">
                      <CardContent className="py-3 text-center text-sm text-muted-foreground">
                        <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-500" />
                        Plano ainda não foi gerado. Aprove para gerar automaticamente ou crie manualmente.
                      </CardContent>
                    </Card>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleApprove} className="flex-1" disabled={processing}>
                      {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Aprovar {selectedPlan === "plan_a" ? "Opção A" : `Opção ${String.fromCharCode(66 + parseInt(selectedPlan.replace("plan_alt_", "")))}`}
                    </Button>
                    <Button variant="destructive" onClick={() => setRejectMode(true)} disabled={processing}>
                      <XCircle className="w-4 h-4 mr-2" /> Rejeitar
                    </Button>
                  </div>
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
