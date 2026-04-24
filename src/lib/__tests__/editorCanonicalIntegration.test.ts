/**
 * Testes de integração para o fluxo:
 *   1. Profissional abre o editor com `?canonical=0` (fallback ON)
 *   2. ListView/WeeklyGrid mostram o primeiro dia legado com itens
 *   3. Ao salvar, `planLegacyConsolidation` move tudo para day 0
 *
 * Mantemos os testes em nível de função pura para serem
 * determinísticos e rápidos (sem montar React).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveHeaderSnapshot } from "../editorHeaderSnapshot";
import {
  planLegacyConsolidation,
  buildMigrationUndoSnapshot,
} from "../legacyDayConsolidation";

const mk = (id: string, day: number, meal: string, cals = 100) =>
  ({
    id,
    day_of_week: day,
    meal_type: meal,
    calories_target: cals,
  } as any);

/**
 * Simula a leitura do hook `useForceCanonicalDay`. O hook real lê primeiro
 * o query param `?canonical=`, depois `localStorage`. Aqui replicamos a
 * mesma lógica determinística para validar o comportamento end-to-end.
 */
function simulateReadForceCanonical(search: string): boolean {
  const params = new URLSearchParams(search);
  const fromUrl = params.get("canonical");
  if (fromUrl === "1" || fromUrl === "true") return true;
  if (fromUrl === "0" || fromUrl === "false") return false;
  // Sem query → default = canônico
  return true;
}

describe("integração canonical=0 + auto-consolidation no save", () => {
  describe("?canonical=0 → fallback para primeiro dia legado", () => {
    it("plano com itens APENAS em segunda → fallback para day 1", () => {
      const force = simulateReadForceCanonical("?canonical=0");
      expect(force).toBe(false);

      const items = [
        mk("a", 1, "breakfast", 200),
        mk("b", 1, "lunch", 500),
      ];
      const snap = resolveHeaderSnapshot(items, { forceCanonical: force });

      expect(snap.effectiveDay).toBe(1);
      expect(snap.effectiveDayLabel).toBe("Segunda");
      expect(snap.showingLegacy).toBe(true);
      expect(snap.totals.calories).toBe(700);
    });

    it("plano sem day 0 e itens em day 3 → fallback para 3 (não para 1)", () => {
      const force = simulateReadForceCanonical("?canonical=0");
      const items = [mk("a", 3, "lunch", 600)];
      const snap = resolveHeaderSnapshot(items, { forceCanonical: force });

      expect(snap.effectiveDay).toBe(3);
      expect(snap.effectiveDayLabel).toBe("Quarta");
    });

    it("?canonical=1 SOBRESCREVE fallback mesmo com day 0 vazio", () => {
      const force = simulateReadForceCanonical("?canonical=1");
      const items = [mk("a", 1, "lunch", 500)];
      const snap = resolveHeaderSnapshot(items, { forceCanonical: force });

      expect(snap.effectiveDay).toBe(0);
      expect(snap.totals.calories).toBe(0);
    });

    it("ausência do query param mantém comportamento canônico (default)", () => {
      const force = simulateReadForceCanonical("");
      expect(force).toBe(true);
    });
  });

  describe("ao salvar → consolida automaticamente para day 0", () => {
    it("move TODOS os itens legados quando day 0 está vazio", () => {
      const items = [
        mk("a", 1, "breakfast"),
        mk("b", 1, "lunch"),
        mk("c", 1, "dinner"),
      ];
      const plan = planLegacyConsolidation(items);

      expect(plan.toMove).toEqual(["a", "b", "c"]);
      expect(plan.movedByMealType).toEqual({
        breakfast: 1,
        lunch: 1,
        dinner: 1,
      });
      expect(plan.conflicts).toEqual([]);
    });

    it("preserva itens que conflitam com day 0", () => {
      const items = [
        mk("d0_lunch", 0, "lunch"),
        mk("legacy_lunch", 1, "lunch"),
        mk("legacy_dinner", 1, "dinner"),
      ];
      const plan = planLegacyConsolidation(items);

      expect(plan.toMove).toEqual(["legacy_dinner"]);
      expect(plan.conflicts).toHaveLength(1);
      expect(plan.conflicts[0]).toEqual({
        itemId: "legacy_lunch",
        mealType: "lunch",
        fromDay: 1,
      });
    });

    it("após consolidar, header com forceCanonical=true reflete day 0 corretamente", () => {
      const items = [mk("a", 1, "lunch", 500)];
      const plan = planLegacyConsolidation(items);

      // Simula a aplicação do plano (mover toMove → day 0)
      const consolidated = items.map((i) =>
        plan.toMove.includes(i.id) ? { ...i, day_of_week: 0 } : i
      );

      const snapAfter = resolveHeaderSnapshot(consolidated, {
        forceCanonical: true,
      });

      expect(snapAfter.effectiveDay).toBe(0);
      expect(snapAfter.totals.calories).toBe(500);
      expect(snapAfter.showingLegacy).toBe(false);
    });

    it("undo snapshot permite reverter consolidação restaurando dia original", () => {
      const items = [
        mk("a", 2, "breakfast"),
        mk("b", 4, "lunch"),
      ];
      const plan = planLegacyConsolidation(items);
      const undo = buildMigrationUndoSnapshot(items, plan.toMove);

      // Aplica migração
      let next = items.map((i) =>
        plan.toMove.includes(i.id) ? { ...i, day_of_week: 0 } : i
      );
      expect(next.every((i) => i.day_of_week === 0)).toBe(true);

      // Aplica undo
      const undoMap = new Map(undo.map((u) => [u.itemId, u.previousDay]));
      next = next.map((i) =>
        undoMap.has(i.id) ? { ...i, day_of_week: undoMap.get(i.id)! } : i
      );

      expect(next.find((i) => i.id === "a")?.day_of_week).toBe(2);
      expect(next.find((i) => i.id === "b")?.day_of_week).toBe(4);
    });
  });

  describe("fluxo completo: abre com canonical=0 → fallback → salva → tudo em day 0", () => {
    it("integra todos os passos sem perder informação", () => {
      // 1. Profissional abre `/meal-plans/xxx?canonical=0`
      const force = simulateReadForceCanonical("?canonical=0");
      const items = [
        mk("a", 1, "breakfast", 200),
        mk("b", 1, "lunch", 500),
      ];

      // 2. Editor mostra fallback day 1 com totais corretos
      const snapBefore = resolveHeaderSnapshot(items, { forceCanonical: force });
      expect(snapBefore.effectiveDay).toBe(1);
      expect(snapBefore.totals.calories).toBe(700);

      // 3. Profissional clica em salvar → consolidação roda
      const plan = planLegacyConsolidation(items);
      expect(plan.toMove).toEqual(["a", "b"]);

      const consolidated = items.map((i) =>
        plan.toMove.includes(i.id) ? { ...i, day_of_week: 0 } : i
      );

      // 4. Após salvar, ao recarregar com canonical=1 (preferência pós-save),
      //    header mostra day 0 com totais idênticos.
      const snapAfter = resolveHeaderSnapshot(consolidated, {
        forceCanonical: true,
      });
      expect(snapAfter.effectiveDay).toBe(0);
      expect(snapAfter.totals.calories).toBe(700);
      expect(snapAfter.showingLegacy).toBe(false);
    });
  });
});
