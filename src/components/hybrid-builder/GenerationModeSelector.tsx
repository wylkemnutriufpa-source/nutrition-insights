import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Compass, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { friendlyEdgeFunctionError } from "@/lib/edgeFunctionErrorHelper";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import StrategyAdvisorPanel from "@/components/strategy-advisor/StrategyAdvisorPanel";
import type { NutritionalStrategy, StrategyMealPreview } from "@/lib/strategyAdvisor";

interface Props {
  patientId: string;
  onGenerated: () => void;
}

/**
 * GenerationModeSelector v2.0 — MANDATORY STRATEGY FLOW
 * 
 * RULE: No plan can be generated without first selecting one of the 3
 * strategies produced by the Strategy Advisor. Direct generation is PROHIBITED.
 * 
 * Flow:
 * 1. User clicks "Consultor de Estratégia" (only option)
 * 2. System analyzes patient → generates 3 strategies
 * 3. User reviews, picks one, previews meals
 * 4. User confirms → plan generated with chosen strategy macros
 */
export default function GenerationModeSelector({ patientId, onGenerated }: Props) {
  const { user } = useAuth();
  const store = useMealPlanEditorV2Store();
  const [generating, setGenerating] = useState(false);
  const [showAdvisor, setShowAdvisor] = useState(false);

  // Strategy Advisor confirmed → generate plan with strategy context
  const handleStrategyConfirmed = useCallback(async (strategy: NutritionalStrategy, editedMeals: StrategyMealPreview[]) => {
    if (!user || !store.planId) return;
    setShowAdvisor(false);
    setGenerating(true);

    try {
      toast.info(`Gerando plano com estratégia "${strategy.name}"...`);
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          patientId,
          nutritionistId: user.id,
          existingPlanId: store.planId,
          meal_plan_id: store.planId,
          isPipeline: false,
          generationMode: "smart",
          strategyOverride: {
            strategyId: strategy.id,
            strategyName: strategy.name,
            targetCalories: strategy.macroProfile.calories,
            targetProtein: strategy.macroProfile.protein,
            targetCarbs: strategy.macroProfile.carbs,
            targetFat: strategy.macroProfile.fat,
            mealsPerDay: strategy.mealDistribution.mealsPerDay,
          },
        },
      });

      if (error || !data?.success) {
        const msg = error
          ? await friendlyEdgeFunctionError(error, "Erro ao gerar")
          : (data?.error || "Erro desconhecido");
        toast.error(msg);
        return;
      }

      const resolvedPlanId = store.planId || data.mealPlanId;
      if (!resolvedPlanId) {
        throw new Error("A engine retornou sem um plano válido.");
      }

      await store.hydrate(resolvedPlanId, user.id);
      toast.success(`✅ Plano "${strategy.name}" gerado com ${data.items_count || 0} refeições!`);
      onGenerated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar");
    } finally {
      setGenerating(false);
    }
  }, [user, store, patientId, onGenerated]);

  // If advisor is open, render it
  if (showAdvisor) {
    return (
      <StrategyAdvisorPanel
        patientId={patientId}
        onStrategyConfirmed={handleStrategyConfirmed}
        onCancel={() => setShowAdvisor(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Mandatory strategy flow explanation */}
      <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-primary">Fluxo Obrigatório de Estratégia</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
            Para garantir precisão clínica, o sistema analisa o perfil do paciente e sugere 
            <strong> 3 estratégias personalizadas</strong>. Você escolhe a melhor antes da geração do plano.
          </p>
        </div>
      </div>

      {/* Single entry point: Strategy Advisor */}
      <Button
        onClick={() => setShowAdvisor(true)}
        disabled={generating}
        className="w-full h-14 text-sm gap-3 gradient-primary shadow-glow"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Gerando plano...
          </>
        ) : (
          <>
            <Compass className="w-5 h-5" />
            <div className="text-left">
              <p className="font-bold">🧠 Iniciar Consultor de Estratégia</p>
              <p className="text-[10px] opacity-80">Analisar paciente → 3 protocolos → escolher → gerar</p>
            </div>
          </>
        )}
      </Button>

      {/* Rules reminder */}
      <div className="text-[9px] text-muted-foreground text-center space-y-0.5">
        <p>✅ Motor clínico calcula macros → Você escolhe a estratégia → Plano gerado</p>
        <p className="text-destructive/60">⛔ Geração direta sem estratégia foi desativada</p>
      </div>
    </div>
  );
}
