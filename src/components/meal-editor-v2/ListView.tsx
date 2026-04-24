import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import { DayContent } from "./DayContent";

/**
 * ListView (Modo Diário Único)
 * ----------------------------------------------------------------
 * O editor profissional opera em modo "Plano Diário com 4 Substituições".
 * Sempre mostramos o day=0 (slot canônico do dia padrão). Se o plano
 * legado ainda tiver itens em outros dias (ex.: day=1 herdado de planos
 * weekly antigos), exibimos o primeiro dia com itens como fallback —
 * evitando a tela vazia que o profissional reportou.
 */
export function ListView() {
  const { items } = useMealPlanEditorV2Store();

  const effectiveDay = useMemo(() => {
    // Preferência: modo diário canônico (day=0).
    if (items.some((i) => i.day_of_week === 0)) return 0;

    // Fallback: primeiro dia (1..6, depois 0) que tenha itens.
    for (const d of [1, 2, 3, 4, 5, 6]) {
      if (items.some((i) => i.day_of_week === d)) return d;
    }

    // Sem itens — mantém o slot canônico para receber novas refeições.
    return 0;
  }, [items]);

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            🗓️ Plano Diário
          </span>
          <span className="text-[11px] text-muted-foreground">
            Dia padrão + até 4 substituições por refeição
          </span>
        </div>
        {effectiveDay !== 0 && (
          <span className="text-[10px] text-warning-foreground bg-warning/15 border border-warning/30 px-2 py-0.5 rounded-full">
            Mostrando dia legado #{effectiveDay}
          </span>
        )}
      </div>
      <AnimatePresence mode="wait">
        <DayContent key={effectiveDay} day={effectiveDay} />
      </AnimatePresence>
    </div>
  );
}
