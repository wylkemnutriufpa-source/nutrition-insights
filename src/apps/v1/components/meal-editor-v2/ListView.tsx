import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { useMealPlanEditorV2Store } from "@v1/stores/mealPlanEditorV2Store";
import { DayContent } from "./DayContent";

/**
 * ListView (Modo Single-Day Puro)
 * ----------------------------------------------------------------
 * Modelo oficial: 1 dia (day_of_week = 0) + substituições.
 * Renderiza exatamente o que vem do banco.
 */
export function ListView() {
  const { items } = useMealPlanEditorV2Store();

  const totals = useMemo(() => {
    const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const i of items) {
      t.calories += Number(i.calories_target) || 0;
      t.protein += Number(i.protein_target) || 0;
      t.carbs += Number(i.carbs_target) || 0;
      t.fat += Number(i.fat_target) || 0;
    }
    return t;
  }, [items]);

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            🗓️ Plano Diário
          </span>
          <span className="text-[11px] text-muted-foreground">
            Dia padrão + substituições
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
          <span><span className="text-foreground font-bold">{Math.round(totals.calories)}</span> kcal</span>
          <span><span className="text-foreground font-bold">{totals.protein.toFixed(0)}</span>g P</span>
          <span><span className="text-foreground font-bold">{totals.carbs.toFixed(0)}</span>g C</span>
          <span><span className="text-foreground font-bold">{totals.fat.toFixed(0)}</span>g G</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <DayContent key={0} day={0} />
      </AnimatePresence>
    </div>
  );
}
