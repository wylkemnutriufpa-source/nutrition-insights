import { useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2, Wand2, AlertTriangle, CheckCircle2, Flame, Beef, Wheat, Droplets, Info,
} from "lucide-react";
import { toast } from "sonner";
import { useMealPlanEditorV2Store, type MealPlanItem, type MealPlan } from "@/stores/mealPlanEditorV2Store";
import {
  generateMealPlanFromLibrary,
  loadPatientProfile,
  slotsToInserts,
  setGenerationSeed,
  type PatientProfile,
  type AutoGenerationResult,
  type MealDistribution,
} from "@/lib/mealPlanAutoGenerator";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GOAL_LABELS: Record<string, string> = {
  weight_loss: "Emagrecimento",
  hypertrophy: "Hipertrofia",
  low_carb: "Low Carb",
  metabolic: "Metabólico",
  functional: "Funcional",
  maintenance: "Manutenção",
};

const DEFAULT_DIST: MealDistribution = {
  breakfast: 0.20,
  morning_snack: 0.10,
  lunch: 0.30,
  afternoon_snack: 0.10,
  dinner: 0.22,
  evening_snack: 0.08,
};

export function AutoGenerateModal({ open, onOpenChange }: Props) {
  const { plan, planId, addItems, items: currentItems } = useMealPlanEditorV2Store();
  const [step, setStep] = useState<"config" | "generating" | "preview">("config");
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [result, setResult] = useState<AutoGenerationResult | null>(null);

  // Overridable fields
  const [goal, setGoal] = useState("weight_loss");
  const [planType, setPlanType] = useState<"normal" | "marmita">("normal");
  const [targetKcal, setTargetKcal] = useState(2000);
  const [targetProtein, setTargetProtein] = useState(120);
  const [targetCarbs, setTargetCarbs] = useState(250);
  const [targetFat, setTargetFat] = useState(60);
  const [rejectedFoods, setRejectedFoods] = useState("");

  // Load patient profile when modal opens
  const handleLoadProfile = useCallback(async () => {
    if (!plan?.patient_id) return;
    setLoadingProfile(true);
    const p = await loadPatientProfile(plan.patient_id);
    if (p) {
      setProfile(p);
      setGoal(p.goal);
      setPlanType(p.planType || "normal");
      setTargetKcal(p.targetCalories);
      setTargetProtein(p.targetProtein);
      setTargetCarbs(p.targetCarbs);
      setTargetFat(p.targetFat);
      setRejectedFoods(p.rejectedFoods.join(", "));
      if (!p.clinicalTags?.length && p.goal === "maintenance") {
        toast.info("Dados básicos carregados a partir da avaliação física. Para personalização completa, peça ao paciente para preencher a anamnese.");
      } else {
        toast.success("Dados da anamnese carregados com sucesso!");
      }
    } else {
      toast.info(
        "Nenhuma anamnese ou avaliação encontrada para este paciente. " +
        "Configure os valores manualmente abaixo — objetivo, calorias, macros e restrições. " +
        "Você pode gerar o plano normalmente!",
        { duration: 6000 }
      );
    }
    setLoadingProfile(false);
  }, [plan?.patient_id]);

  const handleGenerate = useCallback(async () => {
    if (!planId) return;
    setStep("generating");

    const profileInput: PatientProfile = {
      patientId: plan?.patient_id || "",
      goal,
      planType,
      targetCalories: targetKcal,
      targetProtein,
      targetCarbs,
      targetFat,
      restrictions: [],
      rejectedFoods: rejectedFoods.split(",").map((s) => s.trim()).filter(Boolean),
      clinicalTags: profile?.clinicalTags || [],
      weight: profile?.weight,
    };

    // 100% Deterministic: Seed with patient ID only (no timestamp)
    setGenerationSeed(plan?.patient_id || "", 0);
    console.warn("[PLAN] chamando generateMealPlanFromLibrary");
    let res;
    try {
      res = await generateMealPlanFromLibrary(profileInput, DEFAULT_DIST);
    } catch (e: any) {
      console.warn("[RECOVERY] Erro no motor principal, forçando fallback manual");
      // Importante: generateMealPlanFromLibrary já tenta o fallback interno, 
      // mas se der erro de código, aqui temos uma última linha de defesa.
      throw e; 
    }
    
    console.warn("[PLAN] resposta do gerador", res);
    setResult(res);
    setStep("preview");

    if (res.warnings.length > 0) {
      toast.warning(`${res.warnings.length} aviso(s) durante geração`);
    }
  }, [planId, plan?.patient_id, goal, planType, targetKcal, targetProtein, targetCarbs, targetFat, rejectedFoods, profile]);

  const handleApply = useCallback(async () => {
    if (!result || !planId) return;

    // Guard: block application on approved/published plans
    const currentStatus = plan?.plan_status;
    if (currentStatus === "approved" || currentStatus === "published" || currentStatus === "published_to_patient") {
      toast.error("Plano já aprovado/publicado. Crie um novo plano ou duplique antes de regenerar.");
      return;
    }

    try {
      // 1. Generate inserts from generated slots
      console.warn("[PLAN] iniciando aplicação ao plano");
      const inserts = await slotsToInserts(result.slots, planId);
      console.warn("[PLAN] itens para salvar:", inserts.length);

      if (inserts.length < 3) {
        console.error("[PLAN] Interrompendo salvamento: plano incompleto");
        throw new Error("Plano inválido: geração incompleta");
      }

      // Guard: block empty generation
      if (!inserts || inserts.length === 0) {
        toast.error("Nenhuma refeição foi gerada. Verifique os dados do paciente e tente novamente.");
        return;
      }

      // 2. Insert new items FIRST (safe: if this fails, old plan remains intact)
      console.warn("[PLAN] inserindo itens no banco");
      const { data: savedItems, error: insertError } = await supabase
        .from("meal_plan_items")
        .insert(inserts)
        .select();

      if (insertError) {
        console.error("[PLAN] erro na inserção", insertError);
        console.error("[AutoGenerate] Insert error:", insertError);
        toast.error("Erro ao salvar refeições geradas: " + insertError.message);
        return;
      }

      // 3. Only NOW delete old items (plan is never empty)
      const existingIds = currentItems.filter((i) => !i.id.startsWith("temp-")).map((i) => i.id);
      if (existingIds.length > 0) {
        if (!planId) {
          console.error("[CRITICAL] DELETE bloqueado: planId inválido em handleApply (AutoGenerate)", { existingIds });
          throw new Error("DELETE bloqueado: planId inválido");
        }
        
        console.info("[DELETE] Limpando itens existentes antes de aplicar plano gerado", { planId, existingIds, operation: "handleApplyAutoGenerate" });
        
        await supabase
          .from("meal_plan_items")
          .delete()
          .eq("meal_plan_id", planId)
          .in("id", existingIds);
      }

      // 4. Update store with real persisted items
      useMealPlanEditorV2Store.setState({
        items: (savedItems || []) as MealPlanItem[],
        pendingOps: [],
        syncStatus: "saved",
        lastSavedAt: Date.now(),
      });

      // 5. Update plan status + metadata
      await supabase
        .from("meal_plans")
        .update({
          plan_status: "draft_auto_generated",
          plan_type: planType,
          generation_source: "meal_library_engine",
          generation_metadata: result.metadata as unknown as Json,
          updated_at: new Date().toISOString(),
          editor_version: "v2", // OBRIGATÓRIO: Mantém o plano no Editor V2
        })
        .eq("id", planId);

      useMealPlanEditorV2Store.getState().updatePlan({
        plan_status: "draft_auto_generated",
        plan_type: planType,
        generation_source: "meal_library_engine",
        generation_metadata: result.metadata as unknown as Json,
        updated_at: new Date().toISOString(),
      } as Partial<MealPlan>);

      // 6. Persist snapshot to sessionStorage
      useMealPlanEditorV2Store.getState()._persistSnapshot();

      console.warn("[PLAN] plano aplicado e sincronizado com sucesso");
      toast.success(`Plano gerado com ${savedItems?.length || 0} refeições! Revise e salve.`);
    } catch (err: any) {
      console.error("[AutoGenerate] Error:", err);
      toast.error("Erro ao aplicar plano: " + (err?.message || "Tente novamente"));
      return;
    }

    onOpenChange(false);
    setStep("config");
    setResult(null);
  }, [result, planId, plan?.plan_status, currentItems, onOpenChange]);

  const handleClose = () => {
    onOpenChange(false);
    setStep("config");
    setResult(null);
  };

  // Daily summary from result
  const daySummary = result?.slots.reduce((acc, s) => {
    if (!acc[s.day]) acc[s.day] = { kcal: 0, p: 0, c: 0, f: 0, count: 0 };
    acc[s.day].kcal += s.targetKcal;
    acc[s.day].p += Math.round(s.libraryItem.protein * s.scaleFactor);
    acc[s.day].c += Math.round(s.libraryItem.carbs * s.scaleFactor);
    acc[s.day].f += Math.round(s.libraryItem.fat * s.scaleFactor);
    acc[s.day].count += 1;
    return acc;
  }, {} as Record<number, { kcal: number; p: number; c: number; f: number; count: number }>);

  const dayLabels = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wand2 className="w-4 h-4 text-primary" />
            Gerar Plano Automático
          </DialogTitle>
          <DialogDescription className="text-xs">
            Motor determinístico v1.0 — monta Plano Único (Dia 0) a partir da biblioteca clínica
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 px-5 py-4 overflow-y-auto scrollbar-thin">
          {step === "config" && (
            <div className="space-y-4">
              {/* Load from anamnesis */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                <div className="text-xs">
                  <p className="font-medium">Carregar dados da anamnese</p>
                  <p className="text-muted-foreground">Preenche objetivo, macros e restrições</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleLoadProfile} disabled={loadingProfile}>
                  {loadingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Carregar"}
                </Button>
              </div>

              {profile && (
                <div className="flex items-center gap-1.5 text-[10px] text-green-600">
                  <CheckCircle2 className="w-3 h-3" /> Dados carregados da anamnese
                </div>
              )}

              {/* Goal */}
              <div className="space-y-1.5">
                <Label className="text-xs">Objetivo</Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GOAL_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Plan Type */}
              <div className="space-y-1.5">
                <Label className="text-xs">Modelo de Dieta</Label>
                <Select value={planType} onValueChange={(v: any) => setPlanType(v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Alimentação Normal (Avulso)</SelectItem>
                    <SelectItem value="marmita">Modelo Marmitaria (Refeição Pronta)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" /> Calorias/dia
                  </Label>
                  <Input type="number" value={targetKcal} onChange={(e) => setTargetKcal(Number(e.target.value))} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Beef className="w-3 h-3 text-red-400" /> Proteína (g)
                  </Label>
                  <Input type="number" value={targetProtein} onChange={(e) => setTargetProtein(Number(e.target.value))} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Wheat className="w-3 h-3 text-amber-500" /> Carboidratos (g)
                  </Label>
                  <Input type="number" value={targetCarbs} onChange={(e) => setTargetCarbs(Number(e.target.value))} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-blue-400" /> Gordura (g)
                  </Label>
                  <Input type="number" value={targetFat} onChange={(e) => setTargetFat(Number(e.target.value))} className="h-8 text-sm" />
                </div>
              </div>

              {/* Rejected foods */}
              <div className="space-y-1">
                <Label className="text-xs">Alimentos rejeitados (separar por vírgula)</Label>
                <Input
                  value={rejectedFoods}
                  onChange={(e) => setRejectedFoods(e.target.value)}
                  placeholder="Ex: fígado, beterraba, chuchu"
                  className="h-8 text-sm"
                />
              </div>

              {/* Distribution info */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border text-[10px] space-y-1">
                <p className="font-medium flex items-center gap-1">
                  <Info className="w-3 h-3" /> Distribuição calórica padrão
                </p>
                <div className="grid grid-cols-3 gap-1 text-muted-foreground">
                  <span>Café: 20%</span>
                  <span>Lanche M: 10%</span>
                  <span>Almoço: 30%</span>
                  <span>Lanche T: 10%</span>
                  <span>Jantar: 22%</span>
                  <span>Ceia: 8%</span>
                </div>
              </div>
            </div>
          )}

          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Gerando plano semanal…</p>
              <p className="text-xs text-muted-foreground">Selecionando refeições • Aplicando escala • Validando diversidade</p>
            </div>
          )}

          {step === "preview" && result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">
                  {result.slots.length} refeições geradas para Plano Único (Dia 0)
                </span>
              </div>

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 space-y-1">
                  {result.warnings.map((w, i) => (
                    <p key={i} className="text-[10px] text-yellow-700 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Daily breakdown */}
              <div className="space-y-2">
                <p className="text-xs font-semibold">Resumo por dia</p>
                {daySummary && Object.entries(daySummary).map(([day, d]) => (
                  <div key={day} className="flex items-center justify-between text-[11px] p-2 rounded bg-muted/40 border border-border">
                    <span className="font-medium w-10">{dayLabels[Number(day)]}</span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" /> {d.kcal}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Beef className="w-2.5 h-2.5 text-red-400" /> {d.p}g
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Wheat className="w-2.5 h-2.5 text-amber-500" /> {d.c}g
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Droplets className="w-2.5 h-2.5 text-blue-400" /> {d.f}g
                    </span>
                    <Badge variant="outline" className="text-[8px] h-4">{d.count} ref</Badge>
                  </div>
                ))}
              </div>

              {/* Metadata */}
              <div className="p-2 rounded-lg bg-muted/20 border border-border text-[9px] text-muted-foreground space-y-0.5">
                <p>Engine: v{result.metadata.engine_version} • {result.metadata.algorithm}</p>
                <p>Biblioteca: {result.metadata.total_library_items} itens → {result.metadata.items_after_filter} filtrados</p>
                <p>Diversidade: {result.metadata.diversity_enforced ? "✓ aplicada" : "⚠ relaxada"}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border gap-2">
          {step === "config" && (
            <>
              <Button variant="ghost" size="sm" onClick={handleClose}>Cancelar</Button>
              <Button size="sm" onClick={handleGenerate} className="gap-1.5">
                <Wand2 className="w-3.5 h-3.5" /> Gerar Plano
              </Button>
            </>
          )}
          {step === "preview" && result?.success && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep("config")}>Voltar</Button>
              <Button size="sm" onClick={handleApply} className="gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aplicar ao Plano
              </Button>
            </>
          )}
          {step === "preview" && !result?.success && (
            <Button variant="ghost" size="sm" onClick={() => setStep("config")}>Voltar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
