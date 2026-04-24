/**
 * Cobertura específica: cenários onde `forceCanonical` está ATIVO
 * e quando o fallback ocorre. Garante que NEM header NEM migração
 * nem undo "misturam" itens de dias diferentes.
 *
 * Esses testes complementam `editorCanonicalIntegration.test.ts`
 * focando em armadilhas: itens em múltiplos dias legados, day 0 vazio
 * vs ocupado, alternância de forceCanonical sem perder consistência.
 */
import { describe, it, expect } from "vitest";
import { resolveHeaderSnapshot } from "../editorHeaderSnapshot";
import {
  planLegacyConsolidation,
  buildMigrationUndoSnapshot,
} from "../legacyDayConsolidation";
import { resolveEffectiveDay } from "../resolveEffectiveDay";

const mk = (id: string, day: number, meal: string, cals = 100) =>
  ({
    id,
    day_of_week: day,
    meal_type: meal,
    calories_target: cals,
    protein_target: cals / 10,
    carbs_target: cals / 5,
    fat_target: cals / 20,
  } as any);

describe("forceCanonical ATIVO", () => {
  it("header em day 0 SEMPRE ignora itens legados nos totais", () => {
    const items = [
      mk("d0", 0, "lunch", 400),
      mk("legacy1", 1, "lunch", 999),
      mk("legacy2", 2, "dinner", 888),
    ];
    const snap = resolveHeaderSnapshot(items, { forceCanonical: true });

    expect(snap.effectiveDay).toBe(0);
    expect(snap.showingLegacy).toBe(false);
    expect(snap.totals.calories).toBe(400); // só day 0
  });

  it("com day 0 VAZIO e forceCanonical, totais são zero (não mistura legado)", () => {
    const items = [mk("legacy", 1, "lunch", 500)];
    const snap = resolveHeaderSnapshot(items, { forceCanonical: true });
    expect(snap.effectiveDay).toBe(0);
    expect(snap.totals.calories).toBe(0);
    expect(snap.showingLegacy).toBe(false);
  });

  it("planLegacyConsolidation NÃO depende de forceCanonical (sempre considera todos os legados)", () => {
    const items = [mk("d0", 0, "breakfast"), mk("l1", 1, "lunch"), mk("l3", 3, "dinner")];

    // Mesmo com header forçado em day 0, a consolidação enxerga os legados.
    const plan = planLegacyConsolidation(items);
    expect(plan.legacyCount).toBe(2);
    expect(plan.toMove.sort()).toEqual(["l1", "l3"]);
  });
});

describe("fallback (forceCanonical = false)", () => {
  it("itens em múltiplos dias legados → fallback para o MENOR (1)", () => {
    const items = [mk("a", 5, "lunch", 100), mk("b", 1, "dinner", 200), mk("c", 3, "breakfast", 300)];
    const snap = resolveHeaderSnapshot(items, { forceCanonical: false });

    expect(snap.effectiveDay).toBe(1);
    // Totais devem refletir APENAS day 1, não somar todos os dias
    expect(snap.totals.calories).toBe(200);
  });

  it("totais por dia são isolados — header day 1 != header day 3", () => {
    const items = [mk("a", 1, "lunch", 100), mk("b", 3, "dinner", 700)];
    const snapDay1 = resolveHeaderSnapshot(items, { forceCanonical: false });
    expect(snapDay1.effectiveDay).toBe(1);
    expect(snapDay1.totals.calories).toBe(100);

    // Removemos day 1 → fallback agora vai para day 3
    const items2 = items.filter((i) => i.day_of_week !== 1);
    const snapDay3 = resolveHeaderSnapshot(items2, { forceCanonical: false });
    expect(snapDay3.effectiveDay).toBe(3);
    expect(snapDay3.totals.calories).toBe(700);
  });

  it("alternar forceCanonical NÃO altera dataset; apenas o effectiveDay observado", () => {
    const items = [mk("a", 1, "lunch", 500)];

    const fallback = resolveHeaderSnapshot(items, { forceCanonical: false });
    const canonical = resolveHeaderSnapshot(items, { forceCanonical: true });

    expect(fallback.effectiveDay).toBe(1);
    expect(fallback.totals.calories).toBe(500);

    expect(canonical.effectiveDay).toBe(0);
    expect(canonical.totals.calories).toBe(0);

    // Item original intocado
    expect(items[0].day_of_week).toBe(1);
  });
});

describe("migração + undo NÃO misturam dias quando há vários legados", () => {
  it("undo restaura cada item ao seu dia original (não para um único dia)", () => {
    const items = [mk("a", 1, "breakfast"), mk("b", 3, "lunch"), mk("c", 5, "dinner")];
    const plan = planLegacyConsolidation(items);
    const undo = buildMigrationUndoSnapshot(items, plan.toMove);

    // Aplica migração (todos vão p/ 0)
    let next = items.map((i) =>
      plan.toMove.includes(i.id) ? { ...i, day_of_week: 0 } : i
    );
    expect(resolveEffectiveDay(next, { forceCanonical: false })).toBe(0);

    // Aplica undo
    const m = new Map(undo.map((u) => [u.itemId, u.previousDay]));
    next = next.map((i) => (m.has(i.id) ? { ...i, day_of_week: m.get(i.id)! } : i));

    expect(next.find((i) => i.id === "a")?.day_of_week).toBe(1);
    expect(next.find((i) => i.id === "b")?.day_of_week).toBe(3);
    expect(next.find((i) => i.id === "c")?.day_of_week).toBe(5);
  });

  it("após undo, header em fallback volta ao MENOR dia legado original", () => {
    const items = [mk("a", 2, "lunch", 300), mk("b", 4, "dinner", 700)];
    const plan = planLegacyConsolidation(items);
    const undo = buildMigrationUndoSnapshot(items, plan.toMove);

    // Migra
    let next = items.map((i) =>
      plan.toMove.includes(i.id) ? { ...i, day_of_week: 0 } : i
    );
    // Header pós-migração com forceCanonical=true
    let snap = resolveHeaderSnapshot(next, { forceCanonical: true });
    expect(snap.effectiveDay).toBe(0);
    expect(snap.totals.calories).toBe(1000);

    // Desfaz
    const m = new Map(undo.map((u) => [u.itemId, u.previousDay]));
    next = next.map((i) => (m.has(i.id) ? { ...i, day_of_week: m.get(i.id)! } : i));

    // Header DEVE voltar para fallback ao menor legado (2)
    snap = resolveHeaderSnapshot(next, { forceCanonical: false });
    expect(snap.effectiveDay).toBe(2);
    expect(snap.totals.calories).toBe(300); // só day 2
  });

  it("conflito: itens conflitantes ficam intocados; undo ignora os preservados", () => {
    const items = [
      mk("d0_lunch", 0, "lunch", 200),
      mk("legacy_lunch", 1, "lunch", 999), // conflita
      mk("legacy_dinner", 1, "dinner", 500), // move
    ];
    const plan = planLegacyConsolidation(items);
    expect(plan.toMove).toEqual(["legacy_dinner"]);

    const undo = buildMigrationUndoSnapshot(items, plan.toMove);
    expect(undo).toEqual([{ itemId: "legacy_dinner", previousDay: 1 }]);
    // Importante: undo NÃO restaura o conflitante (que nunca foi mexido)
    expect(undo.find((u) => u.itemId === "legacy_lunch")).toBeUndefined();
  });
});
