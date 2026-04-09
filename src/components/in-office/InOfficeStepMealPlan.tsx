import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Utensils, ArrowRight, ArrowLeft, Loader2, Plus } from "lucide-react";
import QuickMealEditor from "@/components/in-office/QuickMealEditor";

interface Props {
  patientId: string;
  onNext: () => void;
  onPrev: () => void;
  sessionId: string;
}

export default function InOfficeStepMealPlan({ patientId, onNext, onPrev, sessionId }: Props) {
  const { user } = useAuth();
  const [mealPlanId, setMealPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
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
        .maybeSingle();

      const { data: plan, error } = await supabase
        .from("meal_plans")
        .insert({
          patient_id: patientId,
          nutritionist_id: user.id,
          tenant_id: np?.tenant_id || "",
          title: "Plano Presencial — " + new Date().toLocaleDateString("pt-BR"),
          plan_status: "draft",
          start_date: new Date().toISOString().split("T")[0],
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

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (!mealPlanId) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <Utensils className="w-12 h-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="font-display font-bold text-lg">Plano Alimentar</h3>
            <p className="text-sm text-muted-foreground">Crie um novo plano para este atendimento presencial</p>
          </div>
          <Button onClick={createNewPlan} className="gap-2">
            <Plus className="w-4 h-4" /> Criar Plano Presencial
          </Button>
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onPrev} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <Button variant="ghost" onClick={onNext} className="gap-2 text-muted-foreground">
              Pular <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <QuickMealEditor mealPlanId={mealPlanId} patientId={patientId} sessionId={sessionId} />
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onPrev} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button onClick={async () => {
          await supabase.from("in_office_sessions" as any).update({ meal_plan_completed: true } as any).eq("id", sessionId);
          onNext();
        }} className="gap-2">
          Próximo <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
