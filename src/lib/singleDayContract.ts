/**
 * Single Day Contract
 * ----------------------------------------------------------------
 * Camada determinística de pós-processamento que garante que QUALQUER
 * conjunto de itens, quando o plano for `single_day`, atenda às
 * invariantes:
 *
 *  1. Todo item tem `day_of_week = 0`
 *  2. Existe no máximo UMA primária por `meal_type`
 *  3. Demais itens do mesmo `meal_type` viram substituições
 *     (`is_primary = false`) com `master_item_id` e
 *     `substitution_group_id` apontando para a primária
 *  4. Itens do mesmo `meal_type` que vieram de dias diferentes
 *     (1..6) são consolidados como substituições — nunca como
 *     refeições de "outro dia"
 *
 * Esta função é pura e idempotente. Aplicá-la duas vezes seguidas
 * produz exatamente o mesmo resultado da primeira aplicação.
 *
 * Use ANTES de inserir no banco quando o request pedir
 * `plan_mode === 'single_day'`. Como dupla camada de segurança,
 * o trigger SQL `tr_force_day_zero_on_single_day` faz a mesma
 * normalização no banco.
 */

export interface SingleDayContractItem {
  id?: string;
  meal_plan_id?: string;
  meal_type: string;
  day_of_week: number;
  is_primary: boolean;
  master_item_id?: string | null;
  substitution_group_id?: string | null;
  [key: string]: unknown;
}

let counter = 0;
const tempId = () => `temp-${Date.now()}-${++counter}`;

export function enforceSingleDayContract<T extends SingleDayContractItem>(
  items: ReadonlyArray<T>
): T[] {
  if (!items || items.length === 0) return [];

  // 1) Força day=0 em cópia mutável e garante id estável
  const normalized: T[] = items.map((i) => ({
    ...i,
    day_of_week: 0,
    id: i.id ?? tempId(),
  }));

  // 2) Agrupa por meal_type
  const byType = new Map<string, T[]>();
  for (const i of normalized) {
    if (!byType.has(i.meal_type)) byType.set(i.meal_type, []);
    byType.get(i.meal_type)!.push(i);
  }

  const out: T[] = [];

  // 3) Para cada meal_type: escolhe a primária e converte o resto em sub
  for (const [, list] of byType) {
    // primária preferida = primeira marcada is_primary, senão a primeira da lista
    let primary = list.find((i) => i.is_primary) ?? list[0];

    // garante is_primary=true e grupo apontando para si mesma
    primary = {
      ...primary,
      is_primary: true,
      substitution_group_id: primary.id!,
      master_item_id: null,
    };
    out.push(primary);

    for (const i of list) {
      if (i.id === primary.id) continue;
      out.push({
        ...i,
        is_primary: false,
        master_item_id: primary.id!,
        substitution_group_id: primary.id!,
      });
    }
  }

  return out;
}
