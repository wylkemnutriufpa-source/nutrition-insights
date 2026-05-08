import { useEffect, useState, useRef, useCallback } from "react";
import { createPlanRevision } from "@/lib/createPlanRevision";
import { MealDetailProvider } from "@/components/patient/MealDetailContext";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, AlertTriangle, Zap, Save, Send, CheckCircle2,
  Wand2, Trash2, Library, Minimize2, Maximize2, Sparkles, Utensils, UtensilsCrossed,
  PanelTop, Grid3X3, RefreshCw, Lock, Info, MoreHorizontal, Bookmark, Pencil, Star
} from "lucide-react";
import { cn } from "@/lib/utils";
// DropdownMenu imported below with additional components
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
import { sendWhatsAppNotification, getMealPlanReadyMessage } from "@/utils/whatsappNotification";
import { BASE_URL } from "@/lib/config";

import { MealLibrarySidebar } from "@/components/meal-editor-v2/MealLibrarySidebar";
import { MealLibraryModal } from "@/components/meal-editor-v2/MealLibraryModal";
import { AutoGenerateModal } from "@/components/meal-editor-v2/AutoGenerateModal";
import { AssistedPlanModal } from "@/components/meal-editor-v2/AssistedPlanModal";
import { MealVisualLibraryModal } from "@/components/meal-editor-v2/MealVisualLibraryModal";
import { ValidationCorrectionPanel, type ValidationResult } from "@/components/meal-editor-v2/ValidationCorrectionPanel";
import AutoFixResultsModal from "@/components/hybrid-builder/AutoFixResultsModal";
import { CURRENT_ENGINE_VERSION } from "@/lib/engineVersionGovernance";
import type { AutoFixResult } from "@/lib/autoFixEngine";
import EditorWorkspaceTabs from "@/components/meal-editor-v2/EditorWorkspaceTabs";
import EditorCompactToolbar from "@/components/meal-editor-v2/EditorCompactToolbar";
import { PlanReviewModal } from "@/components/meal-editor-v2/PlanReviewModal";
import { PlanHistoryModal } from "@/components/meal-editor-v2/PlanHistoryModal";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { FileText, History as HistoryIcon, Layout, Monitor, Smartphone, Tablet } from "lucide-react";
import PlanAuditPanel from "@/components/plans/PlanAuditPanel";
import { generatePremiumMealPlanPDF, type PremiumMealPlanPDFData } from "@/lib/pdfExportPremium";
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

  /** Runtime safeguard for schema transitions */
  const checkDefaultPlanColumn = async () => {
    const table = "nutritionist_patients";
    const column = "default_meal_plan_id";
    
    const { error } = await supabase
      .from(table)
      .select(column as any)
      .limit(0);
    
    if (error) {
      // 42703 = undefined_column
      if ((error as any).code === "42703") {
        toast.error(`Erro de Schema: A coluna '${column}' na tabela '${table}' falharia nesta operação.`, {
          description: (
            <div className="flex flex-col gap-2">
              <span>Detectamos um schema drift. Sugestão: rode 'npm run schema:update' no terminal ou verifique as migrações.</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-fit"
                onClick={() => navigate(`/schema-monitor?search=${column}`)}
              >
                Abrir Monitor de Schema
              </Button>
            </div>
          ),
          duration: 10000,
          id: "schema-drift-alert"
        });
        return false;
      }

      
      // Se for erro de permissão (42501) ou outros não relacionados a schema missing, não bloqueamos o fluxo
      // a menos que seja crítico para a função. Aqui apenas avisamos no console.
      if ((error as any).code === "42501") {
        console.warn("Aviso de Permissão/RLS detectado, mas ignorado pelo check de schema:", error.message);
        return true; 
      }

      console.error("Erro inesperado no check de schema:", error);
    }
    return true;
  };
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
  const [lastGenError, setLastGenError] = useState<string | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [autofixResult, setAutofixResult] = useState<AutoFixResult | null>(null);
  const [showAutofixResults, setShowAutofixResults] = useState(false);
  const [autofixWasValid, setAutofixWasValid] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState<"p" | "l">("p");
  const [pdfTheme, setPdfTheme] = useState<"modern" | "classic">("modern");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isDefaultSaving, setIsDefaultSaving] = useState(false);
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

  const [lastAttemptParams, setLastAttemptParams] = useState<any>(() => {
    const saved = localStorage.getItem(`last_gen_params_${id}`);
    return saved ? JSON.parse(saved) : null;
  });


  const exportToPDF = async () => {
    if (!plan || store.items.length === 0) return;
    setExportingPDF(true);
    const toastId = toast.loading("Gerando PDF Premium...");
    try {
      const { data: profProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user?.id)
        .maybeSingle();

      const nutritionistName = profProfile?.full_name || "Seu Nutricionista";

      // Prepare data for the premium export engine
      const pdfData: PremiumMealPlanPDFData = {
        planTitle: plan.title || "Plano Alimentar",
        patientName: store.patientName || "Paciente",
        nutritionistName: nutritionistName,
        startDate: new Date(plan.start_date || new Date()).toLocaleDateString("pt-BR"),
        planMode: plan.plan_mode || "weekly",
        items: store.items.map(i => ({
          mealType: i.meal_type || "lunch",
          title: i.title || "Refeição",
          description: i.description || undefined,
          calories_target: i.calories_target || undefined,
          protein_target: i.protein_target || undefined,
          carbs_target: i.carbs_target || undefined,
          fat_target: i.fat_target || undefined,
          day_of_week: i.day_of_week ?? undefined,
          is_primary: i.is_primary !== false,
          substitution_group_id: (i as any).substitution_group_id || null,
        })),
        targetCalories: plan.total_target_calories || undefined,
        targetProtein: plan.total_target_protein || undefined,
        targetCarbs: plan.total_target_carbs || undefined,
        targetFat: plan.total_target_fat || undefined,
        notes: plan.description || undefined,
        goal: store.patientGoal || undefined,
      };

      generatePremiumMealPlanPDF(pdfData);
      toast.success("PDF gerado com sucesso!", { id: toastId });
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Erro ao gerar PDF", { id: toastId });
    } finally {
      setExportingPDF(false);
    }
  };

  const handleSaveAsDefault = async () => {
    if (!plan?.patient_id || !user?.id) return;
    
    // Runtime assertion
    if (!(await checkDefaultPlanColumn())) return;

    setIsDefaultSaving(true);
    const toastId = toast.loading("Salvando como template padrão...");
    try {
      const { error } = await supabase
        .from("nutritionist_patients")
        .update({ default_meal_plan_id: plan.id } as any)
        .eq("patient_id", plan.patient_id)
        .eq("nutritionist_id", user.id);
        
      if (error) throw error;
      toast.success("Template salvo como padrão para este paciente!", { id: toastId });
    } catch (err) {
      console.error("Erro ao salvar padrão:", err);
      toast.error("Erro ao salvar padrão", { id: toastId });
    } finally {
      setIsDefaultSaving(false);
    }
  };

  const refreshPlanFromServer = async () => {
    if (!id || !user?.id) return;
    await store.hydrate(id, user.id);
  };

  const handleNotifyWhatsApp = async () => {
    if (!plan?.patient_id || !user?.id) return;
    
    const { data: profProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const profName = profProfile?.full_name || "Seu Nutricionista";
    const appUrl = `${BASE_URL}/plano`;
    
    // Agora usando promptWhatsAppNotification para padronizar o pop-up
    import("@/utils/whatsappNotification").then(({ promptWhatsAppNotification }) => {
      promptWhatsAppNotification({
        patientId: plan.patient_id,
        patientName: store.patientName || "Paciente",
        professionalName: profName,
        type: "meal_plan_ready",
        appUrl
      });
    });
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

  const plan = store.plan;
  const planStatus = (plan as any)?.plan_status || "draft";
  const isImmutable = planStatus === "archived";
  const genSource = (plan as any)?.generation_source || "";
  const isAutoGenerated = /pipeline|onboarding|smart|protocol|auto/i.test(genSource);
  const statusInfo = STATUS_LABELS[planStatus] || STATUS_LABELS.draft;
  const clinicalScore = (plan as any)?.clinical_score || 0;
  const qualityAlerts = (plan as any)?.quality_alerts || [];

  const loadDefaultTemplate = useCallback(async () => {
    if (!plan?.patient_id || !user?.id) return;
    
    // Runtime assertion
    if (!(await checkDefaultPlanColumn())) return;

    const { data: np } = await supabase
      .from("nutritionist_patients")
      .select("default_meal_plan_id")
      .eq("patient_id", plan.patient_id)
      .eq("nutritionist_id", user.id)
      .maybeSingle();
      
    if (np?.default_meal_plan_id) {
      const toastId = toast.loading("Carregando seu template padrão...");
      try {
        const { data: defaultItems } = await supabase
          .from("meal_plan_items")
          .select("*")
          .eq("meal_plan_id", np.default_meal_plan_id);
          
        if (defaultItems && defaultItems.length > 0) {
          const newItems = defaultItems.map(item => ({
            ...item,
            id: undefined,
            meal_plan_id: plan.id,
            created_at: undefined,
            tenant_id: tenantId
          }));
          
          await store.addItems(newItems as any);
          toast.success("Template padrão carregado!", { id: toastId });
        } else {
          toast.dismiss(toastId);
        }
      } catch (err) {
        console.error("Erro ao carregar template padrão:", err);
        toast.error("Erro ao carregar template padrão", { id: toastId });
      }
    }
  }, [plan?.id, plan?.patient_id, user?.id, tenantId, store]);

  // Auto-load default if plan is empty
  useEffect(() => {
    if (store.hydrated && store.items.length === 0 && plan && !isImmutable) {
      loadDefaultTemplate();
    }
  }, [store.hydrated, store.items.length, plan, isImmutable, loadDefaultTemplate]);

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
          <Button variant="ghost" onClick={() => {
            const searchParams = new URLSearchParams(window.location.search);
            const returnTo = searchParams.get('returnTo');
            if (returnTo) {
              navigate(decodeURIComponent(returnTo));
            } else {
              navigate("/meal-plans");
            }
          }}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!plan) return null;

  const planState = resolvePlanState(plan);
  const isPublished = planState.isEffective;
  const isApproved = planState.isApproved;


  // ── Generate new plan (creates a new draft, never touches current plan) ──
  const handleGenerateNewPlan = async () => {
    if (!plan || !user) return;
    
    // No blocking confirm here, just generate
    console.warn("[PLAN] botão clicado");
    console.warn("[PLAN] função iniciou");
    
    const params = {
      patientId: plan.patient_id,
      nutritionistId: user.id,
      tenantId: tenantId || "",
      planTitle: `${plan.title} (Revisão)`,
      startDate: new Date().toISOString().split("T")[0],
      generationMode: "smart" as const,
    };
    
    localStorage.setItem(`last_gen_params_${id}`, JSON.stringify(params));
    setLastAttemptParams(params);

    setGeneratingNew(true);
    setLastGenError(null);
    try {
      console.warn("[PLAN] chamando edge function via pipeline");
      const result = await runPlanPipeline(params);

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
      const msg = err?.message || "Erro ao gerar novo plano";
      setLastGenError(msg);
      toast.error(msg);
    } finally {
      setGeneratingNew(false);
    }
  };

  const handleSave = async () => {
    if (isImmutable) {
      toast.error("🔒 Plano imutável. Crie uma nova versão para editar.");
      return;
    }

    const totalKcal = store.items.reduce((s, i) => s + (Number(i.calories_target) || 0), 0);
    
    // Guardrail Check: calories between days (+/- 5%) and protein (+/- 3%)
    const itemsByDay: Record<number, any[]> = {};
    store.items.forEach(item => {
      const day = Number(item.day_of_week) || 0;
      if (!itemsByDay[day]) itemsByDay[day] = [];
      itemsByDay[day].push(item);
    });

    const dayTotals = Object.entries(itemsByDay).map(([day, items]) => ({
      day: Number(day),
      kcal: items.reduce((s, i) => s + (Number(i.calories_target) || 0), 0),
      protein: items.reduce((s, i) => s + (Number(i.protein_target) || 0), 0),
    })).filter(d => d.kcal > 0);

    if (dayTotals.length > 1) {
      const avgKcal = dayTotals.reduce((s, d) => s + d.kcal, 0) / dayTotals.length;
      const avgProt = dayTotals.reduce((s, d) => s + d.protein, 0) / dayTotals.length;

      const deviations: string[] = [];
      dayTotals.forEach(d => {
        const kcalDev = Math.abs(d.kcal - avgKcal) / avgKcal;
        const protDev = Math.abs(d.protein - avgProt) / avgProt;
        if (kcalDev > 0.05) deviations.push(`Dia ${d.day}: Caloria desviou ${Math.round(kcalDev * 100)}% (máx 5%)`);
        if (protDev > 0.03) deviations.push(`Dia ${d.day}: Proteína desviou ${Math.round(protDev * 100)}% (máx 3%)`);
      });

      if (deviations.length > 0) {
        toast.warning("Desvio de Guardrails Detectado", {
          description: `Os seguintes dias extrapolam os limites clínicos recomendados:\n${deviations.join("\n")}`,
          duration: 6000,
        });
        // Note: We don't block the professional, we just alert.
      }
    }

    if (totalKcal <= 0 && store.items.length > 0) {
      toast.error("O plano não pode ter totais zerados.", {
        description: "Adicione refeições com valores calóricos antes de salvar."
      });
      return;
    }

    setReviewOpen(true);
  };

  const executeFinalSave = async (updatedItems?: any[]) => {
    if (updatedItems && Array.isArray(updatedItems)) {
      updatedItems.forEach(item => {
        store.updateItem(item.id, item);
      });
    }
    setReviewOpen(false);
    setSaving(true);
    const toastId = toast.loading("Salvando e aprovando plano...");
    try {
      // 🛡️ Validação de Marmitas Fixas
      const missingBase = store.items.filter(item => {
        const meta = (item as any).edit_metadata || (item as any).metadata || {};
        return meta.is_fixed && (
          meta.kcal_base === undefined || meta.kcal_base === null ||
          meta.protein_base === undefined || meta.protein_base === null ||
          meta.carbs_base === undefined || meta.carbs_base === null ||
          meta.fat_base === undefined || meta.fat_base === null
        );
      });

      if (missingBase.length > 0) {
        toast.error("Salvamento Bloqueado", {
          description: `Existem ${missingBase.length} marmita(s) fixa(s) com dados base incompletos. Corrija-os no editor de cada item.`
        });
        setSaving(false);
        return;
      }

      // 🛡️ Validação de Substituições antes de salvar
      const subValidation = validatePlanSubstitutions(store.items, store.substitutionCount, store.patientName);
      if (!subValidation.valid && subValidation.errors.some(err => err.includes("Combinação bloqueada"))) {
        toast.error("Erro de Validação", {
          description: "Existem combinações de substituições bloqueadas para esta paciente. Corrija antes de salvar."
        });
        setSaving(false);
        return;
      }

      await store._flushQueue();
      await calculatePlanTotals(plan.id);
      
      if (planStatus === "draft_auto_corrected") {
        await refreshPlanFromServer();
        toast.success("✅ Rascunho salvo com sucesso!", { id: toastId });
        return;
      }

      const approveResult = await savePlanAsApproved(plan.id, user!.id);
      if (!approveResult.success) {
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
      toast.success("✅ Plano publicado com sucesso!", { 
        id: toastId,
        action: {
          label: "Notificar WhatsApp?",
          onClick: handleNotifyWhatsApp
        }
      });
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

    const totalKcal = store.items.reduce((s, i) => s + (Number(i.calories_target) || 0), 0);
    if (totalKcal <= 0 && store.items.length > 0) {
      toast.error("O plano não pode ter totais zerados.", {
        description: "Adicione refeições com valores calóricos antes de salvar."
      });
      setSavingAndPublishing(false);
      return;
    }

    // 🛡️ Validação de Marmitas Fixas
    const missingBase = store.items.filter(item => {
      const meta = (item as any).edit_metadata || (item as any).metadata || {};
      return meta.is_fixed && (
        meta.kcal_base === undefined || meta.kcal_base === null ||
        meta.protein_base === undefined || meta.protein_base === null ||
        meta.carbs_base === undefined || meta.carbs_base === null ||
        meta.fat_base === undefined || meta.fat_base === null
      );
    });

    if (missingBase.length > 0) {
      toast.error("Publicação Bloqueada", {
        description: `Existem ${missingBase.length} marmita(s) fixa(s) com dados base incompletos. Corrija-os antes de publicar.`
      });
      setSavingAndPublishing(false);
      return;
    }

    const toastId = toast.loading("Salvando e publicando plano...");
    try {
    // 🛡️ Validação de Substituições
    const subValidation = validatePlanSubstitutions(store.items, store.substitutionCount, store.patientName);
    if (!subValidation.valid) {
      const hasBlockedCombination = subValidation.errors.some(err => err.includes("Combinação bloqueada"));
      
      if (hasBlockedCombination) {
        toast.error("Erro de Validação", {
          description: "Existem combinações de substituições bloqueadas para esta paciente. Corrija antes de publicar."
        });
        setSavingAndPublishing(false);
        return;
      }

      console.warn("Substituições fora do padrão detectadas, mas prosseguindo a pedido do usuário.");
      toast.info("Atenção: Algumas substituições estão fora do padrão calórico, mas o plano será enviado mesmo assim.");
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

      toast.success("✅ Plano salvo e publicado!", { 
        id: toastId, 
        duration: 5000,
        action: {
          label: "Notificar WhatsApp?",
          onClick: handleNotifyWhatsApp
        }
      });
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
        {/* ── Generation Error Banner ───────────────────────────── */}
        {lastGenError && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive-foreground">
            <AlertTriangle className="w-5 h-5 shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Falha na geração automática</p>
              <p className="text-xs opacity-90 mt-0.5">
                Ocorreu um erro após todas as tentativas automáticas. O editor permanece aberto e seus dados foram preservados.
              </p>
              <p className="text-[10px] mt-1 font-mono opacity-70 italic">{lastGenError}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleGenerateNewPlan}
                disabled={generatingNew}
                className="shrink-0 gap-1.5"
              >
                {generatingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Tentar novamente agora
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLastGenError(null)}
                className="text-destructive hover:bg-destructive/10"
              >
                Dispensar
              </Button>
            </div>
          </div>
        )}

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
              onClick={() => {
                if (isFullscreen) {
                  setIsFullscreen(false);
                } else {
                  const searchParams = new URLSearchParams(window.location.search);
                  const returnTo = searchParams.get('returnTo');
                  if (returnTo) {
                    navigate(decodeURIComponent(returnTo));
                  } else if (plan?.patient_id) {
                    navigate(`/patients/${plan.patient_id}`);
                  } else {
                    navigate("/meal-plans");
                  }
                }
              }}
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

            {/* History */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              className="gap-1.5"
            >
              <HistoryIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
            </Button>

            {/* PDF Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exportingPDF || store.items.length === 0}
                  className="gap-1.5"
                >
                  {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span className="hidden sm:inline">Exportar PDF</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Configurações do PDF</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground uppercase tracking-wider">Orientação</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={pdfOrientation} onValueChange={(v: any) => setPdfOrientation(v)}>
                  <DropdownMenuRadioItem value="p">Retrato (Vertical)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="l">Paisagem (Horizontal)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground uppercase tracking-wider">Tema Visual</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={pdfTheme} onValueChange={(v: any) => setPdfTheme(v)}>
                  <DropdownMenuRadioItem value="modern">Moderno (FitJourney)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="classic">Clássico (Minimalista)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={exportToPDF} className="bg-primary text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground font-bold justify-center mt-1">
                  Gerar PDF Agora
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mode Selector */}
            {!isImmutable && (
              <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5 ml-2">
                <button
                  type="button"
                  onClick={() => store.updatePlan({ plan_mode: "single_day" } as any)}
                  className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                    (plan as any).plan_mode === "single_day" || !(plan as any).plan_mode
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Dia Único
                </button>
                <button
                  type="button"
                  onClick={() => store.updatePlan({ plan_mode: "weekly" } as any)}
                  className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                    (plan as any).plan_mode === "weekly"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semanal
                </button>
              </div>
            )}

            {/* Save as Default */}
            {!isImmutable && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAsDefault}
                disabled={isDefaultSaving}
                className="gap-1.5 ml-2 border-primary/20 hover:bg-primary/5 text-primary"
                title="Tornar este template o padrão para este paciente"
              >
                {isDefaultSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4 fill-primary" />}
                <span className="hidden sm:inline">Definir como Padrão</span>
              </Button>
            )}

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
                  {/* Removed Hybrid Builder V3 link from V2 editor */}
                  {lastAttemptParams && (
                    <DropdownMenuItem 
                      onClick={handleGenerateNewPlan} 
                      className="gap-2 bg-primary/5 text-primary font-bold animate-pulse"
                    >
                      <RefreshCw className="w-4 h-4" /> Recuperar Última Tentativa
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
                onSimplified={(newId) => navigate(`/meal-plans/${newId}`, { replace: true })}
              />
            )}

            {/* Critical action buttons — hidden when immutable */}
            {!isImmutable && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || store.syncStatus === "saving"}
                  className="h-9 px-4"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar Rascunho
                </Button>

                <Button
                  size="sm"
                  onClick={handleSaveAndPublish}
                  disabled={savingAndPublishing || publishing}
                  className="h-9 px-6 gradient-primary text-white border-0 gap-2 shadow-glow font-bold animate-pulse-subtle"
                >
                  {savingAndPublishing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Send className="w-4 h-4 mr-1" />
                  )}
                  Salvar e Enviar ao Paciente
                </Button>
              </div>
            )}

        <PlanHistoryModal
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          patientId={plan.patient_id}
          currentPlanId={plan.id}
          onRestore={(oldPlanId) => {
            setHistoryOpen(false);
            navigate(`/meal-plans/${oldPlanId}`);
            toast.info("Visualizando versão anterior. Clique em 'Rascunho' para editar se necessário.");
          }}
        />
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
        <PlanReviewModal
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          items={store.items}
          onConfirm={(updated) => executeFinalSave(updated)}
          isSaving={saving}
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
