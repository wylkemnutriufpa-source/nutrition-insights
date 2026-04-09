import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import { supabase } from "@/integrations/supabase/client";
import { publishMealPlan, savePlanAsApproved } from "@/lib/serverTransitions";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SaveMealTemplateDialog from "@/components/meals/SaveMealTemplateDialog";
import BuilderTopbar from "@/components/hybrid-builder/BuilderTopbar";
import MealPlanCanvas from "@/components/hybrid-builder/MealPlanCanvas";
import BuilderLibraryPanel from "@/components/hybrid-builder/BuilderLibraryPanel";
import ClinicalMacroPanel from "@/components/hybrid-builder/ClinicalMacroPanel";
import PlanAuditPanel from "@/components/plans/PlanAuditPanel";
import GenerationModeSelector from "@/components/hybrid-builder/GenerationModeSelector";
import { ValidationCorrectionPanel, type ValidationResult } from "@/components/meal-editor-v2/ValidationCorrectionPanel";
import { usePatientComposerContext } from "@/hooks/usePatientComposerContext";
import type { ComposerMode } from "@/lib/mealComposer";

import { Loader2, AlertTriangle, PanelLeftOpen, PanelRightOpen, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MealType } from "@/stores/mealPlanEditorV2Store";
import { resolveOverallValidationStatus, runValidateAndFixMealPlan } from "@/lib/mealPlanValidationFlow";

