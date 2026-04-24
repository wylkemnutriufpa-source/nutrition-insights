/**
 * resolveEffectiveDay
 * ----------------------------------------------------------------
 * O editor profissional opera em modo "Plano Diário com 4 Substituições".
 * O slot canônico é `day_of_week = 0`. Para planos legados (`weekly`)
 * cujos itens estão concentrados em outros dias (1..6), aplicamos um
 * fallback determinístico para que o profissional veja conteúdo em vez
 * de uma tela vazia.
 *
 * Regras:
 * 1. Se `forceCanonical = true`, sempre retornar `0` (preferência do
 *    profissional persistida via query param/localStorage).
 * 2. Caso contrário, preferir `0` quando houver itens nesse dia.
 * 3. Senão, percorrer 1..6 nessa ordem e retornar o primeiro com itens.
 * 4. Se nada existir, retornar `0` (slot canônico vazio pronto para uso).
 */

export type EffectiveDayInput = {
  day_of_week: number | null | undefined;
};

export interface ResolveOptions {
  /** Quando true, força o uso do slot canônico (day=0) ignorando o fallback. */
  forceCanonical?: boolean;
}

export const LEGACY_DAY_ORDER: ReadonlyArray<number> = [1, 2, 3, 4, 5, 6];

export function resolveEffectiveDay(
  items: ReadonlyArray<EffectiveDayInput>,
  options: ResolveOptions = {}
): number {
  if (options.forceCanonical) return 0;

  const hasCanonical = items.some((i) => i.day_of_week === 0);
  if (hasCanonical) return 0;

  for (const d of LEGACY_DAY_ORDER) {
    if (items.some((i) => i.day_of_week === d)) return d;
  }

  return 0;
}

/**
 * Retorna `true` se há itens em algum dia legado (1..6) — útil para
 * decidir se mostramos o banner de migração.
 */
export function hasLegacyDayItems(items: ReadonlyArray<EffectiveDayInput>): boolean {
  return items.some((i) => i.day_of_week != null && i.day_of_week >= 1 && i.day_of_week <= 6);
}
