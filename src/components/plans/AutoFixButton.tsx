import { useState, useCallback, useEffect, useRef, type MutableRefObject } from "react";
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
  onFixed?: (newPlanId: string, inPlace?: boolean) => void;
  disabled?: boolean;
  triggerRef?: MutableRefObject<(() => void) | null>;
  autoRunSignal?: number;
}

export default function AutoFixButton({ mealPlanId, patientId, onFixed, disabled, triggerRef, autoRunSignal }: Props) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<AutoFixStep>("loading_context");
  const [showProgress, setShowProgress] = useState(false);
  const [result, setResult] = useState<AutoFixResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const lastAutoRunSignalRef = useRef<number | undefined>(undefined);

  const handleStep = useCallback((step: AutoFixStep) => {
    setCurrentStep(step);
  }, []);

  const handleAutoFix = useCallback(async () => {
    if (!user) {
      toast.error("Usuário não autenticado. Reabra o plano e tente novamente.");
      return;
    }

    if (!tenantId) {
      toast.error("Contexto da clínica não carregado. Aguarde alguns segundos e tente novamente.");
      return;
    }

    setLoading(true);
    setShowProgress(true);
    setCurrentStep("loading_context");

    try {
      const res = await autoFixMealPlan(mealPlanId, patientId, user.id, tenantId, handleStep);
      setResult(res);
      setShowProgress(false);

      if (res.success && res.newPlanId) {
        try {
          const { data: valData } = await supabase.functions.invoke("validate-meal-plan", {
            body: { meal_plan_id: res.newPlanId },
          });
          if (valData?.success) {
            toast.success(`Plano corrigido e APROVADO! Score: ${valData.score}/100 ✅`);
          } else {
            toast.success(`Plano corrigido! ${res.changes.length} correções. Score: ${valData?.score ?? "?"}/100`);
          }
        } catch {
          toast.success(`Plano corrigido! ${res.changes.length} correções aplicadas.`);
        }

        setShowResult(true);
      } else {
        toast.error(res.warnings[0] || "Erro ao corrigir plano");
      }
    } catch (e: any) {
      setShowProgress(false);
      toast.error(e.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }, [handleStep, mealPlanId, patientId, tenantId, user]);

  useEffect(() => {
    if (triggerRef) {
      triggerRef.current = () => {
        void handleAutoFix();
      };
    }
    return () => {
      if (triggerRef) triggerRef.current = null;
    };
  }, [handleAutoFix, triggerRef]);

  useEffect(() => {
    if (!autoRunSignal) return;
    if (lastAutoRunSignalRef.current === autoRunSignal) return;

    lastAutoRunSignalRef.current = autoRunSignal;
    void handleAutoFix();
  }, [autoRunSignal, handleAutoFix]);

  return (
    <>
      <Button
        onClick={() => void handleAutoFix()}
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
            if (result.newPlanId) onFixed?.(result.newPlanId, result.inPlace);
          }}
        />
      )}
    </>
  );
}
