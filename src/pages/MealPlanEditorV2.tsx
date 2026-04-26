import { useEffect, useState, useRef } from "react";
import { createPlanRevision } from "@/lib/createPlanRevision";
import { MealDetailProvider } from "@/components/patient/MealDetailContext";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, AlertTriangle, Zap, Save, Send, CheckCircle2,
  Wand2, Trash2, Library, Minimize2, Maximize2, Sparkles, Utensils, UtensilsCrossed,
  PanelTop, Grid3X3, RefreshCw, Lock, Info, MoreHorizontal, Bookmark, Pencil
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTenant } from "@/lib/tenantContext";
import SimplifyPlanButton from "@/components/meal-simplification/SimplifyPlanButton";
import { useAuth } from "@/lib/auth";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import { supabase } from "@/integrations/supabase/client";
import { publishMealPlan, savePlanAsApproved, resolvePlanState } from "@/lib/serverTransitions";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { WeeklyGrid } from "@/components/meal-editor-v2/WeeklyGrid";
import { ListView } from "@/components/meal-editor-v2/ListView";
import { EditorSyncBadge } from "@/components/meal-editor-v2/EditorSyncBadge";

import { MealLibrarySidebar } from "@/components/meal-editor-v2/MealLibrarySidebar";
import { MealLibraryModal } from "@/components/meal-editor-v2/MealLibraryModal";
import { AutoGenerateModal } from "@/components/meal-editor-v2/AutoGenerateModal";
import { AssistedPlanModal } from "@/components/meal-editor-v2/AssistedPlanModal";
import { MealVisualLibraryModal } from "@/components/meal-editor-v2/MealVisualLibraryModal";
import { ValidationCorrectionPanel, type ValidationResult } from "@/components/meal-editor-v2/ValidationCorrectionPanel";
import AutoFixResultsModal from "@/components/hybrid-builder/AutoFixResultsModal";
import type { AutoFixResult } from "@/lib/autoFixEngine";
import EditorWorkspaceTabs from "@/components/meal-editor-v2/EditorWorkspaceTabs";
import EditorCompactToolbar from "@/components/meal-editor-v2/EditorCompactToolbar";
import PlanAuditPanel from "@/components/plans/PlanAuditPanel";
import { toast } from "sonner";
import { calculatePlanTotals } from "@/lib/calculatePlanTotals";
import { resolveOverallValidationStatus, runValidateAndFixMealPlan } from "@/lib/mealPlanValidationFlow";
import { validatePlanSubstitutions } from "@/lib/mealPlanSubstitutionValidator";
import { runPlanPipeline } from "@/lib/planPipelineOrchestrator";
import SaveMealTemplateDialog from "@/components/meals/SaveMealTemplateDialog";

type ViewMode = "grid" | "list";
type EditorLayout = "tabs" | "compact";

const VIEW_MODE_KEY = "fj_editor_view_mode";
const FULLSCREEN_KEY = "fj_editor_fullscreen";
const EDITOR_LAYOUT_KEY = "fj_editor_layout";

/** Human-readable plan status labels */
const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Rascunho", color: "text-muted-foreground bg-muted/50", icon: null },
  draft_ai: { label: "Gerado por IA", color: "text-blue-600 bg-blue-500/10", icon: <Sparkles className="w-3 h-3" /> },
  draft_manual: { label: "Manual", color: "text-muted-foreground bg-muted/50", icon: null },
  draft_template: { label: "Via Template", color: "text-violet-600 bg-violet-500/10", icon: null },
  draft_revision: { label: "Revisão", color: "text-amber-600 bg-amber-500/10", icon: <RefreshCw className="w-3 h-3" /> },
  draft_auto_corrected: { label: "Auto-corrigido", color: "text-cyan-600 bg-cyan-500/10", icon: <Wand2 className="w-3 h-3" /> },
  approved: { label: "Aprovado", color: "text-blue-600 bg-blue-500/10", icon: <Save className="w-3 h-3" /> },
  published: { label: "Publicado", color: "text-green-600 bg-green-500/10", icon: <CheckCircle2 className="w-3 h-3" /> },
  published_to_patient: { label: "Publicado", color: "text-green-600 bg-green-500/10", icon: <CheckCircle2 className="w-3 h-3" /> },
  archived: { label: "Arquivado", color: "text-muted-foreground bg-muted/50", icon: null },
};

