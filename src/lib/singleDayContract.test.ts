/**
 * Single Day · Contrato de saída do gerador de planos
 * ----------------------------------------------------------------
 * Testa a função de pós-processamento `enforceSingleDayContract` que
 * é a última camada antes da inserção no banco quando o request
 * pede `plan_mode = 'single_day'`. Mesmo que o motor (edge function
 * `generate-meal-plan`) gere itens em day=1..6 (legado), o contrato:
 *
 *  1. Move tudo para day_of_week=0
 *  2. Mantém apenas UMA primária por meal_type
 *  3. Demais itens viram substituições (is_primary=false) com
 *     master_item_id + substitution_group_id apontando para a primária
 *  4. Nunca retorna nenhum item com day_of_week ≠ 0
 *
 * Esse teste roda no CI sem precisar de credenciais.
 */
import { describe, it, expect } from "vitest";
import { enforceSingleDayContract } from "./singleDayContract";

const baseItem = (over: Partial<any> = {}) => ({
  meal_plan_id: "plan-x",
  meal_type: "lunch",
  day_of_week: 0,
  is_primary: true,
  title: "Frango 130g",
  calories_target: 320,
  protein_target: 38,
  carbs_target: 10,
  fat_target: 8,
  ...over,
});

describe("enforceSingleDayContract — contrato do endpoint", () => {
  it("plano de 7 dias do motor é colapsado em day=0 com substituições", () => {
    const items = [];
    for (let d = 0; d < 7; d++) {
      for (const t of ["breakfast", "lunch", "dinner"]) {
        items.push(baseItem({ id: `${t}-${d}`, meal_type: t, day_of_week: d, title: `${t} dia ${d}` }));
      }
    }
    const out = enforceSingleDayContract(items);
    expect(out.every((i) => i.day_of_week === 0)).toBe(true);
    // 3 meal_types × 7 dias = 21 itens, todos em day=0
    expect(out).toHaveLength(21);
    // exatamente 3 primárias (uma por meal_type)
    expect(out.filter((i) => i.is_primary)).toHaveLength(3);
  });

  it("substituições têm master_item_id e substitution_group_id idênticos da primária do mesmo meal_type", () => {
    const items = [
      baseItem({ id: "bf0", meal_type: "breakfast", day_of_week: 0, is_primary: true, title: "Aveia" }),
      baseItem({ id: "bf1", meal_type: "breakfast", day_of_week: 1, is_primary: true, title: "Tapioca" }),
      baseItem({ id: "bf2", meal_type: "breakfast", day_of_week: 2, is_primary: true, title: "Pão" }),
    ];
    const out = enforceSingleDayContract(items);
    const primary = out.find((i) => i.is_primary)!;
    const subs = out.filter((i) => !i.is_primary);
    expect(subs).toHaveLength(2);
    expect(subs.every((s) => s.master_item_id === primary.id)).toBe(true);
    expect(subs.every((s) => s.substitution_group_id === primary.id)).toBe(true);
    expect(subs.every((s) => s.meal_type === "breakfast")).toBe(true);
  });

  it("nunca cruza substituições entre meal_types diferentes", () => {
    const items = [
      baseItem({ id: "bf", meal_type: "breakfast", day_of_week: 1, is_primary: true }),
      baseItem({ id: "ln", meal_type: "lunch", day_of_week: 1, is_primary: true }),
      baseItem({ id: "dn", meal_type: "dinner", day_of_week: 1, is_primary: true }),
    ];
    const out = enforceSingleDayContract(items);
    const byType = new Map<string, any[]>();
    out.forEach((i) => {
      if (!byType.has(i.meal_type)) byType.set(i.meal_type, []);
      byType.get(i.meal_type)!.push(i);
    });
    for (const [, list] of byType) {
      const primary = list.find((i) => i.is_primary);
      list
        .filter((i) => !i.is_primary)
        .forEach((s) => {
          expect(s.master_item_id).toBe(primary.id);
          expect(s.meal_type).toBe(primary.meal_type);
        });
    }
  });

  it("idempotência: aplicar duas vezes não duplica nem altera o resultado", () => {
    const items = [
      baseItem({ id: "a", meal_type: "lunch", day_of_week: 0, is_primary: true }),
      baseItem({ id: "b", meal_type: "lunch", day_of_week: 1, is_primary: true }),
    ];
    const first = enforceSingleDayContract(items);
    const second = enforceSingleDayContract(first);
    expect(second).toHaveLength(first.length);
    expect(second.every((i) => i.day_of_week === 0)).toBe(true);
    expect(second.filter((i) => i.is_primary)).toHaveLength(1);
  });

  it("invariante absoluto: contrato NUNCA devolve day_of_week=1 quando plan_mode=single_day", () => {
    // simula 100 cenários aleatórios com itens em dias variados
    for (let n = 0; n < 100; n++) {
      const items = Array.from({ length: 20 }).map((_, i) =>
        baseItem({
          id: `r-${n}-${i}`,
          meal_type: ["breakfast", "lunch", "dinner", "morning_snack", "afternoon_snack", "evening_snack"][i % 6],
          day_of_week: Math.floor(Math.random() * 7),
          is_primary: Math.random() > 0.5,
        })
      );
      const out = enforceSingleDayContract(items);
      expect(out.every((i) => i.day_of_week === 0)).toBe(true);
      // exatamente 1 primária por meal_type presente
      const primaryCount = new Map<string, number>();
      out.filter((i) => i.is_primary).forEach((i) => {
        primaryCount.set(i.meal_type, (primaryCount.get(i.meal_type) ?? 0) + 1);
      });
      for (const [, c] of primaryCount) expect(c).toBe(1);
    }
  });

  it("plano vazio devolve array vazio (sem crash)", () => {
    expect(enforceSingleDayContract([])).toEqual([]);
  });
});
