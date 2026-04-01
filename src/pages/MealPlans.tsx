import { useEffect, useState, useRef } from "react";
import { useExperienceUI } from "@/hooks/useExperienceUI";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter, getTenantIdForInsert } from "@/lib/tenantQueryHelpers";
import { supabase } from "@/integrations/supabase/client";
import { activateMealPlan, deactivateMealPlan, resolvePlanState } from "@/lib/serverTransitions";
import { autoMatchSingle } from "@/lib/mealVisualAssociation";

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
import { ClipboardList, Plus, Calendar, ToggleLeft, ToggleRight, PencilLine, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type MealPlan = Tables<"meal_plans">;

export default function MealPlans() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSimplifiedActions, showProtocols } = useExperienceUI();
  const [plans, setPlans] = useState<(MealPlan & { patient_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", patient_id: "",
    start_date: new Date().toISOString().split("T")[0],
    autoGenerate: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const onboardingHandled = useRef(false);

  const fetchPlans = async () => {
    if (!user) return;
    let query = supabase.from("meal_plans").select("*")
      .eq("nutritionist_id", user.id).order("created_at", { ascending: false });
    const { data } = await withTenantFilter(query, tenantId);
    if (data) {
      const enriched = await Promise.all(data.map(async (p) => {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", p.patient_id).single();
        return { ...p, patient_name: profile?.full_name || "Paciente" };
      }));
      setPlans(enriched);
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

  // Handle source=onboarding: find existing plan from onboarding pipeline or generate
  useEffect(() => {
    if (!user?.id || onboardingHandled.current) return;
    const source = searchParams.get("source");
    const patientId = searchParams.get("patientId");
    if (source !== "onboarding" || !patientId) return;

    onboardingHandled.current = true;

    const handleOnboardingSource = async () => {
      try {
        // Check if there's an existing pipeline with a generated plan
        const { data: pipeline } = await (supabase
          .from("onboarding_pipelines" as any)
          .select("generated_plan_id, plan_generated")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle() as any);

        const pipelineData = pipeline as { generated_plan_id?: string; plan_generated?: boolean } | null;

        if (pipelineData?.generated_plan_id && pipelineData?.plan_generated) {
          // Verify the plan actually has items before redirecting
          const { count: itemCount } = await supabase
            .from("meal_plan_items")
            .select("id", { count: "exact", head: true })
            .eq("meal_plan_id", pipelineData.generated_plan_id);

          if (itemCount && itemCount > 0) {
            navigate(`/meal-plans/${pipelineData.generated_plan_id}`, { replace: true });
            return;
          }
          // Plan is empty — fall through to generate a new one
          console.warn("Pipeline plan has 0 items, regenerating...");
        }

        // Check if patient has any existing draft/active plan
        const { data: existingPlan } = await supabase
          .from("meal_plans")
          .select("id")
          .eq("patient_id", patientId)
          .eq("nutritionist_id", user.id)
          .in("plan_status", ["draft", "in_review", "approved"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingPlan?.id) {
          navigate(`/meal-plans/${existingPlan.id}`, { replace: true });
          return;
        }

        // No plan exists — generate from onboarding
        toast.info("Gerando plano a partir do onboarding...");
        const { data: genData, error: genError } = await supabase.functions.invoke("generate-meal-plan", {
          body: {
            patientId,
            nutritionistId: user.id,
            isPipeline: true,
          },
        });

        if (genError || !genData?.success) {
          toast.error("Erro ao gerar plano: " + (genError?.message || genData?.error || "Tente novamente"));
          return;
        }

        const newPlanId = genData.mealPlanId;
        if (newPlanId) {
          toast.success(`Plano gerado com ${genData.items_count || 0} itens!`);
          // Auto-resolve visuals for newly generated items
          runPostGenVisualMatch(newPlanId).catch(() => {});
          navigate(`/meal-plans/${newPlanId}`, { replace: true });
        }
      } catch (err: any) {
        toast.error("Erro ao processar onboarding: " + (err.message || "Tente novamente"));
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
        // Use the generate-meal-plan edge function
        toast.info("Gerando plano automaticamente...");
        const { data: genData, error: genError } = await supabase.functions.invoke("generate-meal-plan", {
          body: {
            patientId: form.patient_id,
            nutritionistId: user.id,
            isPipeline: false,
          },
        });
        if (genError || !genData?.success) {
          toast.error("Erro ao gerar: " + (genError?.message || genData?.error || "Tente novamente"));
        } else {
          toast.success(`Plano gerado com ${genData.items_count || 0} refeições!`);
          setOpen(false);
          navigate(`/meal-plans/${genData.mealPlanId}`);
        }
      } else {
        const { error } = await supabase.from("meal_plans").insert({
          nutritionist_id: user.id, patient_id: form.patient_id,
          title: form.title || "Plano Alimentar", description: form.description || null, start_date: form.start_date,
          ...getTenantIdForInsert(tenantId),
        } as any);
        if (error) { toast.error("Erro: " + error.message); }
        else {
          toast.success("Plano criado!");
          setOpen(false);
          fetchPlans();
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
    if (current) {
      // Server-authoritative deactivation
      const result = await deactivateMealPlan(id, user.id);
      if (!result.success) { toast.error(result.error || "Erro ao desativar"); }
      else { toast.success("Plano desativado."); }
    } else {
      // Server-authoritative activation (ensures single active plan)
      const result = await activateMealPlan(id);
      if (!result.success) { toast.error(result.error || "Erro ao ativar plano"); }
      else { toast.success("Plano ativado com segurança!"); }
    }
    fetchPlans();
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente este plano e todas as suas refeições?")) return;
    
    await supabase.from("meal_plan_items").delete().eq("meal_plan_id", id);
    const { error } = await supabase.from("meal_plans").delete().eq("id", id);
    
    if (error) { toast.error("Erro ao deletar: " + error.message); }
    else { toast.success("Plano excluído definitivamente."); fetchPlans(); }
  };

  // Count effective plans using normalized state
  const effectivePlansCount = plans.filter(p => resolvePlanState(p).isEffective).length;

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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2 shadow-glow">
                <Plus className="w-4 h-4" /> Novo Plano
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">Criar Plano Alimentar</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Paciente</Label>
                  <select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                    <option value="">Selecione...</option>
                    {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <input type="checkbox" id="autoGen" checked={form.autoGenerate}
                    onChange={(e) => setForm({ ...form, autoGenerate: e.target.checked })}
                    className="h-4 w-4 rounded border-primary text-primary" />
                  <label htmlFor="autoGen" className="text-sm flex-1">
                    <span className="font-medium">🤖 Gerar automaticamente</span>
                    <span className="block text-xs text-muted-foreground">Protocolo FitJourney gera refeições com base na anamnese do paciente</span>
                  </label>
                </div>
                {!form.autoGenerate && (
                  <>
                    <div>
                      <Label>Título</Label>
                      <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Plano de emagrecimento" required={!form.autoGenerate} />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <div>
                      <Label>Data de início</Label>
                      <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
                    </div>
                  </>
                )}
                <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                  {submitting ? "Gerando..." : form.autoGenerate ? "🚀 Gerar Plano Automático" : "Criar Plano Manual"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-lg mb-1">Nenhum plano ainda</h3>
            <p className="text-muted-foreground">Crie um plano alimentar para seus pacientes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((p) => {
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
                      <Button variant="ghost" size="icon" className="h-9 w-9"
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
        )}
      </div>
    </DashboardLayout>
  );
}
