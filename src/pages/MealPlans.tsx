import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useExperienceUI } from "@/hooks/useExperienceUI";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import { supabase } from "@/integrations/supabase/client";
import { activateMealPlan, deactivateMealPlan, resolvePlanState } from "@/lib/serverTransitions";
import { autoMatchSingle } from "@/lib/mealVisualAssociation";
import { friendlyEdgeFunctionError } from "@/lib/edgeFunctionErrorHelper";
import { createMealPlanDraft } from "@/lib/createMealPlanDraft";
import { finalizeGeneratedMealPlan } from "@/lib/finalizeGeneratedMealPlan";
import {
  inspectOnboardingPlan,
  resolveLatestUsableOnboardingPlan,
  resolveLatestOnboardingPipeline,
  resolvePatientIdentity,
  syncPipelineGeneratedPlan,
} from "@/lib/onboardingPlanResolver";

/** After AI generates a plan, resolve visuals for all its items */
async function runPostGenVisualMatch(planId: string) {
  const { data: items } = await supabase
    .from("meal_plan_items")
    .select("id, title, description, visual_library_item_id" as any)
    .eq("meal_plan_id", planId);
  if (!items) return;
  await Promise.allSettled(
    (items as any[])
      .filter((i) => !i.visual_library_item_id && i.title)
      .map(async (item) => {
        const visualId = await autoMatchSingle(item.title, item.description ?? undefined);
        if (visualId) {
          await supabase
            .from("meal_plan_items")
            .update({ visual_library_item_id: visualId } as any)
            .eq("id", item.id);
        }
      })
  );
}
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList, Plus, Calendar, ToggleLeft, ToggleRight, PencilLine, Trash2, Zap, RefreshCw, Sparkles } from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import GenerationModeSelector from "@/components/hybrid-builder/GenerationModeSelector";
import { classifyPlanLoadError, type ClassifiedPlanLoadError } from "@/lib/planLoadErrorClassifier";
import { getPlanStatusMeta, KNOWN_PLAN_STATUS_KEYS, isTrulyUnknownPlanStatus } from "@/lib/planStatusLabels";

type MealPlan = Tables<"meal_plans">;

const STATUS_FILTER_ALL = "__all__";
const STATUS_FILTER_UNKNOWN = "__unknown__";
const STATUS_FILTER_STORAGE_KEY = "fitjourney:meal-plans:status-filter";

/**
 * Lê o filtro inicial (1) da URL `?status=...` (prioridade) ou (2) do
 * localStorage. Mantém compat com valores legados (string vazia → ALL).
 */
function readInitialStatusFilter(searchParams: URLSearchParams): string {
  const fromUrl = searchParams.get("status");
  if (fromUrl && fromUrl.trim() !== "") return fromUrl;
  if (typeof window === "undefined") return STATUS_FILTER_ALL;
  try {
    const stored = window.localStorage.getItem(STATUS_FILTER_STORAGE_KEY);
    if (stored && stored.trim() !== "") return stored;
  } catch {
    // ignore (modo privado / storage indisponível)
  }
  return STATUS_FILTER_ALL;
}

