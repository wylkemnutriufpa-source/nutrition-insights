import { useEffect, useState } from "react";
import { MealDetailProvider } from "@/components/patient/MealDetailContext";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, AlertTriangle, Zap, Save, Send, CheckCircle2,
  Wand2, Trash2, Library, LayoutGrid, List, Minimize2, Maximize2, Sparkles, Utensils, UtensilsCrossed
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
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
import PlanAuditPanel from "@/components/plans/PlanAuditPanel";
import { toast } from "sonner";
import { resolveOverallValidationStatus, runValidateAndFixMealPlan } from "@/lib/mealPlanValidationFlow";

type ViewMode = "grid" | "list";

const VIEW_MODE_KEY = "fj_editor_view_mode";
const FULLSCREEN_KEY = "fj_editor_fullscreen";

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
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return saved === "list" ? "list" : "grid";
  });
  const [isFullscreen, setIsFullscreen] = useState(() => {
    return localStorage.getItem(FULLSCREEN_KEY) === "true";
  });

  // Persist preferences
  useEffect(() => { localStorage.setItem(VIEW_MODE_KEY, viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem(FULLSCREEN_KEY, String(isFullscreen)); }, [isFullscreen]);

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

  const handleSave = async () => {
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

      // Use server-authoritative RPC for approval (validated transition)
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

    // Advisory: warn if not validated but allow publishing
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

      // Use server-authoritative RPC for publishing (critical transition)
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
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  <Zap className="w-3 h-3" /> Editor Premium
                </span>
                {isPublished && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Publicado
                  </span>
                )}
                {isApproved && !isPublished && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">
                    <Save className="w-3 h-3" /> Salvo
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Paciente: {store.patientName} • Início: {new Date(plan.start_date).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {store.hydrating && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Atualizando…
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  viewMode === "grid"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Grade
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="w-3.5 h-3.5" /> Lista
              </button>
            </div>

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

            {/* Secondary tools dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <MoreHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">Ferramentas</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => navigate(`/plan-builder/${id}`)} className="gap-2 text-primary">
                  <Zap className="w-4 h-4" /> Builder Híbrido
                </DropdownMenuItem>
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
            {plan && tenantId && (
              <SimplifyPlanButton
                planId={plan.id}
                patientId={plan.patient_id}
                nutritionistId={plan.nutritionist_id}
                tenantId={tenantId}
                items={store.items}
                onSimplified={(newId) => navigate(`/plan-builder/${newId}`, { replace: true })}
              />
            )}

            {/* Critical action buttons — always visible */}
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
          </div>
        </div>

        {/* Validation Correction Panel */}
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

        {/* Editor Content */}
        {viewMode === "grid" ? <WeeklyGrid /> : <ListView />}

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
              toast.success("✅ Plano corrigido! Recarregando...");
              if (inPlace) {
                store.hydrate(plan.id, user?.id ?? "");
              } else {
                // Load the corrected draft in-place instead of navigating away
                store.hydrate(newPlanId, user?.id ?? "");
                navigate(`/meal-plans/${newPlanId}`, { replace: true });
              }
            }}
          />
        </div>
      </div>

      {/* Modals & Sidebars */}
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
