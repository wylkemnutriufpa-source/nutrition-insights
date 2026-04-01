import { useState, useCallback } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { supabase } from "@/integrations/supabase/client";
import { autoFixMealPlan, type AutoFixResult, type AutoFixStep, AUTOFIX_STEP_LABELS } from "@/lib/autoFixEngine";
import AutoFixPreviewModal from "./AutoFixPreviewModal";
import AutoFixProgressModal from "./AutoFixProgressModal";

interface Props {
  mealPlanId: string;
  patientId: string;
  onFixed?: (newPlanId: string) => void;
  disabled?: boolean;
}

export default function AutoFixButton({ mealPlanId, patientId, onFixed, disabled }: Props) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<AutoFixStep>("loading_context");
  const [showProgress, setShowProgress] = useState(false);
  const [result, setResult] = useState<AutoFixResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleStep = useCallback((step: AutoFixStep) => {
    setCurrentStep(step);
  }, []);

  const handleAutoFix = async () => {
    console.log("[AutoFix] 🟡 handleAutoFix CALLED", { mealPlanId, patientId, userId: user?.id, tenantId, disabled, loading });
    if (!user || !tenantId) {
      console.error("[AutoFix] ❌ BLOCKED — missing user or tenantId", { user: !!user, tenantId });
      return;
    }
    setLoading(true);
    setShowProgress(true);
    setCurrentStep("loading_context");

    try {
      console.log("[AutoFix] 🔄 Calling autoFixMealPlan...");
      const res = await autoFixMealPlan(mealPlanId, patientId, user.id, tenantId, handleStep);
      console.log("[AutoFix] ✅ autoFixMealPlan returned", { success: res.success, newPlanId: res.newPlanId, changesCount: res.changes.length, warnings: res.warnings });
      setResult(res);
      setShowProgress(false);

      if (res.success && res.newPlanId) {
        // Auto-validate the new plan
        try {
          console.log("[AutoFix] 🔄 Validating new plan...", res.newPlanId);
          const { data: valData } = await supabase.functions.invoke("validate-meal-plan", {
            body: { meal_plan_id: res.newPlanId },
          });
          console.log("[AutoFix] ✅ Validation result", valData);
          if (valData?.success) {
            toast.success(`Plano corrigido e APROVADO! Score: ${valData.score}/100 ✅`);
          } else {
            toast.success(`Plano corrigido! ${res.changes.length} correções. Score: ${valData?.score ?? "?"}/100 — revise antes de publicar.`);
          }
        } catch (valErr) {
          console.warn("[AutoFix] ⚠️ Validation call failed", valErr);
          toast.success(`Plano corrigido! ${res.changes.length} correções aplicadas.`);
        }
        console.log("[AutoFix] 🟢 Showing preview modal, newPlanId =", res.newPlanId);
        setShowResult(true);
      } else {
        console.error("[AutoFix] ❌ AutoFix failed", res.warnings);
        toast.error(res.warnings[0] || "Erro ao corrigir plano");
      }
    } catch (e: any) {
      console.error("[AutoFix] 💥 Exception", e);
      setShowProgress(false);
      toast.error(e.message || "Erro inesperado");
    }
    setLoading(false);
  };

  return (
    <>
      <Button
        onClick={handleAutoFix}
        disabled={loading || disabled}
        className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg w-full"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> {AUTOFIX_STEP_LABELS[currentStep]}</>
        ) : (
          <><Wand2 className="w-4 h-4" /> Corrigir automaticamente</>
        )}
      </Button>

      <AutoFixProgressModal
        open={showProgress}
        currentStep={currentStep}
      />

      {result && (
        <AutoFixPreviewModal
          open={showResult}
          onOpenChange={setShowResult}
          result={result}
          onApprove={() => {
            setShowResult(false);
            if (result.newPlanId) onFixed?.(result.newPlanId);
          }}
        />
      )}
    </>
  );
}
