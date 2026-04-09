import { useEffect, useState } from "react";
import { MealDetailProvider } from "@/components/patient/MealDetailContext";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, AlertTriangle, Zap, Save, Send, CheckCircle2,
  Wand2, Trash2, Library, Minimize2, Maximize2, Sparkles, Utensils, UtensilsCrossed,
  PanelTop, Grid3X3, RefreshCw, Lock, Info, MoreHorizontal, Bookmark
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
import EditorWorkspaceTabs from "@/components/meal-editor-v2/EditorWorkspaceTabs";
import EditorCompactToolbar from "@/components/meal-editor-v2/EditorCompactToolbar";
import PlanAuditPanel from "@/components/plans/PlanAuditPanel";
import { toast } from "sonner";
import { resolveOverallValidationStatus, runValidateAndFixMealPlan } from "@/lib/mealPlanValidationFlow";
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

/** Immutable statuses — editing is BLOCKED */
const IMMUTABLE_STATUSES = ["approved", "published", "published_to_patient"];

/** Plans that can still be published (approved but not yet delivered to patient) */
const PUBLISHABLE_STATUSES = ["approved"];

export default function MealPlanEditorV2() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const store = useMealPlanEditorV2Store();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [mealLibModalOpen, setMealLibModalOpen] = useState(false);
  const [autoGenOpen, setAutoGenOpen] = useState(false);
  const [assistedOpen, setAssistedOpen] = useState(false);
  const [visualLibOpen, setVisualLibOpen] = useState(false);
  const [generatingNew, setGeneratingNew] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
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
  const isImmutable = IMMUTABLE_STATUSES.includes(planStatus);
  const canPublish = !["published", "published_to_patient"].includes(planStatus);
  
  // Check if plan came from onboarding/auto-generation — block hybrid builder
  const genSource = (plan as any).generation_source || "";
  const isAutoGenerated = /pipeline|onboarding|smart|protocol|auto/i.test(genSource);

  // Status display info
  const statusInfo = STATUS_LABELS[planStatus] || STATUS_LABELS.draft;

  // ── Generate new plan (creates a new draft, never touches current plan) ──
  const handleGenerateNewPlan = async () => {
    if (!plan || !user) return;
    
    const proceed = confirm(
      isImmutable
        ? "Será criado um NOVO rascunho baseado nos dados do paciente. O plano atual publicado NÃO será alterado. Continuar?"
        : "Será criado um NOVO plano baseado nos dados do paciente. Continuar?"
    );
    if (!proceed) return;

    setGeneratingNew(true);
    try {
      const result = await runPlanPipeline({
        patientId: plan.patient_id,
        nutritionistId: user.id,
        tenantId: tenantId || "",
        planTitle: `${plan.title} (Revisão)`,
        startDate: new Date().toISOString().split("T")[0],
        generationMode: "smart",
      });

      if (!result.success || !result.planId) {
        throw new Error(result.warnings?.[0] || "Erro ao gerar novo plano");
      }

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
    try {
      const pendingOps = useMealPlanEditorV2Store.getState().pendingOps;
      const hasStaleOps = pendingOps.some(op => op.itemIds.some(id => id.startsWith("temp-")));
      if (hasStaleOps) {
        useMealPlanEditorV2Store.setState(s => ({
          pendingOps: s.pendingOps.filter(op => !op.itemIds.some(id => id.startsWith("temp-"))),
        }));
      }
      await store._flushQueue();

      const approveResult = await savePlanAsApproved(plan.id, user!.id);
      if (!approveResult.success) throw new Error(approveResult.error || "Erro ao aprovar");
      store.updatePlan({ plan_status: "approved", updated_at: new Date().toISOString() } as any);
      toast.success("Plano salvo com sucesso!");
    } catch (err: any) {
      console.error("[Save] Error:", err);
      toast.error("Erro ao salvar: " + (err?.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!user) return;
    if (isImmutable) {
      toast.error("🔒 Plano já publicado. Use '♻️ Gerar Novo Plano' para criar uma revisão.");
      return;
    }

    const validationStatus = plan.overall_validation_status;
    if (!validationStatus || validationStatus !== "aprovado") {
      const proceed = confirm("⚠️ O plano ainda não foi validado pelo Motor Clínico. Deseja publicar mesmo assim?");
      if (!proceed) return;
    }

    setPublishing(true);
    try {
      const pendingOps = useMealPlanEditorV2Store.getState().pendingOps;
      const hasStaleOps = pendingOps.some(op => op.itemIds.some(id => id.startsWith("temp-")));
      if (hasStaleOps) {
        useMealPlanEditorV2Store.setState(s => ({
          pendingOps: s.pendingOps.filter(op => !op.itemIds.some(id => id.startsWith("temp-"))),
        }));
      }
      await store._flushQueue();

      const result = await publishMealPlan(plan.id, user.id);
      if (!result.success) {
        const rpcData = result.data as Record<string, unknown> | undefined;
        const rpcMessage = rpcData?.message as string | undefined;
        const errorCode = rpcData?.error as string | undefined;

        if (errorCode === "VALIDATION_REQUIRED") {
          toast.error("⚠️ Validação obrigatória! Clique em 'Validar' antes de publicar.", { duration: 6000 });
        } else if (errorCode === "EMPTY_PLAN") {
          toast.error("❌ O plano não possui refeições. Adicione itens antes de publicar.", { duration: 5000 });
        } else {
          throw new Error(rpcMessage || result.error || "Erro ao publicar");
        }
        return;
      }
      store.updatePlan({ plan_status: "published_to_patient", is_active: true, overall_validation_status: "aprovado", updated_at: new Date().toISOString() } as any);
      toast.success("✅ Plano publicado para o paciente!");
    } catch (err: any) {
      console.error("[Publish] Error:", err);
      toast.error(err?.message || "Erro ao publicar. Tente novamente.");
    } finally {
      setPublishing(false);
    }
  };

  const handleValidate = async () => {
    if (!plan || !user) return;
    if (isImmutable) {
      toast.info("🔒 Plano publicado — modo somente leitura. Gere um novo plano para aplicar correções.");
      return;
    }

    setValidating(true);
    setValidationResult(null);

    try {
      const outcome = await runValidateAndFixMealPlan({
        planId: plan.id,
        patientId: plan.patient_id,
        userId: user.id,
        tenantId,
        flush: store._flushQueue,
      });

      const data = outcome.validationResult;
      const nextValidationStatus = resolveOverallValidationStatus(data);

      store.updatePlan({
        overall_validation_status: nextValidationStatus,
        overall_score: typeof data?.score === "number" ? data.score : plan.overall_score,
        last_validated_at: new Date().toISOString(),
        validation_engine_version: "unified_v5",
        updated_at: new Date().toISOString(),
      } as any);

      if (outcome.kind === "validated") {
        await store.hydrate(plan.id, user.id);
        setValidationResult(null);
        toast.success(data.message || "Motor Clínico: Plano válido! Pode ser publicado. ✅");
        return;
      }

      if (outcome.kind === "fixed_and_validated" || outcome.kind === "fixed_but_pending") {
        await store.hydrate(plan.id, user.id);
        if (outcome.kind === "fixed_and_validated") {
          setValidationResult(null);
          toast.success("✅ Plano corrigido e revalidado com sucesso!");
        } else {
          setValidationResult(data as unknown as ValidationResult);
          toast.info("Correção aplicada. Ainda há sugestões pendentes.");
        }
        return;
      }

      if (outcome.kind !== "redirect") {
        throw new Error("Fluxo de correção retornou um estado inesperado.");
      }

      toast.success("Plano corrigido salvo como draft! Abrindo no editor clínico...");
      navigate(`/meal-plans/${outcome.newPlanId}`, { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Erro de conexão com o Motor Clínico");
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
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateNewPlan}
              disabled={generatingNew}
              className="shrink-0 gap-1.5 border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
            >
              {generatingNew ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              ♻️ Gerar Novo Plano
            </Button>
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
                  <DropdownMenuItem onClick={() => setSaveTemplateOpen(true)} className="gap-2">
                    <Bookmark className="w-4 h-4" /> Salvar como Modelo
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
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={publishing || store.syncStatus === "saving"}
                  title="Publicar plano para o paciente"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                  Publicar
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

        {/* Validation Correction Panel — only for editable plans */}
        {!isImmutable && validationResult && !validationResult.success && (
          <ValidationCorrectionPanel
            result={validationResult}
            onClose={() => setValidationResult(null)}
            onCorrectionApplied={async () => {
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
