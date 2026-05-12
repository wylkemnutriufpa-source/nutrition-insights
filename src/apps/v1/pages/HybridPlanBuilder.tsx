import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DndContext, DragEndEvent, DragMoveEvent, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, pointerWithin, rectIntersection, useSensor, useSensors } from "@dnd-kit/core";
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
import AutoFixResultsModal from "@/components/hybrid-builder/AutoFixResultsModal";
import ValidationModeDialog, { type ValidationMode } from "@/components/hybrid-builder/ValidationModeDialog";
import PublishWarningDialog from "@/components/hybrid-builder/PublishWarningDialog";
import type { AutoFixResult } from "@/lib/autoFixEngine";
import { usePatientComposerContext } from "@/hooks/usePatientComposerContext";
import { logAudit } from "@/lib/auditLog";
import { validateMealPlan } from "@/lib/mealPlanValidationFlow";
import type { ComposerMode } from "@/lib/mealComposer";

import { Loader2, AlertTriangle, PanelLeftOpen, PanelRightOpen, Lock, Unlock, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MealType } from "@/stores/mealPlanEditorV2Store";
import { resolveOverallValidationStatus, runValidateAndFixMealPlan } from "@/lib/mealPlanValidationFlow";
import { QuickAdjustPanel } from "@/components/meal-editor-v2/QuickAdjustPanel";

