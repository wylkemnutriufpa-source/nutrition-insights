import { useState, useCallback, useEffect } from "react";
import { useTenant } from "@/lib/tenantContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Loader2, Sparkles, AlertTriangle, CheckCircle2, Flame, Beef, Wheat, Droplets,
  Info, ArrowRight, Eye, ChevronLeft, Shield, Target, Zap, Heart, Activity,
  RefreshCw, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { fmtMacro, safeNum } from "@/lib/formatMacros";
import { useMealPlanEditorV2Store, type MealPlanItem, type MealPlan } from "@/stores/mealPlanEditorV2Store";
import { slotsToInserts } from "@/lib/mealPlanAutoGenerator";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  loadPatientContext,
  generateAssistedPlan,
  checkKcalCoherence,
  type AssistedPlanParams,
  type PatientContext,
  type AssistedGenerationResult,
  type GeneratedPlanOption,
  type GeneratedSlotWithSubs,
  type ComplexityTier,
  type PlanFocus,
  type ProteinLevel,
} from "@/lib/assistedPlanGenerator";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "params" | "generating" | "options" | "preview";

const GOAL_LABELS: Record<string, string> = {
  weight_loss: "Emagrecimento",
  hypertrophy: "Hipertrofia",
  low_carb: "Low Carb",
  metabolic: "Metabólico",
  functional: "Funcional",
  maintenance: "Manutenção",
};

const FOCUS_OPTIONS: { value: PlanFocus; label: string; icon: typeof Heart }[] = [
  { value: "aderencia", label: "Aderência", icon: Heart },
  { value: "emagrecimento", label: "Emagrecimento", icon: Target },
  { value: "performance", label: "Performance", icon: Activity },
  { value: "praticidade", label: "Praticidade", icon: Zap },
  { value: "clinico", label: "Clínico", icon: Shield },
];

const TIER_ICONS: Record<ComplexityTier, { emoji: string; color: string }> = {
  easy: { emoji: "🟢", color: "border-green-500/30 bg-green-500/5" },
  balanced: { emoji: "🟡", color: "border-amber-500/30 bg-amber-500/5" },
  elaborate: { emoji: "🔵", color: "border-blue-500/30 bg-blue-500/5" },
};