/** Immutable statuses — nutritionist CAN edit published plans (they are the owner).
 *  Only "archived" is truly immutable in the editor UI. */
const IMMUTABLE_STATUSES: string[] = ["archived"];

/** Plans that can still be published (approved but not yet delivered to patient) */
const PUBLISHABLE_STATUSES = ["approved"];

export default function MealPlanEditorV2() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const store = useMealPlanEditorV2Store();
  const editorRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingAndPublishing, setSavingAndPublishing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [mealLibModalOpen, setMealLibModalOpen] = useState(false);
  const [autoGenOpen, setAutoGenOpen] = useState(false);
  const [assistedOpen, setAssistedOpen] = useState(false);
  const [visualLibOpen, setVisualLibOpen] = useState(false);
  const [generatingNew, setGeneratingNew] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [autofixResult, setAutofixResult] = useState<AutoFixResult | null>(null);
  const [showAutofixResults, setShowAutofixResults] = useState(false);
  const [autofixWasValid, setAutofixWasValid] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return saved === "list" ? "list" : "grid";
  });
  const [isFullscreen, setIsFullscreen] = useState(() => {
    return localStorage.getItem(FULLSCREEN_KEY) === "true";
  });
  const [editorLayout, setEditorLayout] = useState<EditorLayout>(() => {
    const saved = localStorage.getItem(EDITOR_LAYOUT_KEY);
    return saved === "compact" ? "compact" : "tabs";
  });

  // Persist preferences
  useEffect(() => { localStorage.setItem(VIEW_MODE_KEY, viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem(FULLSCREEN_KEY, String(isFullscreen)); }, [isFullscreen]);
  useEffect(() => { localStorage.setItem(EDITOR_LAYOUT_KEY, editorLayout); }, [editorLayout]);

  const refreshPlanFromServer = async () => {
    if (!id || !user?.id) return;
    await store.hydrate(id, user.id);
  };

  // Keyboard shortcuts (Esc exits fullscreen)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  // Hydrate on mount / planId change
  useEffect(() => {
    if (id && user?.id) {
      store.hydrate(id, user.id);
    }
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  // ── Loading gate ─────────────────────────────────────────────
  const storeMatchesRoute = store.planId === id;
  if (!storeMatchesRoute || !store.hydrated || store.hydrating) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  // ── Plan not found ────────────────────────────────────────
  if (store.hydrated && !store.plan) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 space-y-4">
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Plano não encontrado.</p>
          <Button variant="ghost" onClick={() => navigate("/meal-plans")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const plan = store.plan;
  if (!plan) return null;

  const planState = resolvePlanState(plan);
  const isPublished = planState.isEffective;
  const isApproved = planState.isApproved;
  const planStatus = (plan as any).plan_status || "draft";
  const clinicalStatus = (plan as any).clinical_status || "pending_evaluation";
  const clinicalScore = (plan as any).clinical_score || 0;
  const qualityAlerts = (plan as any).quality_alerts || [];
  
  // Extra checks to handle case where plan totals might be used for score
  const totalCalories = (plan as any).total_calories || 0;
  const totalProtein = (plan as any).total_protein || 0;
  const isImmutable = planStatus === "archived";
  const canPublish = planStatus !== "archived";
  
  // Check if plan came from onboarding/auto-generation — block hybrid builder
  const genSource = (plan as any).generation_source || "";
  const isAutoGenerated = /pipeline|onboarding|smart|protocol|auto/i.test(genSource);

  // Status display info
  const statusInfo = STATUS_LABELS[planStatus] || STATUS_LABELS.draft;

  // ── Generate new plan (creates a new draft, never touches current plan) ──
  const handleGenerateNewPlan = async () => {
    if (!plan || !user) return;
    
    // No blocking confirm here, just generate
    console.warn("[PLAN] botão clicado");
    console.warn("[PLAN] função iniciou");
    setGeneratingNew(true);
    try {
      console.warn("[PLAN] chamando edge function via pipeline");
      const result = await runPlanPipeline({
        patientId: plan.patient_id,
        nutritionistId: user.id,
        tenantId: tenantId || "",
        planTitle: `${plan.title} (Revisão)`,
        startDate: new Date().toISOString().split("T")[0],
        generationMode: "smart",
      });

      console.warn("[PLAN] resposta recebida", result);
      if (!result.success || !result.planId) {
        console.error("[PLAN] erro - resposta sem sucesso ou planId", result);
        throw new Error(result.warnings?.[0] || "Erro ao gerar novo plano");
      }

      console.warn("[PLAN] plano gerado:", result.planId);

      // Clear editor sessionStorage cache for current plan
      try { sessionStorage.removeItem(`meal-plan-editor:${plan.id}`); } catch {}

      toast.success("✅ Novo plano gerado! Abrindo no editor...");
      navigate(`/meal-plans/${result.planId}`, { replace: true });
    } catch (err: any) {
      console.error("[GenerateNew] Error:", err);
      toast.error(err?.message || "Erro ao gerar novo plano");
    } finally {
      setGeneratingNew(false);
    }
  };

  const handleSave = async () => {
    if (isImmutable) {
      toast.error("🔒 Plano imutável. Crie uma nova versão para editar.");
      return;
    }
    setSaving(true);
    
    // 🛡️ Validação de Substituições antes de salvar
    const subValidation = validatePlanSubstitutions(store.items, store.substitutionCount);
    if (!subValidation.valid) {
      toast.error("⚠️ Substituições fora do padrão", {
        description: (
          <div className="mt-2 space-y-2 max-h-[300px] overflow-auto pr-2 custom-scrollbar">
            {subValidation.detailedErrors.map((err, i) => (
              <div key={i} className="text-[11px] p-2 rounded bg-muted/50 border border-border/50">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-bold text-foreground truncate max-w-[150px]">{err.mealTitle}</span>
                  <button 
                    onClick={() => {
                      const el = document.getElementById(`meal-item-${err.mealId}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        window.location.hash = `meal-item-${err.mealId}`;
                      }
                    }}
                    className="text-[10px] text-primary hover:underline shrink-0"
                  >
                    Ver item
                  </button>
                </div>
                {err.limitError ? (
                  <p className="text-destructive font-medium mt-1">{err.limitError}</p>
                ) : (
                  <div className="mt-1 space-y-1">
                    <p className="text-muted-foreground italic truncate">"{err.foodName}"</p>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                      {err.macros.kcal && <span className="text-orange-600 font-bold">Kcal: {err.macros.kcal.value}</span>}
                      {err.macros.protein && <span className="text-red-600 font-bold">P: {err.macros.protein.value}g</span>}
                      {err.macros.carbs && <span className="text-amber-600 font-bold">C: {err.macros.carbs.value}g</span>}
                      {err.macros.fat && <span className="text-blue-600 font-bold">G: {err.macros.fat.value}g</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ),
        duration: 8000
      });
      setSaving(false);
      return;
    }

    const toastId = toast.loading("Salvando e aprovando plano...");
    try {
      // Modelo single-day puro: nenhuma consolidação de dias legados necessária.
      
      await store._flushQueue();

      // Recalcular totais via RPC (autoritativo) antes do refetch final
      const totals = await calculatePlanTotals(plan.id);
      
      // draft_auto_corrected já é um rascunho persistido; salvar não deve forçar aprovação
      if (planStatus === "draft_auto_corrected") {
        await refreshPlanFromServer();
        toast.success("✅ Rascunho salvo com sucesso!", { id: toastId });
        return;
      }

      const approveResult = await savePlanAsApproved(plan.id, user!.id);
      if (!approveResult.success) {
        console.error("[EMERGENCY] Erro ao aprovar:", approveResult.error);
        throw new Error(approveResult.error || "Erro ao aprovar");
      }

      await refreshPlanFromServer();
      toast.success("✅ Plano salvo com sucesso!", { id: toastId });
    } catch (err: any) {
      console.error("[Save] Error:", err);
      toast.error("Erro ao salvar: " + (err?.message || "Tente novamente"), { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!user) return;
    if (isImmutable) {
      toast.error("🔒 Plano arquivado não pode ser publicado.");
      return;
    }

    setPublishing(true);
    const toastId = toast.loading("Publicando plano...");
    try {
      const result = await publishMealPlan(plan.id, user.id);
      if (!result.success) throw new Error(result.error || "Erro ao publicar");
      
      await refreshPlanFromServer();
      toast.success("✅ Plano publicado com sucesso!", { id: toastId });
    } catch (err: any) {
      console.error("[Publish] Error:", err);
      toast.error("Erro ao publicar: " + (err?.message || "Tente novamente"), { id: toastId });
    } finally {
      setPublishing(false);
    }
  };

  // Quick action: combines Save (approve) + Publish in a single click to reduce errors
  const handleSaveAndPublish = async () => {
    if (!user || !plan) return;
    if (isImmutable) {
      toast.error("🔒 Plano arquivado. Crie uma nova versão para editar.");
      return;
    }

    setSavingAndPublishing(true);
    const toastId = toast.loading("Salvando e publicando plano...");
    try {
      // 🛡️ Validação de Substituições antes de publicar
      const subValidation = validatePlanSubstitutions(store.items, store.substitutionCount);
      if (!subValidation.valid) {
        toast.error("⚠️ Substituições fora do padrão", {
          description: (
            <div className="mt-2 space-y-2 max-h-[300px] overflow-auto pr-2 custom-scrollbar">
              {subValidation.detailedErrors.map((err, i) => (
                <div key={i} className="text-[11px] p-2 rounded bg-muted/50 border border-border/50">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-foreground truncate max-w-[150px]">{err.mealTitle}</span>
                    <button 
                      onClick={() => {
                        const el = document.getElementById(`meal-item-${err.mealId}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          window.location.hash = `meal-item-${err.mealId}`;
                        }
                      }}
                      className="text-[10px] text-primary hover:underline shrink-0"
                    >
                      Ver item
                    </button>
                  </div>
                  {err.limitError ? (
                    <p className="text-destructive font-medium mt-1">{err.limitError}</p>
                  ) : (
                    <div className="mt-1 space-y-1">
                      <p className="text-muted-foreground italic truncate">"{err.foodName}"</p>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                        {err.macros.kcal && <span className="text-orange-600 font-bold">Kcal: {err.macros.kcal.value}</span>}
                        {err.macros.protein && <span className="text-red-600 font-bold">P: {err.macros.protein.value}g</span>}
                        {err.macros.carbs && <span className="text-amber-600 font-bold">C: {err.macros.carbs.value}g</span>}
                        {err.macros.fat && <span className="text-blue-600 font-bold">G: {err.macros.fat.value}g</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ),
          duration: 8000
        });
        setSavingAndPublishing(false);
        return;
      }

      // 1) Flush pending edits
      await store._flushQueue();

      // 2) Publica via transição autoritativa do backend
      console.info("[EMERGENCY] Iniciando publicação autoritativa...");
      const publishResult = await publishMealPlan(plan.id, user.id);
      
      if (!publishResult.success) {
        console.error("[EMERGENCY] Falha na RPC de publicação:", publishResult.error);
        throw new Error(publishResult.error || "Plano salvo, mas houve erro ao publicar");
      }

      // 3) Refetch OBRIGATÓRIO (Etapa 5) - Apenas UM ao final
      await refreshPlanFromServer();

      // ──── AUDIT DIVERGENCIA POS-PUBLISH ────
      const localCount = store.items.length;
      const { count: serverCount, error: auditErr } = await supabase
        .from("meal_plan_items")
        .select("id", { count: "exact", head: true })
        .eq("meal_plan_id", plan.id);
      
      if (!auditErr && serverCount !== null && serverCount !== localCount) {
        console.error("[AUDIT] Divergência detectada pós-publish!", { local: localCount, server: serverCount });
        toast.error("⚠️ Divergência detectada pós-publicação. Recarregando estado real...");
        await store.hydrate(plan.id, user!.id);
        return;
      }

      toast.success("✅ Plano salvo e publicado! O paciente já pode visualizar.", { id: toastId, duration: 5000 });
    } catch (err: any) {
      console.error("[SaveAndPublish] Error:", err);
      toast.error("Erro ao salvar/publicar: " + (err?.message || "Tente novamente"), { id: toastId });
    } finally {
      setSavingAndPublishing(false);
    }
  };

  const handleValidate = async () => {
    if (!plan || !user) return;
    if (isImmutable) {
      toast.info("🔒 Plano publicado — modo somente leitura. Gere um novo plano para aplicar correções.");
      return;
    }

    setValidating(true);
    const toastId = toast.loading("Motor Clínico: Validando e corrigindo plano...");
    setValidationResult(null);
    setAutofixResult(null);

    try {
      const outcome = await runValidateAndFixMealPlan({
        planId: plan.id,
        patientId: plan.patient_id,
        userId: user.id,
        tenantId,
        flush: store._flushQueue,
      });

      const data = outcome.validationResult;

      if (outcome.kind === "validated") {
        const approveResult = await savePlanAsApproved(plan.id, user.id);
        if (!approveResult.success) {
          throw new Error(approveResult.error || "Plano validado, mas houve erro ao marcar como aprovado.");
        }

        await refreshPlanFromServer();
        setValidationResult(null);
        setAutofixWasValid(true);
        setAutofixResult(null);
        setShowAutofixResults(true);
        toast.success(data.message || "Motor Clínico: Plano válido! Pode ser publicado. ✅", { id: toastId });
        return;
      }

      if (outcome.kind === "fixed_and_validated" || outcome.kind === "fixed_but_pending") {
        if (outcome.kind === "fixed_and_validated") {
          const approveResult = await savePlanAsApproved(plan.id, user.id);
          if (!approveResult.success) {
            throw new Error(approveResult.error || "Plano corrigido e validado, mas houve erro ao marcar como aprovado.");
          }
        }

        await refreshPlanFromServer();
        setAutofixWasValid(false);
        setAutofixResult(outcome.fixedResult);
        setShowAutofixResults(true);
        if (outcome.kind === "fixed_and_validated") {
          setValidationResult(null);
          toast.success(`✅ Plano corrigido e revalidado! ${outcome.fixedResult.changes.length} correção(ões).`, { id: toastId });
        } else {
          setValidationResult(data as unknown as ValidationResult);
          toast.info("Correção aplicada. Ainda há sugestões pendentes.", { id: toastId });
        }
        return;
      }

      if (outcome.kind !== "redirect") {
        throw new Error("Fluxo de correção retornou um estado inesperado.");
      }

      setAutofixWasValid(false);
      setAutofixResult(outcome.fixedResult);
      setShowAutofixResults(true);
      toast.success("Plano corrigido salvo como draft! Abrindo no editor clínico...");
      setTimeout(() => navigate(`/meal-plans/${outcome.newPlanId}`, { replace: true }), 2000);
    } catch (e: any) {
      const msg = String(e?.message || "");
      console.error("[handleValidate] error:", e);

      // Mensagens específicas para bloqueios clínicos comuns
      if (/sem.?meta.?cal|meta.?cal[oó]rica|n[aã]o.?tem.?meta/i.test(msg) || /Anamnese.*Avalia[cç][aã]o/i.test(msg)) {
        toast.error("⚠️ Paciente sem peso/altura cadastrados. Vá em Avaliação Física do paciente e preencha os dados antes de validar o plano.", { duration: 8000 });
      } else if (/plano.?vazio|plano_vazio|n[aã]o tem refei[cç][oõ]es/i.test(msg)) {
        toast.error("⚠️ O plano não tem refeições. Use 'Gerar plano' ou adicione itens manualmente antes de validar.", { duration: 8000 });
      } else if (/Contexto.?da.?cl[ií]nica/i.test(msg)) {
        toast.error("Recarregue a página — contexto da clínica não foi carregado.", { duration: 6000 });
      } else if (/n[aã]o conseguiu persistir/i.test(msg)) {
        toast.error("Auto-correção não pôde aplicar mudanças. Edite o plano manualmente ou regenere.", { duration: 6000 });
      } else {
        toast.error(msg || "Erro ao validar/corrigir o plano. Tente novamente.", { duration: 6000 });
      }
    } finally {
      setValidating(false);
    }
  };

  const editorContent = (
    <>
      <EditorSyncBadge status={store.syncStatus} />

      <div className="space-y-4">
        {/* ── Immutable Plan Banner ─────────────────────────────── */}
        {isImmutable && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200">
            <Lock className="w-5 h-5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Plano publicado — Somente leitura</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Alterações automáticas estão bloqueadas. Crie uma nova versão para editar.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!plan || !user) return;
                  toast.loading("Criando revisão editável...");
                  const { planId, error } = await createPlanRevision({
                    sourcePlanId: plan.id,
                    nutritionistId: user.id,
                    tenantId: tenantId || null,
                  });
                  toast.dismiss();
                  if (error || !planId) {
                    toast.error(error || "Erro ao criar revisão");
                    return;
                  }
                  toast.success("Revisão criada! Abrindo editor...");
                  navigate(`/meal-plans/${planId}`, { replace: true });
                }}
                className="shrink-0 gap-1.5 border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
              >
                <Pencil className="w-4 h-4" /> Editar Cópia
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateNewPlan}
                disabled={generatingNew}
                className="shrink-0 gap-1.5 border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
              >
                {generatingNew ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                ♻️ Gerar Novo
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => isFullscreen ? setIsFullscreen(false) : (plan?.patient_id ? navigate(`/patients/${plan.patient_id}`) : navigate("/meal-plans"))}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl font-bold">{plan.title}</h1>
                {/* Plan status badge */}
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                  {statusInfo.icon}
                  {isImmutable && <Lock className="w-2.5 h-2.5" />}
                  {statusInfo.label}
                </span>
                {!isImmutable && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <Zap className="w-3 h-3" /> Editor Premium
                  </span>
                )}
              </div>
              {/* Plan info line */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <span>Paciente: {store.patientName}</span>
                <span>•</span>
                <span>Início: {new Date(plan.start_date).toLocaleDateString("pt-BR")}</span>
                {genSource && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Origem: {/onboarding/i.test(genSource) ? "Onboarding" : /smart/i.test(genSource) ? "Motor Inteligente" : /pipeline/i.test(genSource) ? "Pipeline" : genSource}
                    </span>
                  </>
                )}
              </div>
          </div>
        </div>

        {/* ── Intelligence Layer ─────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${
            clinicalScore >= 90 ? "bg-green-500/10 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : 
            clinicalScore >= 70 ? "bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : 
            "bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Sparkles className={`w-4 h-4 ${clinicalScore >= 90 ? "text-green-500" : clinicalScore >= 70 ? "text-amber-500" : "text-red-500"}`} />
                Score Clínico: {clinicalScore}
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                clinicalScore >= 90 ? "bg-green-500 text-white" : 
                clinicalScore >= 70 ? "bg-amber-500 text-white" : 
                "bg-red-500 text-white"
              }`}>
                {clinicalScore >= 90 ? "Excelente" : clinicalScore >= 70 ? "Bom" : "Ajuste Necessário"}
              </span>
            </div>
            <div className="w-full bg-muted/30 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full transition-all duration-1000 ${
                  clinicalScore >= 90 ? "bg-green-500" : clinicalScore >= 70 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${clinicalScore}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Baseado na distribuição de macros e calorias clínicas.</p>
          </div>

          {qualityAlerts.length > 0 && (
            <div className="md:col-span-2 p-4 rounded-xl border bg-card/50 flex flex-col gap-2 overflow-hidden border-border/50">
              <h3 className="text-xs font-bold text-muted-foreground flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Alertas de Qualidade Nutricional
              </h3>
              <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[60px] pr-2 custom-scrollbar">
                {qualityAlerts.map((alert: string, idx: number) => (
                  <span key={idx} className="text-[10px] bg-muted/80 px-2 py-1 rounded border border-border/50 text-foreground/80 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="w-1 h-1 rounded-full bg-amber-500" />
                    {alert}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
            {store.hydrating && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Atualizando…
              </div>
            )}

            {/* ♻️ Generate New Plan — always visible */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateNewPlan}
              disabled={generatingNew}
              className="gap-1.5"
            >
              {generatingNew ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="hidden sm:inline">♻️ Novo Plano</span>
            </Button>

            {/* Substitutions Control */}
            {!isImmutable && (
              <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5 ml-2">
                <span className="text-[10px] font-bold px-2 text-muted-foreground uppercase">Substituições:</span>
                {[0, 1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => store.setSubstitutionCount(n)}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                      store.substitutionCount === n
                        ? "bg-primary text-primary-foreground shadow-sm scale-110"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            {/* Editor Layout Mode Toggle — only when editable */}
            {!isImmutable && (
              <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setEditorLayout("tabs")}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    editorLayout === "tabs"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <PanelTop className="w-3.5 h-3.5" /> Abas
                </button>
                <button
                  type="button"
                  onClick={() => setEditorLayout("compact")}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    editorLayout === "compact"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Grid3X3 className="w-3.5 h-3.5" /> Compacto
                </button>
              </div>
            )}

            {/* Fullscreen Toggle */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Minimizar" : "Expandir editor"}
            >
              {isFullscreen
                ? <Minimize2 className="w-4 h-4" />
                : <Maximize2 className="w-4 h-4" />}
            </Button>

            {/* Save for future use — always visible */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveTemplateOpen(true)}
              disabled={store.items.length === 0}
              className="gap-1.5"
              title="Salvar plano para uso futuro"
            >
              <Bookmark className="w-4 h-4" />
              <span className="hidden sm:inline">Salvar p/ uso futuro</span>
            </Button>

            {/* Secondary tools dropdown — only when editable */}
            {!isImmutable && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <MoreHorizontal className="w-4 h-4" />
                    <span className="hidden sm:inline">Ferramentas</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {!isAutoGenerated && (
                    <DropdownMenuItem onClick={() => navigate(`/plan-builder/${id}`)} className="gap-2 text-primary">
                      <Zap className="w-4 h-4" /> Builder Híbrido
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setAssistedOpen(true)} className="gap-2">
                    <Sparkles className="w-4 h-4" /> Plano Assistido
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAutoGenOpen(true)} className="gap-2">
                    <Wand2 className="w-4 h-4" /> Gerar Automático
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMealLibModalOpen(true)} className="gap-2">
                    <Utensils className="w-4 h-4" /> Banco de Refeições
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLibraryOpen(true)} className="gap-2">
                    <Library className="w-4 h-4" /> Meus Modelos
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (!confirm("Tem certeza que deseja apagar TODAS as refeições deste plano? Esta ação não pode ser desfeita.")) return;
                      store.clearAllItems();
                      toast.success("Todas as refeições foram removidas do plano.");
                    }}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" /> Apagar Plano
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {plan && tenantId && !isAutoGenerated && !isImmutable && (
              <SimplifyPlanButton
                planId={plan.id}
                patientId={plan.patient_id}
                nutritionistId={plan.nutritionist_id}
                tenantId={tenantId}
                items={store.items}
                onSimplified={(newId) => navigate(`/plan-builder/${newId}`, { replace: true })}
              />
            )}

            {/* Critical action buttons — hidden when immutable */}
            {!isImmutable && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || store.syncStatus === "saving"}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleValidate}
                  disabled={validating || store.syncStatus === "saving"}
                  className="gradient-primary text-white border-0 gap-1.5 shadow-glow"
                >
                  {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span className="hidden sm:inline">Validar e Corrigir</span>
                </Button>
              </>
            )}

            {!isImmutable && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </Button>

                <Button
                  size="sm"
                  onClick={handleSaveAndPublish}
                  disabled={savingAndPublishing || publishing}
                  className="gradient-primary text-white border-0 gap-1.5 shadow-glow font-semibold"
                >
                  {savingAndPublishing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Send className="w-4 h-4 mr-1" />
                  )}
                  Salvar e Publicar
                </Button>
              </>
            )}

            {/* Visual Library — always available for viewing */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisualLibOpen(true)}
              className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span className="hidden sm:inline">Refeições</span>
            </Button>
          </div>
        </div>

        {/* AutoFix Results Modal */}
        <AutoFixResultsModal
          open={showAutofixResults}
          onOpenChange={setShowAutofixResults}
          result={autofixResult || {
            success: true, changes: [],
            before: { score: { overallScore: 100, totalItems: 0, uniqueItems: 0, avgItemsPerMeal: 0 } as any, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 },
            after: { score: { overallScore: 100, totalItems: 0, uniqueItems: 0, avgItemsPerMeal: 0 } as any, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 },
            warnings: [], summary: { blocked_removed: 0, meals_simplified: 0, snacks_fixed: 0, breakfasts_fixed: 0, main_meals_standardized: 0, macro_rebalanced: false },
          }}
          wasAlreadyValid={autofixWasValid}
          validationMessage={autofixWasValid ? `Score: ${plan.overall_score ?? "?"}/100. Macros dentro das faixas clínicas.` : undefined}
        />

        {/* Validation Correction Panel — only for editable plans */}
        {!isImmutable && validationResult && !validationResult.success && (
          <ValidationCorrectionPanel
            result={validationResult}
            onClose={() => setValidationResult(null)}
            onCorrectionApplied={async () => {
              await store._flushQueue();
                await refreshPlanFromServer();
              try {
                const { data } = await supabase.functions.invoke("validate-meal-plan", { body: { meal_plan_id: plan.id } });
                if (data) {
                    await refreshPlanFromServer();
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

        {/* Editor Content — Workspace Mode */}
        {editorLayout === "tabs" ? (
          <EditorWorkspaceTabs viewMode={viewMode} onViewModeChange={setViewMode} />
        ) : (
          <EditorCompactToolbar viewMode={viewMode} onViewModeChange={setViewMode} />
        )}

        {/* Auditoria Clínica — Motor Determinístico */}
        <div className="glass rounded-xl p-5 mt-4">
          <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
            🧠 Auditoria Clínica (Motor Determinístico)
          </h3>
          <PlanAuditPanel
            mealPlanId={plan.id}
            patientId={plan.patient_id}
            onApproved={() => store.hydrate(plan.id, user?.id ?? "")}
            onFixed={(newPlanId, inPlace) => {
              if (isImmutable && inPlace) {
                toast.error("🔒 Correção in-place bloqueada em plano publicado.");
                return;
              }
              toast.success("✅ Plano corrigido! Recarregando...");
              if (inPlace) {
                store.hydrate(plan.id, user?.id ?? "");
              } else {
                store.hydrate(newPlanId, user?.id ?? "");
                navigate(`/meal-plans/${newPlanId}`, { replace: true });
              }
            }}
          />
        </div>
      </div>

      {/* Legacy Modals — only when editable */}
      {!isImmutable && (
        <>
          <MealLibrarySidebar
            open={libraryOpen}
            onOpenChange={setLibraryOpen}
            targetDay={1}
            targetMealType="breakfast"
          />
          <MealLibraryModal
            open={mealLibModalOpen}
            onOpenChange={setMealLibModalOpen}
            targetDay={1}
            targetMealType="breakfast"
          />
          <AutoGenerateModal
            open={autoGenOpen}
            onOpenChange={setAutoGenOpen}
          />
          <AssistedPlanModal
            open={assistedOpen}
            onOpenChange={setAssistedOpen}
          />
        </>
      )}
      <MealVisualLibraryModal
        open={visualLibOpen}
        onOpenChange={setVisualLibOpen}
      />
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
        mealType={(plan as any)?.plan_type || "custom"}
        defaultName={plan?.title || ""}
      />
    </>
  );

  // Fullscreen mode renders outside DashboardLayout
  if (isFullscreen) {
    return (
      <MealDetailProvider>
        <div className="fixed inset-0 z-50 bg-background overflow-auto p-4">
          {editorContent}
        </div>
      </MealDetailProvider>
    );
  }

  return (
    <MealDetailProvider>
      <DashboardLayout>
        {editorContent}
      </DashboardLayout>
    </MealDetailProvider>
  );
}
