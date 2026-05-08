import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Utensils, ArrowRight, ArrowLeft, Loader2, Plus, Sparkles, Wand2, ShieldCheck } from "lucide-react";
import QuickMealEditor from "@/components/in-office/QuickMealEditor";
import { runPlanPipeline } from "@/lib/planPipelineOrchestrator";
import { CURRENT_ENGINE_VERSION } from "@/lib/engineVersionGovernance";

interface Props {
  patientId: string;
  onNext: () => void;
  onPrev: () => void;
  sessionId: string;
}

export default function InOfficeStepMealPlan({ patientId, onNext, onPrev, sessionId }: Props) {
  const { user } = useAuth();
  const [mealPlanId, setMealPlanId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      
      // Get tenant first
      const { data: np } = await supabase
        .from("nutritionist_patients")
        .select("tenant_id")
        .eq("patient_id", patientId)
        .eq("nutritionist_id", user.id)
        .maybeSingle();
      
      if (np?.tenant_id) setTenantId(np.tenant_id);

      // Check if session already has a meal plan
      const { data: session } = await supabase
        .from("in_office_sessions" as any)
        .select("meal_plan_id")
        .eq("id", sessionId)
        .maybeSingle();

      if ((session as any)?.meal_plan_id) {
        setMealPlanId((session as any).meal_plan_id);
        setLoading(false);
        return;
      }

      // Check for existing draft
      const { data: existingPlan } = await supabase
        .from("meal_plans")
        .select("id")
        .eq("patient_id", patientId)
        .eq("nutritionist_id", user.id)
        .in("plan_status", ["draft", "draft_auto_generated"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPlan) {
        setMealPlanId(existingPlan.id);
        await supabase.from("in_office_sessions" as any).update({ meal_plan_id: existingPlan.id } as any).eq("id", sessionId);
      }
      setLoading(false);
    })();
  }, [user?.id, sessionId, patientId]);

  const createNewPlan = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: np } = await supabase
        .from("nutritionist_patients")
        .select("tenant_id")
        .eq("patient_id", patientId)
        .eq("nutritionist_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!np?.tenant_id) {
        toast.error("Vínculo com paciente não encontrado.");
        setLoading(false);
        return;
      }

      const { data: plan, error } = await supabase
        .from("meal_plans")
        .insert({
          patient_id: patientId,
          nutritionist_id: user.id,
          tenant_id: np.tenant_id,
          title: "Plano Presencial — " + new Date().toLocaleDateString("pt-BR"),
          plan_status: "draft",
          is_active: false,
          start_date: new Date().toISOString().split("T")[0],
          plan_mode: "single_day",
        })
        .select("id")
        .single();

      if (error) throw error;
      setMealPlanId(plan.id);
      await supabase.from("in_office_sessions" as any).update({ meal_plan_id: plan.id } as any).eq("id", sessionId);
      toast.success("Plano criado!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const autoGeneratePlan = async () => {
    if (!user?.id || !tenantId) return;
    setLoading(true);
    try {
      // 1. Create a blank plan first (following existing pattern)
      const { data: plan, error: createError } = await supabase
        .from("meal_plans")
        .insert({
          patient_id: patientId,
          nutritionist_id: user.id,
          tenant_id: tenantId,
          title: "Plano FitJourney — " + new Date().toLocaleDateString("pt-BR"),
          plan_status: "draft",
          is_active: false,
          start_date: new Date().toISOString().split("T")[0],
        })
        .select("id")
        .single();

      if (createError) throw createError;

      // 2. Run the pipeline to populate it
      const result = await runPlanPipeline({
        patientId,
        nutritionistId: user.id,
        tenantId: tenantId,
        existingPlanId: plan.id,
        planTitle: "Plano FitJourney",
        startDate: new Date().toISOString().split("T")[0],
        generationMode: "quick",
      });

      if (!result.success) throw new Error(result.warnings?.[0] || "Falha na geração automática");

      setMealPlanPlanId(plan.id);
      await supabase.from("in_office_sessions" as any).update({ meal_plan_id: plan.id } as any).eq("id", sessionId);
      toast.success("Plano gerado com sucesso pelo Motor FitJourney!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const setMealPlanPlanId = (id: string) => {
    setMealPlanId(id);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (!mealPlanId) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-12 text-center space-y-6">
          <div className="relative inline-block">
            <Utensils className="w-16 h-16 mx-auto text-primary/40" />
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute -top-2 -right-2"
            >
              <Sparkles className="w-6 h-6 text-primary" />
            </motion.div>
          </div>
          <div className="max-w-xs mx-auto">
            <h3 className="font-display font-bold text-xl">Plano Alimentar</h3>
            <p className="text-sm text-muted-foreground mt-2">Como deseja iniciar o plano para este atendimento?</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
            <Button onClick={autoGeneratePlan} className="h-24 flex-col gap-2 relative overflow-hidden group shadow-lg shadow-primary/10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-foreground opacity-10 group-hover:opacity-20 transition-opacity" />
              <Wand2 className="w-6 h-6" />
              <div className="text-left">
                <span className="block font-bold">Auto-Gerar</span>
                <span className="block text-[10px] font-normal opacity-70 flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" /> Engine v{CURRENT_ENGINE_VERSION}
                </span>
              </div>
            </Button>

            <Button onClick={createNewPlan} variant="outline" className="h-24 flex-col gap-2 border-primary/20 bg-background/50">
              <Plus className="w-6 h-6 text-primary" />
              <div className="text-left">
                <span className="block font-bold">Manual</span>
                <span className="block text-[10px] font-normal opacity-70">Começar do zero</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <QuickMealEditor mealPlanId={mealPlanId} patientId={patientId} sessionId={sessionId} tenantId={tenantId} />
      {/* Navigation is handled by parent wizard */}
    </div>
  );
}