export default function MealPlans() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSimplifiedActions, showProtocols } = useExperienceUI();
  const [plans, setPlans] = useState<(MealPlan & { patient_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ClassifiedPlanLoadError | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(() => readInitialStatusFilter(searchParams));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", patient_id: "",
    start_date: new Date().toISOString().split("T")[0],
    autoGenerate: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const onboardingHandled = useRef<string | null>(null);

  // Persiste o filtro de plan_status em URL (?status=) e localStorage para
  // sobreviver a F5 e compartilhamento de link.
  useEffect(() => {
    try {
      if (statusFilter === STATUS_FILTER_ALL) {
        window.localStorage.removeItem(STATUS_FILTER_STORAGE_KEY);
      } else {
        window.localStorage.setItem(STATUS_FILTER_STORAGE_KEY, statusFilter);
      }
    } catch {
      // ignore
    }
    const next = new URLSearchParams(searchParams);
    if (statusFilter === STATUS_FILTER_ALL) {
      if (next.has("status")) {
        next.delete("status");
        setSearchParams(next, { replace: true });
      }
    } else if (next.get("status") !== statusFilter) {
      next.set("status", statusFilter);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchPlans = async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    let query = supabase.from("meal_plans").select("*")
      .eq("nutritionist_id", user.id).order("created_at", { ascending: false });
    
    // Filtro por tipo/editor (V2 vs V3)
    if (statusFilter === "v3_only") {
      query = query.eq('generation_source', 'v3');
    } else if (statusFilter === "v2_only") {
      query = query.neq('generation_source', 'v3');
    }

    const { data, error } = await withTenantFilter(query, tenantId);
    if (error) {
      console.error("[MealPlans] Falha ao buscar planos:", error);
      setLoadError(classifyPlanLoadError(error));
      setPlans([]);
      setLoading(false);
      return;
    }
    if (data) {
      const patientIds = Array.from(new Set(data.map((p: any) => p.patient_id).filter(Boolean)));
      const nameMap = new Map<string, string>();
      if (patientIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", patientIds);
        (profiles || []).forEach((p: any) => nameMap.set(p.user_id, p.full_name || "Paciente"));
      }
      const enriched = data.map((p: any) => ({ ...p, patient_name: nameMap.get(p.patient_id) || "Paciente" }));
      setPlans(enriched);

      // Anomalous drop detection
      const patientIdFilter = searchParams.get("patient_id") || searchParams.get("patientId");
      if (patientIdFilter) {
        import("@/lib/planDiagnostics").then(({ checkPlanAnomalies }) => {
          checkPlanAnomalies(patientIdFilter, enriched.length);
        });
      }
    }
    setLoading(false);
  };

  const fetchPatients = async () => {
    if (!user) return;
    let npQuery = supabase.from("nutritionist_patients").select("patient_id")
      .eq("nutritionist_id", user.id).eq("status", "active");
    const { data } = await withTenantFilter(npQuery, tenantId);
    if (data) {
      const pts = await Promise.all(data.map(async (d) => {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", d.patient_id).single();
        return { id: d.patient_id, name: profile?.full_name || "Paciente" };
      }));
      setPatients(pts);
    }
  };

  // Handle patientId param: auto-open dialog for "Do Zero" or resolve onboarding plan
  useEffect(() => {
    if (!user?.id) return;
    const source = searchParams.get("source");
    const patientId = searchParams.get("patientId");
    if (!patientId) return;

    // "Do Zero": open create dialog with patient pre-selected
    if (source !== "onboarding") {
      setForm(f => ({ ...f, patient_id: patientId }));
      setOpen(true);
      return;
    }

    // Prevent duplicate handling for the same patientId
    if (onboardingHandled.current === patientId) return;
    onboardingHandled.current = patientId;

    const handleOnboardingSource = async () => {
      try {
        const patientIdentity = await resolvePatientIdentity(patientId);

        // 1. Check if pipeline has a usable generated plan
        const pipelineData = await resolveLatestOnboardingPipeline(patientId);

        if (pipelineData?.generated_plan_id && pipelineData?.plan_generated) {
          const pipelinePlan = await inspectOnboardingPlan(pipelineData.generated_plan_id);
          if (pipelinePlan?.isUsable) {
            navigate(`/meal-plans/${pipelineData.generated_plan_id}`, { replace: true });
            return;
          }
          console.warn("Pipeline plan is stale/archived, looking for alternatives...");
        }

        // 2. Check if patient has any current usable plan and re-link pipeline if needed
        const existingPlan = await resolveLatestUsableOnboardingPlan(patientId, user.id);

        if (existingPlan?.id) {
          if (pipelineData?.id && pipelineData.generated_plan_id !== existingPlan.id) {
            await syncPipelineGeneratedPlan(pipelineData.id, existingPlan.id);
          }
          navigate(`/meal-plans/${existingPlan.id}`, { replace: true });
          return;
        }

        // 3. No usable plan exists — generate from onboarding
        toast.info("Gerando plano a partir do onboarding...");
        const { data: genData, error: genError } = await supabase.functions.invoke("generate-meal-plan", {
          body: {
            patientId: patientIdentity.canonicalId,
            nutritionistId: user.id,
            isPipeline: true,
          },
        });

        if (genError) {
          console.error("Generate plan error:", genError);
          const friendlyMsg = await friendlyEdgeFunctionError(genError, "Erro ao gerar plano. Tente novamente.");
          toast.error(friendlyMsg);
          onboardingHandled.current = null;
          return;
        }

        if (!genData?.success) {
          console.error("Generate plan failed:", genData);
          // Try to map the error code from response
          const errorCode = genData?.code || genData?.error || "Resposta inválida";
          const friendlyMsg = await friendlyEdgeFunctionError(
            { message: errorCode },
            genData?.error || "Erro ao gerar plano. Tente novamente."
          );
          toast.error(friendlyMsg);
          onboardingHandled.current = null;
          return;
        }

        const newPlanId = genData.mealPlanId;
        if (newPlanId) {
          const finalized = await finalizeGeneratedMealPlan({
            planId: newPlanId,
            patientId: patientIdentity.canonicalId,
            userId: user.id,
            tenantId,
          });
          const resolvedPlanId = finalized.finalPlanId;

          if (pipelineData?.id && pipelineData.generated_plan_id !== resolvedPlanId) {
            await syncPipelineGeneratedPlan(pipelineData.id, resolvedPlanId);
          }

          toast.success(finalized.corrected
            ? `Plano gerado e ajustado automaticamente!`
            : `Plano gerado com ${genData.items_count || 0} itens!`);
          runPostGenVisualMatch(resolvedPlanId).catch(() => {});
          navigate(`/meal-plans/${resolvedPlanId}`, { replace: true });
        } else {
          toast.error("Plano gerado mas sem ID retornado. Tente novamente.");
          onboardingHandled.current = null;
        }
      } catch (err: any) {
        console.error("Onboarding source error:", err);
        const friendlyMsg = await friendlyEdgeFunctionError(err, "Erro ao processar onboarding. Tente novamente.");
        toast.error(friendlyMsg);
        // Allow retry on error
        onboardingHandled.current = null;
      }
    };

    handleOnboardingSource();
  }, [user?.id, searchParams, navigate]);

  useEffect(() => { fetchPlans(); fetchPatients(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.patient_id) return;
    setSubmitting(true);
    try {
      if (form.autoGenerate) {
        // Fetch active plan to get template_id if available
        const { data: activePlan } = await supabase
          .from("meal_plans")
          .select("template_id")
          .eq("patient_id", form.patient_id)
          .eq("is_active", true)
          .maybeSingle();

        // Use the generate-meal-plan edge function
        toast.info("Gerando plano automaticamente...");
        const { data: genData, error: genError } = await supabase.functions.invoke("generate-meal-plan", {
          body: {
            patientId: form.patient_id,
            nutritionistId: user.id,
            isPipeline: false,
            template_id: activePlan?.template_id || undefined,
          },
        });
        if (genError || !genData?.success) {
          const msg = genError 
            ? await friendlyEdgeFunctionError(genError, "Erro ao gerar plano") 
            : (genData?.error || "Tente novamente");
          toast.error(msg);
        } else {
          if (genData.is_fallback_template) {
            toast.info(`Nota: Nenhum plano anterior encontrado. Usamos o template padrão "${genData.template_name_used || "Base"}" como fallback.`, { duration: 6000 });
          } else if (genData.template_name_used) {
            toast.success(`Plano gerado usando o template: ${genData.template_name_used}`);
          }
          toast.success(`Plano gerado com ${genData.items_count || 0} refeições!`);
          runPostGenVisualMatch(genData.mealPlanId).catch(() => {});
          setOpen(false);
          navigate(`/meal-plans/${genData.mealPlanId}`);
        }
      } else {
        const { data: newPlan, error } = await createMealPlanDraft({
          nutritionistId: user.id,
          patientId: form.patient_id,
          tenantId,
          title: form.title || "Plano Alimentar",
          description: form.description || null,
          startDate: form.start_date,
        });
        if (error) { toast.error("Erro: " + error.message); }
        else if (newPlan) {
          toast.success("Plano criado! Abrindo Builder...");
          setOpen(false);
          navigate(`/meal-plan-editor-v3?planId=${newPlan.id}`, { replace: true });
        }
      }
      setForm({ title: "", description: "", patient_id: "", start_date: new Date().toISOString().split("T")[0], autoGenerate: true });
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Tente novamente"));
    }
    setSubmitting(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    if (!user) return;
    const toastId = toast.loading(current ? "Desativando plano..." : "Ativando plano...");
    try {
      if (current) {
        // Server-authoritative deactivation
        const result = await deactivateMealPlan(id, user.id);
        if (!result.success) { toast.error(result.error || "Erro ao desativar", { id: toastId }); }
        else { toast.success("Plano desativado.", { id: toastId }); }
      } else {
        // Server-authoritative activation (ensures single active plan)
        const result = await activateMealPlan(id);
        if (!result.success) { toast.error(result.error || "Erro ao ativar plano", { id: toastId }); }
        else { toast.success("Plano ativado com segurança!", { id: toastId }); }
      }
      fetchPlans();
    } catch (err: any) {
      toast.error("Erro inesperado: " + err.message, { id: toastId });
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente este plano e todas as suas refeições?")) return;
    
    try {
      // Step 1: Archive the plan first (required by trigger protect_approved_meal_plans)
      const { error: archiveErr } = await supabase
        .from("meal_plans")
        .update({ is_active: false, plan_status: "archived" })
        .eq("id", id);
      
      if (archiveErr) {
        console.error("[MealPlans] Failed to archive before delete:", archiveErr);
        toast.error("Erro ao preparar exclusão: " + archiveErr.message);
        return;
      }

      // Step 2: Delete items (now safe — plan is archived, trigger allows)
      if (!id) {
        console.error("[CRITICAL] DELETE bloqueado: planId inválido em handleDelete", { id });
        throw new Error("DELETE bloqueado: planId inválido");
      }
      
      console.info("[DELETE] Excluindo itens do plano", { meal_plan_id: id, operation: "handleDeletePlan" });
      
      const { error: itemsErr } = await supabase
        .from("meal_plan_items")
        .delete()
        .eq("meal_plan_id", id);
      
      if (itemsErr) {
        console.error("[MealPlans] Failed to delete items:", itemsErr);
        toast.error("Erro ao excluir refeições: " + itemsErr.message);
        return;
      }

      // Step 3: Delete the plan itself
      const { error } = await supabase.from("meal_plans").delete().eq("id", id);
      
      if (error) {
        toast.error("Erro ao deletar plano: " + error.message);
        return;
      }

      toast.success("Plano excluído definitivamente.");
      const { invalidateCriticalQueries } = await import("@/lib/queryInvalidation");
      const qc = (window as any).__REACT_QUERY_CLIENT__;
      if (qc) invalidateCriticalQueries(qc);
      fetchPlans();
    } catch (e: any) {
      console.error("[MealPlans] Unexpected delete error:", e);
      toast.error("Erro inesperado ao excluir plano.");
    }
  };

  // Count effective plans using normalized state
  const effectivePlansCount = plans.filter(p => resolvePlanState(p).isEffective).length;

  // Counts per plan_status (for the filter dropdown badges)
  // IMPORTANT: para a chave de catálogo usamos `|| "draft"` (rótulo amigável),
  // mas para classificar "Desconhecido" usamos o valor cru via
  // `isTrulyUnknownPlanStatus` — assim ausência (null/"") NÃO entra no bucket
  // "Desconhecido" e não infla a contagem indevidamente.
  const statusCounts = plans.reduce<Record<string, number>>((acc, p) => {
    const k = (p.plan_status as string) || "draft";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const statusKeysPresent = Object.keys(statusCounts).sort();
  const unknownStatusCount = plans.filter((p) =>
    isTrulyUnknownPlanStatus(p.plan_status as string | null | undefined),
  ).length;

  const filteredPlans = plans.filter((p) => {
    if (statusFilter === STATUS_FILTER_ALL) return true;
    if (statusFilter === "v3_only") return (p as any).generation_source === 'v3';
    if (statusFilter === "v2_only") return (p as any).generation_source !== 'v3';
    if (statusFilter === STATUS_FILTER_UNKNOWN) {
      return isTrulyUnknownPlanStatus(p.plan_status as string | null | undefined);
    }
    const k = (p.plan_status as string) || "draft";
    return k === statusFilter;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-7 h-7 text-primary" /> Planos Alimentares
            </h1>
            <p className="text-muted-foreground text-sm">
              {showSimplifiedActions
                ? `${effectivePlansCount} planos ativos`
                : `${effectivePlansCount} planos ativos · Gerencie todos os planos alimentares`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPlans}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refazer sincronização
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/plan-audit">
                <ClipboardList className="w-4 h-4" /> Auditoria de Planos
              </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary gap-2 shadow-glow">
                  <Plus className="w-4 h-4" /> Novo Plano
                </Button>
              </DialogTrigger>
            <DialogContent className="w-[calc(100vw-1rem)] sm:w-[95vw] max-w-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-3 sm:p-6">
              <DialogHeader className="pr-10">
                <DialogTitle className="font-display text-base sm:text-lg">Criar Plano Alimentar</DialogTitle>
              </DialogHeader>
              {/* Patient selector */}
              <div className="space-y-4">
                <div>
                  <Label>Paciente</Label>
                  <select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                    <option value="">Selecione...</option>
                    {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                {form.patient_id ? (
                  <GenerationModeSelector
                    patientId={form.patient_id}
                    onGenerated={() => {
                      setOpen(false);
                      fetchPlans();
                    }}
                  />
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <Zap className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Selecione um paciente para gerar o plano
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div
            data-testid="meal-plans-error"
            data-error-kind={loadError.kind}
            className="glass rounded-xl p-10 text-center border border-destructive/30"
          >
            <ClipboardList className="w-12 h-12 mx-auto text-destructive mb-3" />
            <h3 className="font-display font-semibold text-lg mb-1">{loadError.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{loadError.description}</p>
            <details className="text-[11px] text-muted-foreground/80 mb-4">
              <summary className="cursor-pointer">Detalhes técnicos</summary>
              <code className="block mt-1 break-all">{loadError.technicalMessage}</code>
            </details>
            <Button
              variant="outline"
              onClick={() => void fetchPlans()}
              data-testid="meal-plans-retry"
            >
              {loadError.retryLabel}
            </Button>
          </div>
        ) : plans.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-lg mb-1">Nenhum plano ainda</h3>
            <p className="text-muted-foreground">Crie um plano alimentar para seus pacientes.</p>
          </div>
        ) : (
          <>
            {/* Plan status filter */}
            <div className="flex flex-wrap items-center gap-2 mb-2" data-testid="meal-plans-status-filter">
              <Label className="text-xs text-muted-foreground">Filtrar por status:</Label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                data-testid="meal-plans-status-select"
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                <option value={STATUS_FILTER_ALL}>Todos ({plans.length})</option>
                <option value="v3_only">Apenas Smart V3</option>
                <option value="v2_only">Apenas Clássico V2</option>
                {statusKeysPresent
                  .filter((k) => KNOWN_PLAN_STATUS_KEYS.includes(k))
                  .map((k) => {
                    const meta = getPlanStatusMeta(k);
                    return (
                      <option key={k} value={k}>
                        {meta.label} ({statusCounts[k]})
                      </option>
                    );
                  })}
                {unknownStatusCount > 0 && (
                  <option value={STATUS_FILTER_UNKNOWN}>
                    Desconhecido ({unknownStatusCount})
                  </option>
                )}
              </select>
              <span
                className="text-xs text-muted-foreground"
                data-testid="meal-plans-filtered-count"
              >
                {filteredPlans.length} exibido{filteredPlans.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPlans.map((p) => {
              const state = resolvePlanState(p);
              return (
                <motion.div key={p.id} whileHover={{ y: -2 }}
                  className="glass rounded-xl p-5 shadow-card cursor-pointer"
                  onClick={() => navigate(`/meal-plans/${p.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display font-semibold">{p.title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Paciente: {p.patient_name}</p>
                      {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-9 w-9" title="Builder Híbrido"
                        onClick={(e) => { e.stopPropagation(); navigate(`/meal-plan-editor-v3?planId=${p.id}`); }}>
                        <Zap className="w-4 h-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9" title="Editor V3 (Premium)"
                        onClick={(e) => { e.stopPropagation(); navigate(`/meal-plan-editor/${p.id}`); }}>
                        <Sparkles className="w-4 h-4 text-purple-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9" title="Editor Clássico V2"
                        onClick={(e) => { e.stopPropagation(); navigate(`/meal-plans/${p.id}`); }}>
                        <PencilLine className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); handleDeletePlan(p.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <button onClick={(e) => { e.stopPropagation(); toggleActive(p.id, state.isEffective || p.is_active); }}
                        className="p-2 rounded-lg hover:bg-muted transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                      >
                        {state.isEffective ? <ToggleRight className="w-6 h-6 text-success" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(p.start_date).toLocaleDateString("pt-BR")}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full ${state.badgeClass}`}>
                      {state.label}
                    </span>
                  </div>
                </motion.div>
              );
            })}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
