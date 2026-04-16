import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Compass, ShieldCheck, ChefHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { friendlyEdgeFunctionError } from "@/lib/edgeFunctionErrorHelper";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import StrategyAdvisorPanel from "@/components/strategy-advisor/StrategyAdvisorPanel";
import MealRecipeSelector from "./MealRecipeSelector";
import type { NutritionalStrategy, StrategyMealPreview } from "@/lib/strategyAdvisor";

interface Props {
  patientId: string;
  onGenerated: () => void;
}

type View = "menu" | "strategy" | "recipe";

/**
 * GenerationModeSelector v3.0 — STRATEGY + RECIPE TEMPLATE
 *
 * Two generation paths:
 * 1. Strategy Advisor (motor automático) — analyzes patient, 3 strategies, generate
 * 2. Recipe Template (marmita) — pick a recipe, motor scales portions to patient macros
 */
export default function GenerationModeSelector({ patientId, onGenerated }: Props) {
  const { user } = useAuth();
  const store = useMealPlanEditorV2Store();
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState<View>("menu");

  // Strategy Advisor confirmed → generate plan with strategy context
  const handleStrategyConfirmed = useCallback(async (strategy: NutritionalStrategy, editedMeals: StrategyMealPreview[]) => {
    if (!user || !store.planId) return;
    setView("menu");
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
      if (!resolvedPlanId) throw new Error("A engine retornou sem um plano válido.");

      await store.hydrate(resolvedPlanId, user.id);
      toast.success(`✅ Plano "${strategy.name}" gerado com ${data.items_count || 0} refeições!`);
      onGenerated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar");
    } finally {
      setGenerating(false);
    }
  }, [user, store, patientId, onGenerated]);

  // Recipe template selected → generate plan using recipe as base
  const handleRecipeSelected = useCallback(async (recipe: { id: string; name: string; meal_type: string; foods_json: any }) => {
    if (!user || !store.planId) return;
    setView("menu");
    setGenerating(true);

    try {
      toast.info(`Gerando plano com receita "${recipe.name}"...`);
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          patientId,
          nutritionistId: user.id,
          existingPlanId: store.planId,
          meal_plan_id: store.planId,
          isPipeline: false,
          generationMode: "recipe_template",
          recipeTemplate: {
            recipeId: recipe.id,
            recipeName: recipe.name,
            mealType: recipe.meal_type,
            foods: recipe.foods_json,
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
      if (!resolvedPlanId) throw new Error("A engine retornou sem um plano válido.");

      await store.hydrate(resolvedPlanId, user.id);
      toast.success(`✅ Plano com receita "${recipe.name}" gerado!`);
      onGenerated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar");
    } finally {
      setGenerating(false);
    }
  }, [user, store, patientId, onGenerated]);

  // Sub-views
  if (view === "strategy") {
    return (
      <StrategyAdvisorPanel
        patientId={patientId}
        onStrategyConfirmed={handleStrategyConfirmed}
        onCancel={() => setView("menu")}
      />
    );
  }

  if (view === "recipe") {
    return (
      <MealRecipeSelector
        onSelect={handleRecipeSelected}
        onCancel={() => setView("menu")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-primary">Escolha o Modo de Geração</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
            Gere um plano pelo <strong>motor automático</strong> ou use uma <strong>receita de marmita</strong> como base.
          </p>
        </div>
      </div>

      {/* Option 1: Strategy Advisor */}
      <Button
        onClick={() => setView("strategy")}
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
              <p className="font-bold">🧠 Motor Automático (Estratégia)</p>
              <p className="text-[10px] opacity-80">Analisar paciente → 3 protocolos → escolher → gerar</p>
            </div>
          </>
        )}
      </Button>

      {/* Option 2: Recipe Template */}
      <Button
        onClick={() => setView("recipe")}
        disabled={generating}
        variant="outline"
        className="w-full h-14 text-sm gap-3 border-dashed"
      >
        <ChefHat className="w-5 h-5 text-primary" />
        <div className="text-left">
          <p className="font-bold">🍱 Usar Receita (Marmita)</p>
          <p className="text-[10px] text-muted-foreground">Escolher receita → escalar porções → gerar plano</p>
        </div>
      </Button>

      {/* Info */}
      <div className="text-[9px] text-muted-foreground text-center space-y-0.5">
        <p>✅ Motor clínico calcula macros → Você escolhe o caminho → Plano gerado</p>
      </div>
    </div>
  );
}