export default function HybridPlanBuilder() {
  // Recipe expansion: load recipe_items → match foods → create individual meal_plan_items
  const expandRecipeToItems = async (
    recipe: { id: string; title: string; calories_per_serving?: number | null; protein_per_serving?: number | null; carbs_per_serving?: number | null; fat_per_serving?: number | null; image_url?: string | null },
    planId: string,
    day: number,
    mealType: MealType,
    tenantIdVal: string | null,
  ) => {
    try {
      // 1. Load recipe_items
      const { data: recipeItems } = await supabase
        .from("recipe_items")
        .select("food_name, grams_reference, display_order")
        .eq("recipe_id", recipe.id)
        .order("display_order");

      if (!recipeItems || recipeItems.length === 0) {
        // Fallback: add as summary item if no recipe_items exist
        store.addItem({
          meal_plan_id: planId,
          title: recipe.title,
          description: recipe.title,
          day_of_week: day,
          meal_type: mealType,
          calories_target: recipe.calories_per_serving || 0,
          protein_target: recipe.protein_per_serving || 0,
          carbs_target: recipe.carbs_per_serving || 0,
          fat_target: recipe.fat_per_serving || 0,
          image_url: recipe.image_url || null,
          item_origin: "builder_drag_recipe" as any,
          tenant_id: tenantIdVal,
        });
        toast.success(`Receita "${recipe.title}" adicionada (resumo)`);
        return;
      }

      // 2. Load all foods for macro matching
      const { data: allFoods } = await supabase
        .from("ifj_food_database")
        .select("food_name, calories_per_gram, protein_per_gram, carbs_per_gram, fat_per_gram")
        .eq("is_active", true);

      const foodsDb = (allFoods || []) as Array<{
        food_name: string;
        calories_per_gram: number | null;
        protein_per_gram: number | null;
        carbs_per_gram: number | null;
        fat_per_gram: number | null;
      }>;

      // 3. Create individual items for each ingredient
      const normalize = (s: string) =>
        s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      const findFood = (name: string) => {
        const n = normalize(name);
        // Exact match first
        let match = foodsDb.find(f => normalize(f.food_name) === n);
        if (match) return match;
        // Contains match
        match = foodsDb.find(f => normalize(f.food_name).includes(n) || n.includes(normalize(f.food_name)));
        if (match) return match;
        // Word match
        const words = n.split(/\s+/).filter(w => w.length >= 4);
        for (const word of words) {
          match = foodsDb.find(f => normalize(f.food_name).includes(word));
          if (match) return match;
        }
        return null;
      };

      const inserts = recipeItems.map((ri) => {
        const grams = Number(ri.grams_reference) || 100;
        const matched = findFood(ri.food_name);
        const kcal = matched ? Math.round((matched.calories_per_gram || 0) * grams) : 0;
        const prot = matched ? Math.round((matched.protein_per_gram || 0) * grams * 10) / 10 : 0;
        const carbs = matched ? Math.round((matched.carbs_per_gram || 0) * grams * 10) / 10 : 0;
        const fat = matched ? Math.round((matched.fat_per_gram || 0) * grams * 10) / 10 : 0;

        return {
          meal_plan_id: planId,
          title: `${ri.food_name}`,
          description: `${ri.food_name} ${grams}g (${recipe.title})`,
          day_of_week: day,
          meal_type: mealType,
          calories_target: kcal,
          protein_target: prot,
          carbs_target: carbs,
          fat_target: fat,
          item_origin: "builder_recipe_item" as any,
          tenant_id: tenantIdVal,
        };
      });

      store.addItems(inserts);
      toast.success(`Receita "${recipe.title}" expandida: ${inserts.length} ingredientes`);
    } catch (err) {
      console.error("Error expanding recipe:", err);
      toast.error("Erro ao expandir receita");
    }
  };
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
  const [unlocking, setUnlocking] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const [activeDragData, setActiveDragData] = useState<{ type: string; label: string } | null>(null);

  // Patient composer context (must be before early returns)
  const patientId = store.plan?.patient_id;
  const { ctx: patientContext } = usePatientComposerContext(patientId || null);

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
  const IMMUTABLE_STATUSES = ["approved", "published", "published_to_patient"];
  const isImmutable = IMMUTABLE_STATUSES.includes(plan.plan_status);

  const handleUnlockForEditing = async () => {
    setUnlocking(true);
    try {
      const { error } = await supabase
        .from("meal_plans")
        .update({ plan_status: "under_professional_review", updated_at: new Date().toISOString() })
        .eq("id", plan.id);
      if (error) throw error;
      store.updatePlan({ plan_status: "under_professional_review", updated_at: new Date().toISOString() } as any);
      toast.success("🔓 Plano desbloqueado para edição!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao desbloquear plano");
    } finally {
      setUnlocking(false);
    }
  };

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
      const outcome = await runValidateAndFixMealPlan({
        planId: plan.id,
        patientId: plan.patient_id,
        userId: user?.id ?? "",
        tenantId,
        flush: store._flushQueue,
      });

      const data = outcome.validationResult;
      const nextStatus = resolveOverallValidationStatus(data);
      store.updatePlan({
        overall_validation_status: nextStatus,
        overall_score: typeof data?.score === "number" ? data.score : plan.overall_score,
        last_validated_at: new Date().toISOString(),
        validation_engine_version: "unified_v5",
        updated_at: new Date().toISOString(),
      } as any);

      if (outcome.kind === "validated") {
        await store.hydrate(plan.id, user?.id ?? "");
        toast.success("Plano válido! ✅");
        return;
      }

      if (outcome.kind === "fixed_and_validated" || outcome.kind === "fixed_but_pending") {
        await store.hydrate(plan.id, user.id);
        if (outcome.kind === "fixed_and_validated") {
          setValidationResult(null);
          toast.success("✅ Plano corrigido e revalidado com sucesso!");
        } else {
          setValidationResult(data as unknown as ValidationResult);
          toast.info("Correção aplicada, mas ainda existem ajustes pendentes.");
        }
        return;
      }

      if (outcome.kind !== "redirect") {
        throw new Error("Fluxo de correção retornou um estado inesperado.");
      }

      toast.success("Plano corrigido salvo como novo draft. Abrindo no editor clínico...");
      navigate(`/meal-plans/${outcome.newPlanId}`, { replace: true });
      return;
    } catch (e: any) {
      toast.error(e.message || "Erro na validação");
    } finally {
      setValidating(false);
    }
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

    if (dragData.type === "existing-item") {
      const { itemId } = dragData;
      if (!itemId) return;
      store.moveItem(itemId, day, mealType);
      toast.success("Refeição movida!");
      return;
    }

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
      expandRecipeToItems(recipe, plan.id, day, mealType, tenantId || null);
    }
  };

  return (
    <DashboardLayout>
      <DndContext
        sensors={sensors}
        onDragStart={(event) => {
          const data = event.active.data?.current;
          if (data?.type === "food") setActiveDragData({ type: "food", label: data.food?.food_name || "Alimento" });
          else if (data?.type === "recipe") setActiveDragData({ type: "recipe", label: data.recipe?.title || "Receita" });
          else if (data?.type === "existing-item") setActiveDragData({ type: "existing-item", label: data.itemTitle || "Refeição" });
        }}
        onDragEnd={(event) => { setActiveDragData(null); handleDragEnd(event); }}
        onDragCancel={() => setActiveDragData(null)}
      >
        <div className="space-y-3">
          {/* Topbar */}
          <BuilderTopbar
            patientName={store.patientName}
            saving={saving}
            publishing={publishing}
            validating={validating}
            onBack={() => plan?.patient_id ? navigate(`/patients/${plan.patient_id}`) : navigate("/meal-plans")}
            onSave={handleSave}
            onValidate={handleValidate}
            onPublish={handlePublish}
            onSaveAsTemplate={() => setSaveTemplateOpen(true)}
            onRename={async (newTitle) => {
              store.updatePlan({ title: newTitle, updated_at: new Date().toISOString() } as any);
              await supabase.from("meal_plans").update({ title: newTitle }).eq("id", plan.id);
              toast.success("Plano renomeado!");
            }}
          />

          {/* Immutable plan banner */}
          {isImmutable && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <Lock className="w-5 h-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Plano publicado — somente leitura</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
                  Planos publicados são protegidos contra alterações. Desbloqueie para editar.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                onClick={handleUnlockForEditing}
                disabled={unlocking}
              >
                {unlocking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                Desbloquear para Edição
              </Button>
            </div>
          )}

          <SaveMealTemplateDialog
            open={saveTemplateOpen}
            onOpenChange={setSaveTemplateOpen}
            items={store.items.map(i => ({
              title: i.title,
              description: i.description,
              calories_target: i.calories_target,
              protein_target: i.protein_target,
              carbs_target: i.carbs_target,
              fat_target: i.fat_target,
            }))}
            mealType={store.items[0]?.meal_type || "breakfast"}
            defaultName={plan.title || ""}
            onSaved={() => toast.success("Plano salvo como modelo!")}
          />

          {/* Validation panel */}
          {validationResult && !validationResult.success && (
            <ValidationCorrectionPanel
              result={validationResult}
              onClose={() => setValidationResult(null)}
              onCorrectionApplied={async () => {
                // Flush pending ops, then auto-revalidate with fresh DB data
                await store._flushQueue();
                await store.hydrate(plan.id, user?.id ?? "");
                try {
                  const { data } = await supabase.functions.invoke("validate-meal-plan", { body: { meal_plan_id: plan.id } });
                  if (data) {
                    const nextStatus = data.overall_status || (data.success ? "aprovado" : "sugestoes_pendentes");
                    store.updatePlan({
                      overall_validation_status: nextStatus,
                      overall_score: typeof data.score === "number" ? data.score : plan.overall_score,
                      last_validated_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    } as any);
                    await store.hydrate(plan.id, user?.id ?? "");
                    if (data.success) {
                      setValidationResult(null);
                      toast.success("✅ Correção aplicada e plano revalidado com sucesso!");
                    } else {
                      setValidationResult(data as ValidationResult);
                      toast.info("Correção aplicada. Ainda há sugestões pendentes.");
                    }
                  }
                } catch {
                  toast.info("Correção salva. Clique em Validar para revalidar.");
                }
              }}
            />
          )}

          {/* Main layout: Library | Canvas | Clinical Panel */}
          <div className="flex gap-3 min-h-[600px]">
            {/* Left: Library */}
            {leftPanelOpen ? (
              <div className="w-72 shrink-0 border border-border rounded-xl bg-card/50 flex flex-col max-h-[calc(100vh-200px)]">
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
            <MealPlanCanvas
              patientContext={patientContext}
              composerMode={composerMode}
              showDropTargets
              onRequestGenerate={() => {
                setRightPanelOpen(true);
                // Scroll generation section into view
                setTimeout(() => {
                  document.getElementById("generation-mode-selector")?.scrollIntoView({ behavior: "smooth" });
                }, 200);
              }}
            />

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
                      <h4 className="text-xs font-bold mb-2">🧠 Auditoria Clínica</h4>
                      <PlanAuditPanel
                        mealPlanId={plan.id}
                        patientId={plan.patient_id}
                        onApproved={() => store.hydrate(plan.id, user?.id ?? "")}
                        onFixed={(newPlanId, inPlace) => {
                          toast.success("✅ Plano corrigido! Recarregando...");
                          setValidationResult(null);
                          if (inPlace) {
                            store.hydrate(plan.id, user?.id ?? "");
                          } else {
                            // Load corrected draft in the same editor instead of navigating away
                            store.hydrate(newPlanId, user?.id ?? "");
                            navigate(`/meal-plans/${newPlanId}`, { replace: true });
                          }
                        }}
                      />
                    </div>
                    <div id="generation-mode-selector" className="border-t border-border pt-4">
                      <GenerationModeSelector
                        patientId={plan.patient_id}
                        onGenerated={() => {
                          setValidationResult(null);
                        }}
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
        <DragOverlay dropAnimation={null}>
          {activeDragData && (
            <div className="px-3 py-2 rounded-lg bg-card border border-primary shadow-lg text-xs font-medium flex items-center gap-2 pointer-events-none">
              <span>{activeDragData.type === "food" ? "🍎" : activeDragData.type === "recipe" ? "🍳" : "🔁"}</span>
              <span className="truncate max-w-[180px]">{activeDragData.label}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </DashboardLayout>
  );
}
