import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import { DayContent } from "./DayContent";
import LegacyDayBanner from "./LegacyDayBanner";
import { useForceCanonicalDay } from "@/hooks/useForceCanonicalDay";
import { resolveHeaderSnapshot } from "@/lib/editorHeaderSnapshot";

/**
 * ListView (Modo Diário Único)
 * ----------------------------------------------------------------
 * Sempre opera em modo "Plano Diário com 4 Substituições".
 * O slot canônico é day=0; a preferência do profissional sobre forçar
 * day 0 ou permitir fallback legado é persistida em URL/localStorage.
 */
export function ListView() {
  const { items } = useMealPlanEditorV2Store();
  const [forceCanonical, setForceCanonical] = useForceCanonicalDay();

  // SINGLE SOURCE OF TRUTH para o cabeçalho: rótulo e totais derivam
  // do MESMO effectiveDay (evita dessincronização com o conteúdo abaixo).
  const { effectiveDay, effectiveDayLabel: dayLabel, showingLegacy, totals } = useMemo(
    () => resolveHeaderSnapshot(items, { forceCanonical }),
    [items, forceCanonical]
  );

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {/* Cabeçalho com rótulo + totais do dia efetivo */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            🗓️ Plano Diário
          </span>
          <span className="text-[11px] text-muted-foreground">
            {showingLegacy ? `Exibindo dia legado: ${dayLabel}` : "Dia padrão (day 0) + até 4 substituições"}
          </span>
          {showingLegacy && (
            <span className="text-[10px] text-warning-foreground bg-warning/15 border border-warning/30 px-2 py-0.5 rounded-full">
              legado #{effectiveDay}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
          <span><span className="text-foreground font-bold">{totals.calories}</span> kcal</span>
          <span><span className="text-foreground font-bold">{totals.protein.toFixed(0)}</span>g P</span>
          <span><span className="text-foreground font-bold">{totals.carbs.toFixed(0)}</span>g C</span>
          <span><span className="text-foreground font-bold">{totals.fat.toFixed(0)}</span>g G</span>
        </div>
      </div>

      <LegacyDayBanner
        effectiveDay={effectiveDay}
        forceCanonical={forceCanonical}
        onToggleForceCanonical={setForceCanonical}
      />

      <AnimatePresence mode="wait">
        <DayContent key={effectiveDay} day={effectiveDay} />
      </AnimatePresence>
    </div>
  );
}
