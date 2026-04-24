import { describe, it, expect } from "vitest";
import {
  checkSingleDayConsistency,
  assertSingleDayConsistency,
  SingleDayConsistencyError,
} from "./singleDayConsistency";
import { classifyPlanMode, ensurePlanMode, isLegacyPlan } from "./singleDayPlanMigration";

const baseItem = (over: Record<string, unknown> = {}) => ({
  id: crypto.randomUUID(),
  title: "Frango grelhado",
  meal_type: "lunch",
  day_of_week: 0,
  calories_target: 400,
  protein_target: 40,
  carbs_target: 30,
  fat_target: 10,
  ...over,
});

describe("singleDayPlanMigration", () => {
  it("classifica plano sem plan_mode como weekly", () => {
    expect(classifyPlanMode(null)).toBe("weekly");
    expect(classifyPlanMode({})).toBe("weekly");
    expect(classifyPlanMode({ plan_mode: null as any })).toBe("weekly");
    expect(classifyPlanMode({ plan_mode: "weekly" })).toBe("weekly");
    expect(classifyPlanMode({ plan_mode: "single_day" })).toBe("single_day");
    expect(classifyPlanMode({ plan_mode: "wat" as any })).toBe("weekly");
  });

  it("ensurePlanMode preserva e injeta o modo correto", () => {
    const p = ensurePlanMode({ id: "x" } as any);
    expect(p.plan_mode).toBe("weekly");
  });

  it("detecta planos legados", () => {
    expect(isLegacyPlan(null)).toBe(false);
    expect(isLegacyPlan({})).toBe(true);
    expect(isLegacyPlan({ plan_mode: "weekly" })).toBe(false);
    expect(isLegacyPlan({ plan_mode: "single_day" })).toBe(false);
  });
});

describe("checkSingleDayConsistency", () => {
  it("é válido quando master e dias 1-6 são idênticos", () => {
    const items: any[] = [];
    for (let d = 0; d <= 6; d++) {
      items.push(baseItem({ day_of_week: d }));
      items.push(baseItem({ day_of_week: d, meal_type: "breakfast", title: "Pão" }));
    }
    const r = checkSingleDayConsistency(items);
    expect(r.valid).toBe(true);
    expect(r.issues).toHaveLength(0);
  });

  it("detecta item faltando em algum dia", () => {
    const items: any[] = [baseItem()];
    for (let d = 1; d <= 5; d++) items.push(baseItem({ day_of_week: d }));
    // dia 6 sem item
    const r = checkSingleDayConsistency(items);
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.day === 6 && i.issue === "missing_in_day")).toBe(true);
  });

  it("detecta item extra num dia replicado", () => {
    const items: any[] = [baseItem()];
    for (let d = 1; d <= 6; d++) items.push(baseItem({ day_of_week: d }));
    items.push(baseItem({ day_of_week: 3, title: "Bife" }));
    const r = checkSingleDayConsistency(items);
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.day === 3 && i.issue === "extra_in_day")).toBe(true);
  });

  it("detecta drift de macros (mesmo título, kcal diferente)", () => {
    const items: any[] = [baseItem()];
    for (let d = 1; d <= 5; d++) items.push(baseItem({ day_of_week: d }));
    items.push(baseItem({ day_of_week: 6, calories_target: 600 })); // drift
    const r = checkSingleDayConsistency(items);
    expect(r.valid).toBe(false);
  });

  it("assertSingleDayConsistency lança em estado inconsistente", () => {
    const items: any[] = [baseItem()];
    expect(() => assertSingleDayConsistency(items)).toThrow(SingleDayConsistencyError);
  });
});