export default function HybridPlanBuilder() {
  const expandRecipeToItems = async (
    recipe: { id: string; title: string; calories_per_serving?: number | null; protein_per_serving?: number | null; carbs_per_serving?: number | null; fat_per_serving?: number | null; image_url?: string | null },
    planId: string,
    day: number,
    mealType: MealType,
    tenantIdVal: string | null,
    replaceExisting = false,
  ) => {
    try {
      if (replaceExisting) {
        store.deleteItemsInCell(day, mealType);
      }
      const { data: recipeItems } = await supabase
        .from("recipe_items")
        .select("food_name, grams_reference, display_order")
        .eq("recipe_id", recipe.id)
        .order("display_order");

      if (!recipeItems || recipeItems.length === 0) {
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
        toast.success(replaceExisting ? `Refeição substituída por "${recipe.title}"` : `Receita "${recipe.title}" adicionada (resumo)`);
        return;
      }
      const { data: allFoods } = await supabase
        .from("ifj_food_database")
        .select("food_name, calories_per_gram, protein_per_gram, carbs_per_gram, fat_per_gram")
        .eq("is_active", true);

      const foodsDb = (allFoods || []) as any[];
      const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const findFood = (name: string) => {
        const n = normalize(name);
        let match = foodsDb.find(f => normalize(f.food_name) === n);
        if (match) return match;
        match = foodsDb.find(f => normalize(f.food_name).includes(n) || n.includes(normalize(f.food_name)));
        if (match) return match;
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
      toast.success(replaceExisting ? `Refeição substituída por "${recipe.title}"` : `Receita "${recipe.title}" expandida`);
    } catch (err) {
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
  const [autofixResult, setAutofixResult] = useState<AutoFixResult | null>(null);
  const [showAutofixResults, setShowAutofixResults] = useState(false);
  const [autofixWasValid, setAutofixWasValid] = useState(false);
  const [validationModeDialogOpen, setValidationModeDialogOpen] = useState(false);
  const [lockedValidationMode, setLockedValidationMode] = useState<ValidationMode | null>(null);
  const [showPublishWarning, setShowPublishWarning] = useState(false);
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
  const dragStartYRef = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const [activeDragData, setActiveDragData] = useState<{ type: string; label: string } | null>(null);

  const getClientY = (event: any): number | null => {
    if (!event) return null;
    if (Array.isArray(event.touches) && event.touches.length > 0) return event.touches[0]?.clientY ?? null;
    if (typeof event.clientY === "number") return event.clientY;
    return null;
  };

  const autoScrollCanvas = (pointerClientY: number) => {
    const scrollHost = canvasScrollRef.current;
    if (!scrollHost) return;
    const rect = scrollHost.getBoundingClientRect();
    const threshold = 96;
    const step = 32;
    if (pointerClientY >= rect.bottom - threshold) scrollHost.scrollBy({ top: step, behavior: "auto" });
    else if (pointerClientY <= rect.top + threshold) scrollHost.scrollBy({ top: -step, behavior: "auto" });
  };

  const patientId = store.plan?.patient_id;
  const { ctx: patientContext } = usePatientComposerContext(patientId || null);

  useEffect(() => {
    if (id && user?.id) store.hydrate(id, user.id);
  }, [id, user?.id]);

  const storeReady = store.planId === id && store.hydrated && !store.hydrating;
  if (!storeReady) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  if (store.hydrated && !store.plan) return <DashboardLayout><div className="text-center py-20"><p>Plano não encontrado.</p><Button onClick={() => navigate("/meal-plans")}>Voltar</Button></div></DashboardLayout>;

  const plan = store.plan!;
  const isImmutable = ["approved", "published", "published_to_patient"].includes(plan.plan_status);

  const handleUnlockForEditing = async () => {
    setUnlocking(true);
    try {
      await supabase.from("meal_plans").update({ plan_status: "under_professional_review", updated_at: new Date().toISOString() }).eq("id", plan.id);
      store.updatePlan({ plan_status: "under_professional_review", updated_at: new Date().toISOString() } as any);
      toast.success("Plano desbloqueado!");
    } finally { setUnlocking(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await store._flushQueue();
      await savePlanAsApproved(plan.id, user!.id);
      store.updatePlan({ plan_status: "approved", updated_at: new Date().toISOString() } as any);
      toast.success("Plano salvo!");
    } finally { setSaving(false); }
  };

  const handleValidate = () => lockedValidationMode ? (lockedValidationMode === "MANUAL_EDIT" ? runManualValidation() : runAutoEngineValidation()) : setValidationModeDialogOpen(true);
  const handleModeSelected = (mode: ValidationMode) => { setLockedValidationMode(mode); mode === "MANUAL_EDIT" ? runManualValidation() : runAutoEngineValidation(); };

  const runManualValidation = async () => {
    setValidating(true);
    try {
      await store._flushQueue();
      const data = await validateMealPlan(plan.id);
      const nextStatus = data.overall_status || (data.success ? "aprovado" : "sugestoes_pendentes");
      store.updatePlan({ overall_validation_status: nextStatus, overall_score: data.score, last_validated_at: new Date().toISOString() } as any);
      if (data.success) { setAutofixWasValid(true); setShowAutofixResults(true); }
      else setValidationResult(data as any);
    } finally { setValidating(false); }
  };

  const runAutoEngineValidation = async () => {
    setValidating(true);
    try {
      const outcome = await runValidateAndFixMealPlan({ planId: plan.id, patientId: plan.patient_id, userId: user?.id ?? "", tenantId, flush: store._flushQueue });
      const nextStatus = resolveOverallValidationStatus(outcome.validationResult);
      store.updatePlan({ overall_validation_status: nextStatus, overall_score: outcome.validationResult?.score, last_validated_at: new Date().toISOString() } as any);
      if (outcome.kind === "validated") { setAutofixWasValid(true); setShowAutofixResults(true); }
      else if (outcome.kind === "fixed_and_validated" || outcome.kind === "fixed_but_pending") {
        await store.hydrate(plan.id, user!.id);
        setAutofixResult(outcome.fixedResult);
        setShowAutofixResults(true);
      }
    } finally { setValidating(false); }
  };

  const handlePublish = async () => {
    setPublishing(true);

    try {
      await store._flushQueue();
      await publishMealPlan(plan.id, user!.id);
      store.updatePlan({ plan_status: "published_to_patient", is_active: true } as any);
      toast.success("Plano publicado!");
    } finally { setPublishing(false); }
  };

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

    if (dragData.type === "existing-item") store.moveItem(dragData.itemId, day, mealType);
    else if (dragData.type === "food") {
      store.addItem({ meal_plan_id: plan.id, title: dragData.food.food_name, description: `${dragData.food.food_name} ${dragData.food.computed.qty}g`, day_of_week: day, meal_type: mealType, calories_target: dragData.food.computed.kcal, protein_target: dragData.food.computed.prot, carbs_target: dragData.food.computed.carbs, fat_target: dragData.food.computed.fat });
    } else if (dragData.type === "recipe") expandRecipeToItems(dragData.recipe, plan.id, day, mealType, tenantId || null, true);
  };

  return (
    <DashboardLayout>
      <DndContext collisionDetection={pointerWithin} sensors={sensors} onDragStart={(e) => { dragStartYRef.current = getClientY(e.activatorEvent); const d = e.active.data.current; if (d?.type === "food") setActiveDragData({ type: "food", label: d.food.food_name }); else if (d?.type === "recipe") setActiveDragData({ type: "recipe", label: d.recipe.title }); }} onDragMove={(e) => dragStartYRef.current && autoScrollCanvas(dragStartYRef.current + e.delta.y)} onDragEnd={(e) => { setActiveDragData(null); handleDragEnd(e); }} onDragCancel={() => setActiveDragData(null)}>
          <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
            <BuilderTopbar 
              patientName={store.patientName} 
              saving={saving} 
              publishing={publishing} 
              validating={validating} 
              onBack={() => {
                const searchParams = new URLSearchParams(window.location.search);
                const returnTo = searchParams.get('returnTo');
                if (returnTo) {
                  navigate(decodeURIComponent(returnTo));
                } else {
                  navigate("/meal-plans");
                }
              }} 
              onSave={handleSave} 
              onValidate={handleValidate} 
              onPublish={handlePublish} 
              onSaveAsTemplate={() => setSaveTemplateOpen(true)} 
              lockedValidationMode={lockedValidationMode} 
              onRename={(t) => store.updatePlan({ title: t } as any)} 
            />
            <QuickAdjustPanel />
          <div className="flex-1 flex gap-3 p-3 overflow-hidden">
            {leftPanelOpen ? <div className="w-72 shrink-0 border rounded-xl bg-card/50 flex flex-col overflow-hidden"><div className="p-2 border-b flex justify-between items-center"><span className="text-xs font-bold">Biblioteca</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLeftPanelOpen(false)}><PanelLeftOpen className="w-3.5 h-3.5" /></Button></div><BuilderLibraryPanel /></div> : <Button variant="outline" size="icon" onClick={() => setLeftPanelOpen(true)}><PanelLeftOpen className="w-4 h-4" /></Button>}
            <div ref={canvasScrollRef} className="flex-1 overflow-y-auto"><MealPlanCanvas patientContext={patientContext} composerMode={composerMode} showDropTargets onRequestGenerate={() => setRightPanelOpen(true)} /></div>
            {rightPanelOpen ? <div className="w-64 shrink-0 border rounded-xl bg-card/50 overflow-hidden"><div className="p-2 border-b flex justify-between items-center"><span className="text-xs font-bold">Painel</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRightPanelOpen(false)}><PanelRightOpen className="w-3.5 h-3.5" /></Button></div><ScrollArea className="h-full p-3 space-y-4"><ClinicalMacroPanel /><PlanAuditPanel mealPlanId={plan.id} patientId={plan.patient_id} onApproved={() => store.hydrate(plan.id, user?.id ?? "")} onFixed={() => store.hydrate(plan.id, user?.id ?? "")} /><GenerationModeSelector patientId={plan.patient_id} onGenerated={() => {}} /></ScrollArea></div> : <Button variant="outline" size="icon" onClick={() => setRightPanelOpen(true)}><PanelRightOpen className="w-4 h-4" /></Button>}
          </div>
        </div>
        <DragOverlay>{activeDragData && <div className="px-3 py-2 rounded-lg bg-card border border-primary shadow-lg text-xs font-medium">{activeDragData.label}</div>}</DragOverlay>
      </DndContext>
      <SaveMealTemplateDialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen} items={store.items} mealType="breakfast" defaultName={plan.title} onSaved={() => {}} />
      <AutoFixResultsModal open={showAutofixResults} onOpenChange={setShowAutofixResults} result={autofixResult || { success: true, changes: [], before: {} as any, after: {} as any, warnings: [], summary: {} as any }} wasAlreadyValid={autofixWasValid} />
      {validationResult && <ValidationCorrectionPanel result={validationResult} onClose={() => setValidationResult(null)} onCorrectionApplied={() => store.hydrate(plan.id, user!.id)} />}
    </DashboardLayout>
  );
}
