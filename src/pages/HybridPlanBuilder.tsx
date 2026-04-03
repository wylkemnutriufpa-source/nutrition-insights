import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import { supabase } from "@/integrations/supabase/client";
import { publishMealPlan, savePlanAsApproved } from "@/lib/serverTransitions";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BuilderTopbar from "@/components/hybrid-builder/BuilderTopbar";
import MealPlanCanvas from "@/components/hybrid-builder/MealPlanCanvas";
import BuilderLibraryPanel from "@/components/hybrid-builder/BuilderLibraryPanel";
import ClinicalMacroPanel from "@/components/hybrid-builder/ClinicalMacroPanel";
import GenerationModeSelector from "@/components/hybrid-builder/GenerationModeSelector";
import { ValidationCorrectionPanel, type ValidationResult } from "@/components/meal-editor-v2/ValidationCorrectionPanel";
import { usePatientComposerContext } from "@/hooks/usePatientComposerContext";
import type { ComposerMode } from "@/lib/mealComposer";

import { Loader2, AlertTriangle, PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MealType } from "@/stores/mealPlanEditorV2Store";

export default function HybridPlanBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const store = useMealPlanEditorV2Store();

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("quick");

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Hydrate store
  useEffect(() => {
    if (id && user?.id) {
      store.hydrate(id, user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  // Loading
  const storeReady = store.planId === id && store.hydrated && !store.hydrating;
  if (!storeReady) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (store.hydrated && !store.plan) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 space-y-4">
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Plano não encontrado.</p>
          <Button variant="ghost" onClick={() => navigate("/meal-plans")}>Voltar</Button>
        </div>
      </DashboardLayout>
    );
  }

  const plan = store.plan!;

  // Handlers
  const handleSave = async () => {
    setSaving(true);
    try {
      await store._flushQueue();
      const result = await savePlanAsApproved(plan.id, user!.id);
      if (!result.success) throw new Error(result.error || "Erro ao salvar");
      store.updatePlan({ plan_status: "approved", updated_at: new Date().toISOString() } as any);
      toast.success("Plano salvo!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("validate-meal-plan", { body: { meal_plan_id: plan.id } });
      if (error) throw error;
      const nextStatus = data?.overall_status || (data?.success ? "aprovado" : "sugestoes_pendentes");
      store.updatePlan({
        overall_validation_status: nextStatus,
        overall_score: typeof data?.score === "number" ? data.score : plan.overall_score,
        last_validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
      await store.hydrate(plan.id, user?.id ?? "");
      if (!data?.success) {
        setValidationResult(data as ValidationResult);
        toast.info("Sugestões de melhoria disponíveis");
      } else {
        toast.success("Plano válido! ✅");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro na validação");
    }
    setValidating(false);
  };

  const handlePublish = async () => {
    if (!user) return;
    const vs = plan.overall_validation_status;
    if (!vs || vs !== "aprovado") {
      const proceed = confirm("⚠️ Plano não validado. Publicar mesmo assim?");
      if (!proceed) return;
    }
    setPublishing(true);
    try {
      await store._flushQueue();
      const result = await publishMealPlan(plan.id, user.id);
      if (!result.success) {
        const rpcData = result.data as Record<string, unknown> | undefined;
        const errorCode = rpcData?.error as string | undefined;
        if (errorCode === "VALIDATION_REQUIRED") toast.error("Validação obrigatória!");
        else if (errorCode === "EMPTY_PLAN") toast.error("Plano sem refeições!");
        else throw new Error((rpcData?.message as string) || result.error || "Erro");
        return;
      }
      store.updatePlan({ plan_status: "published_to_patient", is_active: true, updated_at: new Date().toISOString() } as any);
      toast.success("✅ Plano publicado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao publicar");
    } finally {
      setPublishing(false);
    }
  };

  // DnD handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    if (!overId.startsWith("slot-")) return;

    const [, dayStr, ...mealParts] = overId.split("-");
    const day = parseInt(dayStr);
    const mealType = mealParts.join("-") as MealType;

    const dragData = active.data?.current;
    if (!dragData) return;

    if (dragData.type === "food") {
      const { food } = dragData;
      const computed = food.computed;
      store.addItem({
        meal_plan_id: plan.id,
        title: food.food_name,
        description: `${food.food_name} ${computed.qty}g`,
        day_of_week: day,
        meal_type: mealType,
        calories_target: computed.kcal,
        protein_target: computed.prot,
        carbs_target: computed.carbs,
        fat_target: computed.fat,
        item_origin: "builder_drag",
        tenant_id: tenantId || null,
      });
      toast.success(`${food.food_name} adicionado!`);
    } else if (dragData.type === "recipe") {
      const { recipe } = dragData;
      store.addItem({
        meal_plan_id: plan.id,
        title: recipe.title,
        description: recipe.title,
        day_of_week: day,
        meal_type: mealType,
        calories_target: recipe.calories_per_serving || 0,
        protein_target: recipe.protein_per_serving || 0,
        carbs_target: recipe.carbs_per_serving || 0,
        fat_target: recipe.fat_per_serving || 0,
        image_url: recipe.image_url || null,
        item_origin: "builder_drag_recipe",
        tenant_id: tenantId || null,
      });
      toast.success(`Receita "${recipe.title}" adicionada!`);
    }
  };

  return (
    <DashboardLayout>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="space-y-3">
          {/* Topbar */}
          <BuilderTopbar
            patientName={store.patientName}
            saving={saving}
            publishing={publishing}
            validating={validating}
            onBack={() => navigate("/meal-plans")}
            onSave={handleSave}
            onValidate={handleValidate}
            onPublish={handlePublish}
          />

          {/* Validation panel */}
          {validationResult && !validationResult.success && (
            <ValidationCorrectionPanel
              result={validationResult}
              onClose={() => setValidationResult(null)}
              onCorrectionApplied={handleSave}
            />
          )}

          {/* Main layout: Library | Canvas | Clinical Panel */}
          <div className="flex gap-3 min-h-[600px]">
            {/* Left: Library */}
            {leftPanelOpen ? (
              <div className="w-72 shrink-0 border border-border rounded-xl bg-card/50 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-2 border-b border-border">
                  <span className="text-xs font-bold">📚 Biblioteca</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLeftPanelOpen(false)}>
                    <PanelLeftOpen className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <BuilderLibraryPanel />
              </div>
            ) : (
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 self-start" onClick={() => setLeftPanelOpen(true)}>
                <PanelLeftOpen className="w-4 h-4" />
              </Button>
            )}

            {/* Center: Canvas */}
            <MealPlanCanvas />

            {/* Right: Clinical + Generation */}
            {rightPanelOpen ? (
              <div className="w-64 shrink-0 border border-border rounded-xl bg-card/50 overflow-hidden">
                <div className="flex items-center justify-between p-2 border-b border-border">
                  <span className="text-xs font-bold">🧠 Painel</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRightPanelOpen(false)}>
                    <PanelRightOpen className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <ScrollArea className="h-[calc(100%-40px)]">
                  <div className="p-3 space-y-6">
                    <ClinicalMacroPanel />
                    <div className="border-t border-border pt-4">
                      <GenerationModeSelector
                        patientId={plan.patient_id}
                        onGenerated={() => {}}
                      />
                    </div>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 self-start" onClick={() => setRightPanelOpen(true)}>
                <PanelRightOpen className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DndContext>
    </DashboardLayout>
  );
}
