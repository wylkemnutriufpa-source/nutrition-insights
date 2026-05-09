import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import { DayContent } from "./DayContent";
import { DayTabs } from "./DayTabs";

/**
 * ListView (Modo Single-Day Puro)
 * ----------------------------------------------------------------
 * Modelo oficial: 1 dia (day_of_week = 0) + substituições.
 * Renderiza exatamente o que vem do banco.
 */
export function ListView() {
  const { items, plan } = useMealPlanEditorV2Store();
  const isWeeklyMode = (plan as any)?.plan_mode === "weekly";
  const [selectedDay, setSelectedDay] = useState(1);
  const effectiveDay = isWeeklyMode ? selectedDay : 0;

  const dayItems = useMemo(() => {
    return items.filter(i => i.day_of_week === effectiveDay);
  }, [items, effectiveDay]);

  const totals = useMemo(() => {
    const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const i of dayItems) {
      t.calories += Number(i.calories_target) || 0;
      t.protein += Number(i.protein_target) || 0;
      t.carbs += Number(i.carbs_target) || 0;
      t.fat += Number(i.fat_target) || 0;
    }
    return t;
  }, [items]);

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {isWeeklyMode && (
        <div className="mb-4 px-3 py-2 bg-card border border-border rounded-xl shadow-sm">
          <DayTabs 
            selectedDay={selectedDay} 
            onSelectDay={setSelectedDay}
            getDayCount={(d) => items.filter(i => i.day_of_week === d).length}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            🗓️ {isWeeklyMode ? "Plano Semanal" : "Plano Diário"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {isWeeklyMode ? `Visualizando ${selectedDay === 0 ? "Domingo" : selectedDay === 1 ? "Segunda" : "dia " + selectedDay}` : "Dia padrão + substituições"}
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
        <DayContent key={effectiveDay} day={effectiveDay} />
      </AnimatePresence>
    </div>
  );
}
