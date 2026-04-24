/**
 * Single Day Conversion Tests
 * ----------------------------------------------------------------
 * Garante que ao converter um plano de 2 dias para 1 dia:
 *  - Itens originalmente em day=1 viram substituições em day=0
 *  - O agrupamento usa o mesmo meal_type da primária correspondente
 *  - substitution_group_id e master_item_id apontam para a primária
 *  - Itens órfãos (sem primária do mesmo meal_type) são descartados
 *
 * Esta lógica espelha exatamente a RPC `enforce_single_day_normalization`
 * implementada na migration de hardening single_day.
 */
import { describe, expect, it } from "vitest";

type Item = {
  id: string;
  meal_plan_id: string;
  meal_type: string;
  day_of_week: number;
  is_primary: boolean;
  substitution_group_id?: string | null;
  master_item_id?: string | null;
  title: string;
};

/**
 * Implementação de referência (mesma lógica da RPC SQL).
 * Move qualquer item com day_of_week ≠ 0 para day=0 como substituição
 * da primária de mesmo meal_type. Sem primária correspondente:
 *  - se for primary: promove (vira primária em day=0)
 *  - se for sub: descarta
 */
export function normalizeToSingleDay(items: Item[]): {
  items: Item[];
  moved: number;
  converted: number;
  removed: number;
} {
  const out = items.map((i) => ({ ...i }));
  let moved = 0;
  let converted = 0;
  let removed = 0;

  // map de primárias day=0 por meal_type
  const primaryByType = new Map<string, Item>();
  for (const it of out) {
    if (it.day_of_week === 0 && it.is_primary) primaryByType.set(it.meal_type, it);
  }

  const survivors: Item[] = [];
  for (const it of out) {
    if (it.day_of_week === 0) {
      survivors.push(it);
      continue;
    }
    const primary = primaryByType.get(it.meal_type);
    if (primary) {
      it.day_of_week = 0;
      it.is_primary = false;
      it.substitution_group_id = it.substitution_group_id || primary.id;
      it.master_item_id = it.master_item_id || primary.id;
      // garante que a primária aponta para o próprio grupo
      primary.substitution_group_id = primary.substitution_group_id || primary.id;
      moved++;
      converted++;
      survivors.push(it);
    } else if (it.is_primary) {
      it.day_of_week = 0;
      moved++;
      survivors.push(it);
      primaryByType.set(it.meal_type, it);
    } else {
      removed++;
      // não inclui em survivors → descartado
    }
  }

  return { items: survivors, moved, converted, removed };
}

const planId = "plan-test";
const make = (over: Partial<Item>): Item => ({
  id: over.id ?? "x",
  meal_plan_id: planId,
  meal_type: over.meal_type ?? "lunch",
  day_of_week: over.day_of_week ?? 0,
  is_primary: over.is_primary ?? true,
  substitution_group_id: over.substitution_group_id ?? null,
  master_item_id: over.master_item_id ?? null,
  title: over.title ?? "Item",
});

