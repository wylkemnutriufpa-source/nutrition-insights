import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Check, Trash2, Plus, Search, AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { NutritionalStrategy, StrategyMealPreview } from "@/lib/strategyAdvisor";
import { PHYSIOLOGICAL_GUARDRAILS } from "@/lib/strategyAdvisor";
import FoodSearchInStrategy from "./FoodSearchInStrategy";

interface Props {
  strategy: NutritionalStrategy;
  meals: StrategyMealPreview[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  onMealsChanged: (meals: StrategyMealPreview[]) => void;
  onBack: () => void;
  onConfirm: () => void;
  disclaimer?: string;
}

export default function StrategyPreviewPanel({ strategy, meals, totals, onMealsChanged, onBack, onConfirm, disclaimer }: Props) {
  const [searchingForMeal, setSearchingForMeal] = useState<string | null>(null);

  const targetDelta = useMemo(() => ({
    calories: totals.calories - strategy.macroProfile.calories,
    protein: totals.protein - strategy.macroProfile.protein,
  }), [totals, strategy]);

  // Check per-meal guardrail violations in current meals
  const mealWarnings = useMemo(() => {
    const G = PHYSIOLOGICAL_GUARDRAILS;
    const warnings: string[] = [];
    for (const meal of meals) {
      if (meal.protein > G.maxProteinPerMeal) {
        warnings.push(`${meal.label}: ${meal.protein}g proteína excede o máximo de ${G.maxProteinPerMeal}g por refeição`);
      }
      if (meal.calories > G.maxKcalPerMeal) {
        warnings.push(`${meal.label}: ${meal.calories} kcal excede o máximo de ${G.maxKcalPerMeal} kcal por refeição`);
      }
    }
    return warnings;
  }, [meals]);

  const handleRemoveMeal = useCallback((mealType: string) => {
    onMealsChanged(meals.filter(m => m.mealType !== mealType));
  }, [meals, onMealsChanged]);

  const handleAddMeal = useCallback((meal: StrategyMealPreview) => {
    const existing = meals.findIndex(m => m.mealType === meal.mealType);
    if (existing >= 0) {
      const updated = [...meals];
      updated[existing] = meal;
      onMealsChanged(updated);
    } else {
      onMealsChanged([...meals, meal]);
    }
    setSearchingForMeal(null);
  }, [meals, onMealsChanged]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{strategy.icon}</span>
              <h2 className="text-sm font-bold">{strategy.name}</h2>
              <Badge variant="outline" className="text-[8px]">{strategy.activeSize.toUpperCase()}</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground ml-7">{strategy.rationale.slice(0, 80)}...</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      {disclaimer && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[8px] text-amber-700 dark:text-amber-400 leading-relaxed">{disclaimer}</p>
        </div>
      )}

      {/* Guardrail warnings */}
      {mealWarnings.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 space-y-0.5">
          {mealWarnings.map((w, i) => (
            <p key={i} className="text-[8px] text-destructive flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> {w}
            </p>
          ))}
        </div>
      )}

      {/* Live macro bar */}
      <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Macros em Tempo Real</p>
          {Math.abs(targetDelta.calories) > 50 && (
            <Badge variant={targetDelta.calories > 0 ? "destructive" : "outline"} className="text-[9px]">
              {targetDelta.calories > 0 ? "+" : ""}{targetDelta.calories} kcal
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          <MacroBox label="Calorias" value={totals.calories} target={strategy.macroProfile.calories} unit="kcal" color="text-primary" />
          <MacroBox label="Proteína" value={totals.protein} target={strategy.macroProfile.protein} unit="g" color="text-destructive" />
          <MacroBox label="Carboidrato" value={totals.carbs} target={strategy.macroProfile.carbs} unit="g" color="text-primary" />
          <MacroBox label="Gordura" value={totals.fat} target={strategy.macroProfile.fat} unit="g" color="text-primary" />
        </div>
      </div>

      {/* Meals list */}
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-2 pr-2">
          <AnimatePresence mode="popLayout">
            {meals.map((meal) => (
              <motion.div
                key={meal.mealType}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-card rounded-xl border border-border p-3 group"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{meal.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{meal.description}</p>
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setSearchingForMeal(meal.mealType)}>
                      <Plus className="w-3 h-3 text-primary" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={() => handleRemoveMeal(meal.mealType)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-3 text-[9px] text-muted-foreground">
                  <span className="font-mono">{meal.calories} kcal</span>
                  <span className={`font-mono ${meal.protein > PHYSIOLOGICAL_GUARDRAILS.maxProteinPerMeal ? "text-destructive font-bold" : ""}`}>
                    {meal.protein}g P
                  </span>
                  <span className="font-mono">{meal.carbs}g C</span>
                  <span className="font-mono">{meal.fat}g G</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <Button variant="outline" className="w-full h-8 text-[10px] gap-1 border-dashed"
            onClick={() => setSearchingForMeal("new")}>
            <Search className="w-3 h-3" />
            Buscar e adicionar alimento/refeição
          </Button>
        </div>
      </ScrollArea>

      {searchingForMeal && (
        <FoodSearchInStrategy
          mealType={searchingForMeal}
          onSelect={handleAddMeal}
          onClose={() => setSearchingForMeal(null)}
        />
      )}

      <Button onClick={onConfirm} className="w-full h-10 text-xs gap-2 gradient-primary shadow-glow">
        <Check className="w-4 h-4" />
        Confirmar "{strategy.name}" e Gerar Plano
      </Button>
    </div>
  );
}

function MacroBox({ label, value, target, unit, color }: {
  label: string; value: number; target: number; unit: string; color: string;
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="text-center">
      <p className="text-[9px] text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[8px] text-muted-foreground">meta: {target}{unit}</p>
      <div className="w-full h-1 bg-muted rounded-full mt-1 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct > 105 ? "bg-destructive" : pct > 95 ? "bg-emerald-500" : "bg-primary/60"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