const DAY_LABELS = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function AssistedPlanModal({ open, onOpenChange }: Props) {
  const { plan, planId, items: currentItems } = useMealPlanEditorV2Store();
  const { tenantId } = useTenant();
  const [step, setStep] = useState<Step>("params");
  const [context, setContext] = useState<PatientContext | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(false);
  const [result, setResult] = useState<AssistedGenerationResult | null>(null);
  const [selectedOption, setSelectedOption] = useState<GeneratedPlanOption | null>(null);
  const [applying, setApplying] = useState(false);

  // Params
  const [targetKcal, setTargetKcal] = useState(2000);
  const [mealCount, setMealCount] = useState<3 | 4 | 5 | 6>(5);
  const [subsPerMeal, setSubsPerMeal] = useState<0 | 1 | 2 | 3 | 4>(4);
  const [complexity, setComplexity] = useState<ComplexityTier>("balanced");
  const [focus, setFocus] = useState<PlanFocus>("aderencia");
  const [proteinLevel, setProteinLevel] = useState<ProteinLevel>("moderada");
  const [goal, setGoal] = useState("weight_loss");
  const [planType, setPlanType] = useState<"normal" | "marmita">("normal");
  const [rejectedFoods, setRejectedFoods] = useState("");
  const [showKcalSuggestion, setShowKcalSuggestion] = useState(false);

  // Load patient context on open
  useEffect(() => {
    if (open && plan?.patient_id && !context) {
      setLoadingCtx(true);
      loadPatientContext(plan.patient_id, tenantId).then(ctx => {
        setContext(ctx);
        if (ctx.computedKcal) setTargetKcal(ctx.computedKcal);
        const goalMap: Record<string, string> = {
          emagrecimento: "weight_loss",
          hipertrofia: "hypertrophy",
          manutencao: "maintenance",
          funcional: "functional",
          performance: "hypertrophy",
        };
        const detectedGoal = goalMap[ctx.objective] || "maintenance";
        setGoal(detectedGoal);
        setLoadingCtx(false);
      }).catch(() => setLoadingCtx(false));
    }
  }, [open, plan?.patient_id]);

  const handleGenerate = useCallback(async () => {
    if (!context) return;
    setStep("generating");

    const params: AssistedPlanParams = {
      targetKcal,
      mealCount,
      substitutionsPerMeal: subsPerMeal,
      complexity,
      focus,
      proteinLevel,
      rejectedFoods: rejectedFoods.split(",").map(s => s.trim()).filter(Boolean),
      goal,
      planType,
    };

    const res = await generateAssistedPlan(params, context);
    setResult(res);
    setStep("options");

    if (res.kcalSuggestion.hasConflict) {
      setShowKcalSuggestion(true);
    }
    if (res.warnings.length > 0) {
      toast.warning(`${res.warnings.length} aviso(s) durante geração`);
    }
  }, [context, targetKcal, mealCount, subsPerMeal, complexity, focus, proteinLevel, rejectedFoods, goal, planType]);

  const handleApply = useCallback(async () => {
    if (!selectedOption || !planId) return;

    const currentStatus = plan?.plan_status;
    if (currentStatus === "approved" || currentStatus === "published" || currentStatus === "published_to_patient") {
      toast.error("Plano já aprovado/publicado. Crie um novo plano ou duplique antes de regenerar.");
      return;
    }

    setApplying(true);

    try {
      const inserts = await slotsToInserts(selectedOption.slots, planId);

      if (!inserts || inserts.length === 0) {
        toast.error("Nenhuma refeição foi gerada. Verifique os dados e tente novamente.");
        setApplying(false);
        return;
      }

      const { data: savedItems, error: insertError } = await supabase
        .from("meal_plan_items")
        .insert(inserts)
        .select();

      if (insertError) throw insertError;

      const existingIds = currentItems
        .filter(i => !i.id.startsWith("temp-"))
        .map(i => i.id);
      if (existingIds.length > 0) {
        if (!planId) {
          console.error("[CRITICAL] DELETE bloqueado: planId inválido em handleApply", { existingIds });
          throw new Error("DELETE bloqueado: planId inválido");
        }
        
        console.info("[DELETE] Limpando itens existentes antes de aplicar plano assistido", { planId, existingIds, operation: "handleApplyAssisted" });
        
        await supabase
          .from("meal_plan_items")
          .delete()
          .eq("meal_plan_id", planId)
          .in("id", existingIds);
      }

      useMealPlanEditorV2Store.setState({
        items: (savedItems || []) as MealPlanItem[],
        pendingOps: [],
        syncStatus: "saved",
        lastSavedAt: Date.now(),
      });

      const genMeta = {
        ...selectedOption.metadata,
        applied_option: selectedOption.tier,
        patient_context_snapshot: {
          objective: context?.objective,
          strategy: context?.strategy,
          protocol: context?.protocol,
          flags: context?.clinicalFlags.map(f => f.flag_key),
        },
        kcal_suggestion_accepted: result?.kcalSuggestion.hasConflict
          ? targetKcal === result.kcalSuggestion.suggestedKcal
          : null,
      };

      await supabase
        .from("meal_plans")
        .update({
          plan_status: "draft_auto_generated",
          plan_type: planType,
          generation_source: "assisted_engine_v2",
          generation_metadata: genMeta as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", planId);

      useMealPlanEditorV2Store.getState().updatePlan({
        plan_status: "draft_auto_generated",
        plan_type: planType,
        generation_source: "assisted_engine_v2",
        generation_metadata: genMeta as unknown as Json,
        updated_at: new Date().toISOString(),
      } as Partial<MealPlan>);

      useMealPlanEditorV2Store.getState()._persistSnapshot();

      toast.success(`Plano "${selectedOption.label}" aplicado com ${savedItems?.length || 0} itens!`);
      handleClose();
    } catch (err: any) {
      console.error("[AssistedPlan] Apply error:", err);
      toast.error("Erro ao aplicar: " + (err?.message || "Tente novamente"));
    } finally {
      setApplying(false);
    }
  }, [selectedOption, planId, plan?.plan_status, currentItems, context, result, targetKcal, planType]);

  const handleClose = () => {
    onOpenChange(false);
    setStep("params");
    setResult(null);
    setSelectedOption(null);
    setShowKcalSuggestion(false);
  };

  const hasAnamnesis = !!(context?.computedKcal || context?.objective !== "não definido");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            Gerador Assistido de Plano
          </DialogTitle>
          <DialogDescription className="text-xs">
            Motor clínico v3.0 — gera Plano Único com 4 substituições reais por refeição
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 px-6 py-4 overflow-y-auto scrollbar-thin">
          {step === "params" && (
            <div className="space-y-5">
              {loadingCtx && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando contexto clínico…
                </div>
              )}

              {context && !hasAnamnesis && (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1">
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Paciente sem anamnese concluída
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    O sistema usará valores padrão. Defina manualmente kcal, objetivo e restrições para melhor resultado.
                  </p>
                </div>
              )}

              {context && (
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    Contexto do Paciente — {context.patientName}
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    <span><strong>Objetivo:</strong> {context.objective}</span>
                    <span><strong>Estratégia:</strong> {context.strategy}</span>
                    <span><strong>Protocolo:</strong> {context.protocol}</span>
                    <span><strong>Treino:</strong> {context.trainingLevel}</span>
                    {context.restrictions.length > 0 && (
                      <span className="col-span-2">
                        <strong>Restrições:</strong> {context.restrictions.join(", ")}
                      </span>
                    )}
                    {context.digestiveSymptoms.length > 0 && (
                      <span className="col-span-2 text-amber-600">
                        <strong>Atenção digestiva:</strong> {context.digestiveSymptoms.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-xs font-semibold text-foreground">Parâmetros do Plano</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" /> Calorias/dia
                    </Label>
                    <Input
                      type="number"
                      value={targetKcal}
                      onChange={e => setTargetKcal(Number(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Objetivo</Label>
                    <Select value={goal} onValueChange={setGoal}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(GOAL_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                    <Label className="text-xs">Modelo de Dieta</Label>
                    <Select value={planType} onValueChange={(v: any) => setPlanType(v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Alimentação Normal (Avulso)</SelectItem>
                        <SelectItem value="marmita">Modelo Marmitaria (Refeição Pronta)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nº Refeições</Label>
                    <Select value={String(mealCount)} onValueChange={v => setMealCount(Number(v) as 3 | 4 | 5 | 6)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 refeições</SelectItem>
                        <SelectItem value="4">4 refeições</SelectItem>
                        <SelectItem value="5">5 refeições</SelectItem>
                        <SelectItem value="6">6 refeições</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Substituições</Label>
                    <Select value={String(subsPerMeal)} onValueChange={v => setSubsPerMeal(Number(v) as 0 | 1 | 2 | 3 | 4)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Nenhuma</SelectItem>
                        <SelectItem value="1">1 por refeição</SelectItem>
                        <SelectItem value="2">2 por refeição</SelectItem>
                        <SelectItem value="3">3 por refeição</SelectItem>
                        <SelectItem value="4">4 por refeição</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Proteína</Label>
                    <Select value={proteinLevel} onValueChange={v => setProteinLevel(v as ProteinLevel)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leve">Leve</SelectItem>
                        <SelectItem value="moderada">Moderada</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Foco do Plano</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {FOCUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFocus(opt.value)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                          focus === opt.value
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-muted/50 text-muted-foreground border-border hover:border-primary/30"
                        }`}
                      >
                        <opt.icon className="w-3 h-3" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Alimentos a evitar (separar por vírgula)</Label>
                  <Input
                    value={rejectedFoods}
                    onChange={e => setRejectedFoods(e.target.value)}
                    placeholder="Ex: fígado, beterraba, chuchu"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Gerando 3 opções de plano…</p>
              <p className="text-xs text-muted-foreground">
                Analisando contexto • Pontuando refeições • Gerando substituições
              </p>
            </div>
          )}

          {step === "options" && result && (
            <div className="space-y-4">
              {showKcalSuggestion && result.kcalSuggestion.hasConflict && (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-amber-700">Sugestão Clínica</p>
                      <p className="text-foreground">{result.kcalSuggestion.reason}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-6">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-[11px]"
                      onClick={() => {
                        setTargetKcal(result.kcalSuggestion.suggestedKcal);
                        setShowKcalSuggestion(false);
                        toast.success(`Meta ajustada para ${fmtMacro(result.kcalSuggestion.suggestedKcal)} kcal`);
                        setStep("params");
                      }}
                    >
                      Aplicar {fmtMacro(result.kcalSuggestion.suggestedKcal)} kcal
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => setShowKcalSuggestion(false)}
                    >
                      Manter {fmtMacro(targetKcal)} kcal
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {result.options.map(option => {
                  const tierStyle = TIER_ICONS[option.tier];
                  const isSelected = selectedOption?.tier === option.tier;
                  return (
                    <button
                      key={option.tier}
                      type="button"
                      onClick={() => setSelectedOption(option)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md"
                          : `${tierStyle.color} hover:border-primary/30`
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold flex items-center gap-1.5">
                            {tierStyle.emoji} {option.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{option.description}</p>
                        </div>
                        <Badge
                          variant={isSelected ? "default" : "outline"}
                          className="text-[10px] h-5"
                        >
                          {isSelected ? "Selecionado" : "Selecionar"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mt-3">
                        <div className="text-center p-1.5 rounded bg-background/60">
                          <Flame className="w-3 h-3 text-orange-400 mx-auto" />
                          <p className="text-[11px] font-bold mt-0.5">{option.totalKcal}</p>
                          <p className="text-[8px] text-muted-foreground">kcal/dia</p>
                        </div>
                        <div className="text-center p-1.5 rounded bg-background/60">
                          <Beef className="w-3 h-3 text-red-400 mx-auto" />
                          <p className="text-[11px] font-bold mt-0.5">{option.totalProtein}g</p>
                          <p className="text-[8px] text-muted-foreground">P</p>
                        </div>
                        <div className="text-center p-1.5 rounded bg-background/60">
                          <Wheat className="w-3 h-3 text-amber-500 mx-auto" />
                          <p className="text-[11px] font-bold mt-0.5">{option.totalCarbs}g</p>
                          <p className="text-[8px] text-muted-foreground">C</p>
                        </div>
                        <div className="text-center p-1.5 rounded bg-background/60">
                          <Droplets className="w-3 h-3 text-blue-400 mx-auto" />
                          <p className="text-[11px] font-bold mt-0.5">{option.totalFat}g</p>
                          <p className="text-[8px] text-muted-foreground">G</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === "preview" && selectedOption && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">
                  Pré-visualização: {selectedOption.label} — {selectedOption.slots.length} itens
                </span>
              </div>

              <Tabs defaultValue="1" className="w-full">
                <TabsList className="w-full flex overflow-x-auto">
                  {[1, 2, 3, 4, 5, 6, 7].map(d => (
                    <TabsTrigger key={d} value={String(d)} className="text-[11px] flex-1">
                      {DAY_LABELS[d]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {[1, 2, 3, 4, 5, 6, 7].map(day => {
                  const daySlots = selectedOption.slots.filter(s => s.day === day);
                  return (
                    <TabsContent key={day} value={String(day)} className="space-y-2 mt-2">
                      {daySlots.map((slot, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/30 text-[11px]">
                          <div className="flex-1">
                            <p className="font-medium">{slot.libraryItem.title}</p>
                            <span className="text-[10px] text-muted-foreground">{slot.mealType}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span>{slot.targetKcal} kcal</span>
                            <span>{Math.round(slot.libraryItem.protein * slot.scaleFactor)}g P</span>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="px-6 py-3 border-t border-border gap-2">
          {step === "params" && (
            <>
              <Button variant="ghost" size="sm" onClick={handleClose}>Cancelar</Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={loadingCtx || !context}
                className="gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Gerar 3 Opções
              </Button>
            </>
          )}
          {step === "options" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep("params")}>Voltar</Button>
              <Button
                size="sm"
                onClick={() => setStep("preview")}
                disabled={!selectedOption}
              >
                Visualizar
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep("options")}>Voltar</Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={applying}
              >
                {applying ? "Aplicando..." : "Aplicar ao Plano"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
