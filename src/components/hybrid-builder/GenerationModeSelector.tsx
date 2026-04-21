import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Compass, ShieldCheck, ChefHat, CalendarDays, Snowflake, AlertTriangle } from "lucide-react";
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
  const [recipeCounts, setRecipeCounts] = useState<{
    lunch: number;
    dinner: number;
    fixedLunch: number;
    fixedDinner: number;
    loading: boolean;
  }>({ lunch: 0, dinner: 0, fixedLunch: 0, fixedDinner: 0, loading: true });

  // Pre-flight check: count available recipes for marmita modes
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("meal_recipes")
        .select("meal_type, is_fixed")
        .eq("nutritionist_id", user.id)
        .eq("is_active", true);
      if (cancelled) return;
      if (error) {
        setRecipeCounts((s) => ({ ...s, loading: false }));
        return;
      }
      const lunch = (data || []).filter((r: any) => r.meal_type === "lunch").length;
      const dinner = (data || []).filter((r: any) => r.meal_type === "dinner").length;
      const fixedLunch = (data || []).filter((r: any) => r.meal_type === "lunch" && r.is_fixed).length;
      const fixedDinner = (data || []).filter((r: any) => r.meal_type === "dinner" && r.is_fixed).length;
      setRecipeCounts({ lunch, dinner, fixedLunch, fixedDinner, loading: false });
    })();
    return () => { cancelled = true; };
  }, [user]);

  const weeklyReady = recipeCounts.lunch > 0 && recipeCounts.dinner > 0;
  const fixedReady = recipeCounts.fixedLunch > 0 && recipeCounts.fixedDinner > 0;

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

  // Weekly Marmita → generate full 7-day plan from meal_recipes
  const handleWeeklyMarmita = useCallback(async () => {
    if (!user || !store.planId) return;
    if (!weeklyReady) {
      toast.error(`Receitas insuficientes. Cadastre ao menos 1 almoço e 1 jantar em "Receitas/Marmitas".`);
      return;
    }
    setGenerating(true);

    try {
      toast.info("Gerando cardápio semanal de marmitas (7 dias)...");
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          patientId,
          nutritionistId: user.id,
          existingPlanId: store.planId,
          meal_plan_id: store.planId,
          isPipeline: false,
          generationMode: "weekly_marmita",
        },
      });

      if (error || !data?.success) {
        const msg = error
          ? await friendlyEdgeFunctionError(error, "Erro ao gerar cardápio")
          : (data?.error || "Erro desconhecido");
        toast.error(msg);
        return;
      }

      const resolvedPlanId = store.planId || data.mealPlanId;
      if (!resolvedPlanId) throw new Error("A engine retornou sem um plano válido.");

      await store.hydrate(resolvedPlanId, user.id);
      toast.success(`✅ Cardápio semanal gerado com ${data.items_count || 0} refeições!`);
      onGenerated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar");
    } finally {
      setGenerating(false);
    }
  }, [user, store, patientId, onGenerated, weeklyReady]);

  // Fixed Marmita → marmitas congeladas, motor ajusta APENAS café/lanches/ceia
  const handleFixedMarmita = useCallback(async () => {
    if (!user || !store.planId) return;
    if (!fixedReady) {
      toast.error(`Marmitas fixas insuficientes. Cadastre ao menos 1 almoço e 1 jantar marcados como "fixos" em "Receitas/Marmitas".`);
      return;
    }
    setGenerating(true);

    try {
      toast.info("Gerando plano com marmitas fixas (congeladas)...");
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          patientId,
          nutritionistId: user.id,
          existingPlanId: store.planId,
          meal_plan_id: store.planId,
          isPipeline: false,
          generationMode: "fixed_marmita",
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
      toast.success(`✅ Plano com marmitas fixas gerado! ${data.items_count || 0} refeições.`);
      onGenerated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar");
    } finally {
      setGenerating(false);
    }
  }, [user, store, patientId, onGenerated, fixedReady]);
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

      {/* Option 3: Weekly Marmita Plan */}
      <Button
        onClick={handleWeeklyMarmita}
        disabled={generating}
        variant="outline"
        className="w-full h-14 text-sm gap-3 border-dashed"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Gerando cardápio...
          </>
        ) : (
          <>
            <CalendarDays className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-bold">📅 Cardápio Semanal de Marmitas</p>
              <p className="text-[10px] text-muted-foreground">7 dias completos com marmitas no almoço/jantar</p>
            </div>
          </>
        )}
      </Button>

      {/* Option 4: Fixed Marmita (Frozen) — não escala marmitas */}
      <Button
        onClick={handleFixedMarmita}
        disabled={generating}
        variant="outline"
        className="w-full h-14 text-sm gap-3 border-dashed border-accent/40 hover:bg-accent/5"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Gerando plano...
          </>
        ) : (
          <>
            <Snowflake className="w-5 h-5 text-accent" />
            <div className="text-left">
              <p className="font-bold">❄️ Marmitas Fixas (Congeladas)</p>
              <p className="text-[10px] text-muted-foreground">Marmitas não escalam · ajusta só café/lanches/ceia</p>
            </div>
          </>
        )}
      </Button>

      {/* Info */}
      <div className="text-[9px] text-muted-foreground text-center space-y-0.5">
        <p>✅ Motor clínico calcula macros → Você escolhe o caminho → Plano gerado</p>
      </div>
    </div>
  );
}
