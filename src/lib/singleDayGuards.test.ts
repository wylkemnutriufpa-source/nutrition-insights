import { describe, expect, it } from "vitest";
import {
  assertSingleDayItems,
  assertUiMatchesDb,
  detectAutomatedWeeklyVariation,
  diffUiVsDb,
  SingleDayViolationError,
} from "./singleDayGuards";

const make = (over: Record<string, unknown> = {}) => ({
  id: "i1",
  title: "Frango grelhado",
  meal_type: "lunch" as const,
  day_of_week: 0,
  calories_target: 400,
  protein_target: 40,
  carbs_target: 30,
  fat_target: 12,
  ...over,
});

describe("singleDayGuards — assertSingleDayItems", () => {
  it("aceita lista 100% no day=0", () => {
    const items = [make(), make({ id: "i2", meal_type: "dinner" })];
    expect(assertSingleDayItems(items)).toEqual(items);
  });

  it("bloqueia item com day_of_week=1", () => {
    const items = [make(), make({ id: "i2", day_of_week: 1 })];
    expect(() => assertSingleDayItems(items)).toThrowError(SingleDayViolationError);
  });

  it("bloqueia variação semanal completa (1..7)", () => {
    const items = Array.from({ length: 7 }, (_, d) =>
      make({ id: `i${d}`, day_of_week: d + 1 })
    );
    expect(() => assertSingleDayItems(items)).toThrow(/Modo Dia Padrão/);
  });

  it("autoFix=true normaliza para day=0 sem lançar", () => {
    const fixed = assertSingleDayItems(
      [make({ day_of_week: 3 })],
      { autoFix: true }
    );
    expect(fixed[0].day_of_week).toBe(0);
  });
});

describe("singleDayGuards — detectAutomatedWeeklyVariation", () => {
  it("não acusa variação quando todos itens estão em day=0", () => {
    const r = detectAutomatedWeeklyVariation([make(), make({ id: "i2" })]);
    expect(r.hasVariation).toBe(false);
    expect(r.daysFound).toEqual([0]);
  });

  it("detecta variação quando há múltiplos dias", () => {
    const r = detectAutomatedWeeklyVariation([
      make({ day_of_week: 0 }),
      make({ id: "i2", day_of_week: 1 }),
      make({ id: "i3", day_of_week: 2 }),
    ]);
    expect(r.hasVariation).toBe(true);
    expect(r.daysFound).toEqual([0, 1, 2]);
    expect(r.reason).toMatch(/3 dias distintos/);
  });
});

describe("singleDayGuards — diffUiVsDb / assertUiMatchesDb", () => {
  it("considera UI e DB sincronizados quando snapshots batem", () => {
    const ui = [make()];
    const db = [make()];
    const diff = diffUiVsDb(ui, db);
    expect(diff.inSync).toBe(true);
    expect(() => assertUiMatchesDb(ui, db)).not.toThrow();
  });

  it("acusa item presente na UI e ausente no DB", () => {
    const ui = [make(), make({ id: "i2" })];
    const db = [make()];
    const diff = diffUiVsDb(ui, db);
    expect(diff.inSync).toBe(false);
    expect(diff.missingInDb).toHaveLength(1);
    expect(diff.missingInDb[0].id).toBe("i2");
  });

  it("acusa drift de macros (UI desatualizada vs DB)", () => {
    const ui = [make({ protein_target: 40 })];
    const db = [make({ protein_target: 55 })];
    const diff = diffUiVsDb(ui, db);
    expect(diff.inSync).toBe(false);
    expect(diff.drifted).toHaveLength(1);
    expect(() => assertUiMatchesDb(ui, db)).toThrow(/UI fora de sincronia/);
  });

  it("ignora pequenas diferenças de arredondamento ≤ 0.05", () => {
    const ui = [make({ protein_target: 40.001 })];
    const db = [make({ protein_target: 39.999 })];
    expect(diffUiVsDb(ui, db).inSync).toBe(true);
  });
});