describe("normalizeToSingleDay — conversão 2 dias → 1 dia + substituições", () => {
  it("itens day=1 com primária correspondente em day=0 viram substituições", () => {
    const items: Item[] = [
      make({ id: "p1", meal_type: "breakfast", day_of_week: 0, is_primary: true, title: "Aveia" }),
      make({ id: "p2", meal_type: "lunch", day_of_week: 0, is_primary: true, title: "Frango" }),
      make({ id: "s1", meal_type: "breakfast", day_of_week: 1, is_primary: true, title: "Tapioca" }),
      make({ id: "s2", meal_type: "lunch", day_of_week: 1, is_primary: true, title: "Peixe" }),
    ];

    const { items: out, moved, converted, removed } = normalizeToSingleDay(items);

    expect(moved).toBe(2);
    expect(converted).toBe(2);
    expect(removed).toBe(0);
    expect(out.every((i) => i.day_of_week === 0)).toBe(true);

    const subBreakfast = out.find((i) => i.id === "s1")!;
    expect(subBreakfast.is_primary).toBe(false);
    expect(subBreakfast.master_item_id).toBe("p1");
    expect(subBreakfast.substitution_group_id).toBe("p1");

    const subLunch = out.find((i) => i.id === "s2")!;
    expect(subLunch.is_primary).toBe(false);
    expect(subLunch.master_item_id).toBe("p2");
  });

  it("agrupa por meal_type — não cruza tipos diferentes", () => {
    const items: Item[] = [
      make({ id: "p1", meal_type: "breakfast", day_of_week: 0, is_primary: true }),
      make({ id: "p2", meal_type: "dinner", day_of_week: 0, is_primary: true }),
      make({ id: "s_b", meal_type: "breakfast", day_of_week: 1, is_primary: true }),
      make({ id: "s_d", meal_type: "dinner", day_of_week: 1, is_primary: true }),
    ];
    const { items: out } = normalizeToSingleDay(items);
    expect(out.find((i) => i.id === "s_b")!.master_item_id).toBe("p1");
    expect(out.find((i) => i.id === "s_d")!.master_item_id).toBe("p2");
  });

  it("substituição sem primária correspondente é descartada", () => {
    const items: Item[] = [
      make({ id: "p1", meal_type: "breakfast", day_of_week: 0, is_primary: true }),
      make({ id: "orphan", meal_type: "evening_snack", day_of_week: 1, is_primary: false }),
    ];
    const { items: out, removed } = normalizeToSingleDay(items);
    expect(removed).toBe(1);
    expect(out.find((i) => i.id === "orphan")).toBeUndefined();
  });

  it("primária órfã em day=1 é promovida a primária em day=0", () => {
    const items: Item[] = [
      make({ id: "p1", meal_type: "breakfast", day_of_week: 0, is_primary: true }),
      make({ id: "p_new", meal_type: "evening_snack", day_of_week: 1, is_primary: true, title: "Ceia" }),
    ];
    const { items: out, moved } = normalizeToSingleDay(items);
    expect(moved).toBe(1);
    const promoted = out.find((i) => i.id === "p_new")!;
    expect(promoted.day_of_week).toBe(0);
    expect(promoted.is_primary).toBe(true);
  });

  it("plano já normalizado é idempotente (não muda nada)", () => {
    const items: Item[] = [
      make({ id: "p1", meal_type: "breakfast", day_of_week: 0, is_primary: true }),
      make({ id: "s1", meal_type: "breakfast", day_of_week: 0, is_primary: false, master_item_id: "p1", substitution_group_id: "p1" }),
    ];
    const result = normalizeToSingleDay(items);
    expect(result.moved).toBe(0);
    expect(result.converted).toBe(0);
    expect(result.removed).toBe(0);
    expect(result.items).toHaveLength(2);
  });

  it("nenhum item resultante fica em day≠0 — invariante absoluto", () => {
    const items: Item[] = [
      make({ id: "p1", meal_type: "breakfast", day_of_week: 0, is_primary: true }),
      make({ id: "p2", meal_type: "lunch", day_of_week: 0, is_primary: true }),
      make({ id: "p3", meal_type: "dinner", day_of_week: 0, is_primary: true }),
      ...[1, 2, 3, 4, 5, 6].flatMap((d) => [
        make({ id: `b${d}`, meal_type: "breakfast", day_of_week: d, is_primary: true }),
        make({ id: `l${d}`, meal_type: "lunch", day_of_week: d, is_primary: true }),
        make({ id: `d${d}`, meal_type: "dinner", day_of_week: d, is_primary: true }),
      ]),
    ];
    const { items: out } = normalizeToSingleDay(items);
    expect(out.every((i) => i.day_of_week === 0)).toBe(true);
    // 3 primárias + (6 dias × 3 meal_types) = 21 itens, todos em day=0
    expect(out).toHaveLength(21);
    // todas as 6×3=18 conversões devem ser substituições agrupadas pelas primárias
    const subs = out.filter((i) => !i.is_primary);
    expect(subs).toHaveLength(18);
    expect(subs.every((s) => s.master_item_id && s.substitution_group_id === s.master_item_id)).toBe(true);
  });
});
