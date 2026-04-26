import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Compass, ShieldCheck, ChefHat, CalendarDays, Snowflake, AlertTriangle, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithRetry } from "@/lib/api/edgeFunctions";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { friendlyEdgeFunctionError } from "@/lib/edgeFunctionErrorHelper";

import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import StrategyAdvisorPanel from "@/components/strategy-advisor/StrategyAdvisorPanel";
import MealRecipeSelector from "./MealRecipeSelector";
import MarmitaSettingsDialog from "./MarmitaSettingsDialog";
import { useMarmitaSettings } from "@/hooks/useMarmitaSettings";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Fingerprint } from "lucide-react";
import type { NutritionalStrategy, StrategyMealPreview } from "@/lib/strategyAdvisor";

// Constants for mode hints to avoid divergence between weekly and fixed modes
const MODE_HINTS = {
  weekly: {
    text: "Verificando mínimo de almoço + jantar para modo semanal",
    className: "text-primary/70",
  },
  fixed: {
    text: "Verificando mínimo de almoço + jantar fixos para marmitas congeladas",
    className: "text-accent/70",
  },
} as const;

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [useFixedSeed, setUseFixedSeed] = useState(true);

  const { settings: minSettings, loading: settingsLoading } = useMarmitaSettings();
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

  const weeklyReady =
    recipeCounts.lunch >= minSettings.weekly_min_lunch &&
    recipeCounts.dinner >= minSettings.weekly_min_dinner;
  const fixedReady =
    recipeCounts.fixedLunch >= minSettings.fixed_min_lunch &&
    recipeCounts.fixedDinner >= minSettings.fixed_min_dinner;
  const checksLoading = recipeCounts.loading || settingsLoading;

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
      toast.error(`Receitas insuficientes. Mínimo configurado: ${minSettings.weekly_min_lunch} almoço(s) + ${minSettings.weekly_min_dinner} jantar(es). Atual: ${recipeCounts.lunch}/${recipeCounts.dinner}.`);
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
          useFixedSeed: useFixedSeed,
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
  }, [user, store, patientId, onGenerated, weeklyReady, minSettings, recipeCounts]);

  // Fixed Marmita → marmitas congeladas, motor ajusta APENAS café/lanches/ceia
  const handleFixedMarmita = useCallback(async () => {
    if (!user || !store.planId) return;
    if (!fixedReady) {
      toast.error(`Marmitas fixas insuficientes. Mínimo configurado: ${minSettings.fixed_min_lunch} almoço(s) fixo(s) + ${minSettings.fixed_min_dinner} jantar(es) fixo(s). Atual: ${recipeCounts.fixedLunch}/${recipeCounts.fixedDinner}.`);
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
          useFixedSeed: useFixedSeed,
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
  }, [user, store, patientId, onGenerated, fixedReady, minSettings, recipeCounts]);
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
      {/* Header with settings */}
      <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-primary">Escolha o Modo de Geração</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
            Gere um plano pelo <strong>motor automático</strong> ou use uma <strong>receita de marmita</strong> como base.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSettingsOpen(true)}
          className="shrink-0 h-7 px-2 gap-1 text-[10px]"
          title="Configurar mínimo de receitas por modo"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Mínimos
        </Button>
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
              <p className="font-bold">🧠 Gerar Template de 1 Dia (Estratégia)</p>
              <p className="text-[10px] opacity-80">Gera um plano de 1 dia com todas as substituições automáticas</p>
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
          <p className="font-bold">🍱 Usar Receita como Template</p>
          <p className="text-[10px] text-muted-foreground">Escolher receita → escalar porções → gerar template de 1 dia</p>
        </div>
      </Button>

      {/* Seed Fixa Settings */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/40 rounded-lg border border-border/50">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-primary/70" />
          <div className="flex flex-col">
            <Label htmlFor="fixed-seed" className="text-xs font-semibold cursor-pointer">Semente Fixa (Seed)</Label>
            <span className="text-[9px] text-muted-foreground font-mono">
              VALOR: {patientId ? (Math.abs(patientId.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)) % 10000) : "---"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground mr-1">
            {useFixedSeed ? "Ativada" : "Aleatória"}
          </span>
          <Switch 
            id="fixed-seed" 
            checked={useFixedSeed} 
            onCheckedChange={setUseFixedSeed}
            className="scale-75"
          />
        </div>
      </div>

      {/* Option 3: Weekly Marmita Plan */}
      <div className="space-y-1.5">
        <Button
          onClick={handleWeeklyMarmita}
          disabled={generating || checksLoading || !weeklyReady}
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
              <div className="text-left flex-1">
                <p className="font-bold">📅 Template Diário de Marmitas</p>
                <p className="text-[10px] text-muted-foreground">
                  {checksLoading
                    ? "verificando…"
                    : `Gera 1 dia padrão com substituições a partir de suas receitas.`}
                </p>
                {!checksLoading && (
                  <p className={`text-[9px] mt-0.5 ${MODE_HINTS.weekly.className}`}>
                    ℹ️ Modelo de dia único + substituições inteligentes
                  </p>
                )}
              </div>
            </>
          )}
        </Button>
        {!checksLoading && !weeklyReady && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
            <p className="text-[10px] text-destructive leading-relaxed">
              Mínimo configurado: <strong>{minSettings.weekly_min_lunch} almoço(s)</strong> e <strong>{minSettings.weekly_min_dinner} jantar(es)</strong>. Cadastre mais receitas em "Receitas/Marmitas" ou ajuste o mínimo.
            </p>
          </div>
        )}
      </div>

      {/* Option 4: Fixed Marmita (Frozen) — não escala marmitas */}
      <div className="space-y-1.5">
        <Button
          onClick={handleFixedMarmita}
          disabled={generating || checksLoading || !fixedReady}
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
              <div className="text-left flex-1">
                <p className="font-bold">❄️ Marmitas Fixas (Congeladas)</p>
                <p className="text-[10px] text-muted-foreground">
                  {checksLoading
                    ? "verificando…"
                    : `Almoço fixo ${recipeCounts.fixedLunch}/${minSettings.fixed_min_lunch} · Jantar fixo ${recipeCounts.fixedDinner}/${minSettings.fixed_min_dinner}`}
                </p>
                {!checksLoading && (
                  <p className={`text-[9px] mt-0.5 ${MODE_HINTS.fixed.className}`}>
                    ℹ️ {MODE_HINTS.fixed.text}
                  </p>
                )}
              </div>
            </>
          )}
        </Button>
        {!checksLoading && !fixedReady && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
            <p className="text-[10px] text-destructive leading-relaxed">
              Mínimo configurado: <strong>{minSettings.fixed_min_lunch} almoço(s) fixo(s)</strong> e <strong>{minSettings.fixed_min_dinner} jantar(es) fixo(s)</strong>. Cadastre marmitas com <strong>"fixos"</strong> ou ajuste o mínimo.
            </p>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="text-[9px] text-muted-foreground text-center space-y-0.5">
        <p>✅ Motor clínico calcula macros → Você escolhe o caminho → Plano gerado</p>
      </div>

      <MarmitaSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
