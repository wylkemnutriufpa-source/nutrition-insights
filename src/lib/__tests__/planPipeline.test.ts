/**
 * Deterministic Pipeline Test Suite — FitJourney
 * 
 * Tests the personalization engine and schedule resolver
 * with all edge-case scenarios to guarantee plan coherence.
 */

import { describe, it, expect } from "vitest";
import { personalizePlanItems, type PersonalizationContext } from "@/lib/planPersonalizationEngine";
import { isItemProtected } from "@/lib/planPipelineOrchestrator";
import type { Database } from "@/integrations/supabase/types";

type MealType = Database["public"]["Enums"]["meal_type"];

// ── Helper: create mock context ──────────────────────────────
function mockContext(overrides: Partial<PersonalizationContext> = {}): PersonalizationContext {
  return {
    patientId: "test-patient-1",
    goal: "weight_loss",
    targetCalories: 1500,
    targetProtein: 120,
    targetCarbs: 180,
    targetFat: 50,
    restrictions: [],
    rejectedFoods: [],
    schedule: {
      breakfast: "07:00",
      morning_snack: "09:30",
      lunch: "12:00",
      afternoon_snack: "15:30",
      dinner: "19:00",
      evening_snack: "21:00",
    },
    scheduleSource: "default",
    ...overrides,
  };
}

// ── Helper: create mock meal items ───────────────────────────
function mockItems(items: Array<{
  title: string;
  description?: string;
  meal_type?: MealType;
  day_of_week?: number;
  calories_target?: number;
  protein_target?: number;
  carbs_target?: number;
  fat_target?: number;
  is_locked?: boolean;
  is_manually_edited?: boolean;
}>) {
  return items.map((i, idx) => ({
    id: `item-${idx}`,
    title: i.title,
    description: i.description || "",
    meal_type: (i.meal_type || "lunch") as MealType,
    day_of_week: i.day_of_week ?? 0,
    calories_target: i.calories_target ?? 300,
    protein_target: i.protein_target ?? 25,
    carbs_target: i.carbs_target ?? 40,
    fat_target: i.fat_target ?? 10,
    is_locked: i.is_locked,
    is_manually_edited: i.is_manually_edited,
  }));
}

// ══════════════════════════════════════════════════════════════
// SCENARIO 1: Patient without schedule (fallback)
// ══════════════════════════════════════════════════════════════
describe("Scenario 1: Patient without schedule", () => {
  it("should use default schedule and add warning", () => {
    const ctx = mockContext({ scheduleSource: "default" });
    const items = mockItems([
      { title: "Pão com ovo", meal_type: "breakfast" },
      { title: "Frango grelhado", meal_type: "lunch" },
    ]);

    const result = personalizePlanItems(items, ctx);

    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings.some(w => w.includes("padrão"))).toBe(true);
    expect(result.changes.some(c => c.type === "schedule_applied")).toBe(true);
    expect(result.items.length).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO 2: Patient with all-same schedule times
// ══════════════════════════════════════════════════════════════
describe("Scenario 2: Patient with all-same schedule times", () => {
  it("should still produce valid plan with schedule applied", () => {
    const ctx = mockContext({
      schedule: {
        breakfast: "07:00",
        morning_snack: "09:30",
        lunch: "12:00",
        afternoon_snack: "15:30",
        dinner: "19:00",
        evening_snack: "21:00",
      },
      scheduleSource: "default",
    });
    const items = mockItems([
      { title: "Café da manhã", meal_type: "breakfast", calories_target: 400 },
      { title: "Almoço", meal_type: "lunch", calories_target: 600 },
      { title: "Jantar", meal_type: "dinner", calories_target: 500 },
    ]);

    const result = personalizePlanItems(items, ctx);

    expect(result.items.length).toBe(3);
    result.items.forEach(item => {
      expect(item.calories_target).toBeGreaterThan(0);
    });
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO 3: Patient with lactose restriction
// ══════════════════════════════════════════════════════════════
describe("Scenario 3: Patient with lactose restriction", () => {
  it("should replace dairy products with alternatives", () => {
    const ctx = mockContext({ restrictions: ["lactose"] });
    const items = mockItems([
      { title: "Iogurte com granola", description: "Iogurte natural com granola e mel" },
      { title: "Frango grelhado", description: "Peito de frango com arroz" },
    ]);

    const result = personalizePlanItems(items, ctx);

    expect(result.changes.some(c => c.type === "restriction_removed")).toBe(true);
    const iogurteItem = result.items[0];
    expect(iogurteItem.title?.toLowerCase()).toContain("coco");
    const frangoItem = result.items[1];
    expect(frangoItem.title?.toLowerCase()).toContain("frango");
  });

  it("should replace whey with plant protein", () => {
    const ctx = mockContext({ restrictions: ["lactose"] });
    const items = mockItems([
      { title: "Whey protein", description: "Whey com banana" },
    ]);

    const result = personalizePlanItems(items, ctx);

    expect(result.changes.length).toBeGreaterThan(0);
    expect(result.items[0].title?.toLowerCase()).not.toContain("whey");
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO 4: Patient with gluten restriction
// ══════════════════════════════════════════════════════════════
describe("Scenario 4: Patient with gluten restriction", () => {
  it("should replace gluten-containing foods", () => {
    const ctx = mockContext({ restrictions: ["gluten"] });
    const items = mockItems([
      { title: "Pão integral", description: "2 fatias de pão integral" },
      { title: "Frango com macarrão", description: "Macarrão com frango desfiado" },
    ]);

    const result = personalizePlanItems(items, ctx);

    expect(result.changes.some(c => c.type === "restriction_removed")).toBe(true);
    const breadItem = result.items[0];
    expect(breadItem.title?.toLowerCase()).toContain("tapioca");
    const pastaItem = result.items[1];
    expect(pastaItem.description?.toLowerCase()).toContain("arroz");
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO 5: Patient with rejected foods
// ══════════════════════════════════════════════════════════════
describe("Scenario 5: Patient with rejected foods", () => {
  it("should remove explicitly rejected foods", () => {
    const ctx = mockContext({ rejectedFoods: ["brócolis", "berinjela"] });
    const items = mockItems([
      { title: "Frango com brócolis", description: "Frango grelhado com brócolis" },
      { title: "Carne com batata", description: "Carne moída com purê" },
    ]);

    const result = personalizePlanItems(items, ctx);

    expect(result.changes.some(c => c.type === "rejected_removed")).toBe(true);
    expect(result.items[0].description?.toLowerCase()).not.toContain("brócolis");
    expect(result.items[1].title?.toLowerCase()).toContain("carne");
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO 6: Template incompatible with target calories
// ══════════════════════════════════════════════════════════════
describe("Scenario 6: Template incompatible with target calories", () => {
  it("should adjust calories when deviation > 10%", () => {
    const ctx = mockContext({ targetCalories: 1500 });
    const items = mockItems([
      { title: "Café", meal_type: "breakfast", day_of_week: 0, calories_target: 600 },
      { title: "Almoço", meal_type: "lunch", day_of_week: 0, calories_target: 900 },
      { title: "Jantar", meal_type: "dinner", day_of_week: 0, calories_target: 700 },
      { title: "Lanche", meal_type: "afternoon_snack", day_of_week: 0, calories_target: 300 },
    ]);

    const result = personalizePlanItems(items, ctx);

    expect(result.changes.some(c => c.type === "calorie_adjusted")).toBe(true);
    const totalCal = result.items.reduce((s, i) => s + (i.calories_target || 0), 0);
    expect(totalCal).toBeLessThan(2000);
    expect(totalCal).toBeGreaterThan(1200);
  });

  it("should NOT adjust if deviation < 10%", () => {
    const ctx = mockContext({ targetCalories: 1500 });
    const items = mockItems([
      { title: "Café", meal_type: "breakfast", day_of_week: 0, calories_target: 350 },
      { title: "Almoço", meal_type: "lunch", day_of_week: 0, calories_target: 500 },
      { title: "Jantar", meal_type: "dinner", day_of_week: 0, calories_target: 450 },
      { title: "Lanche", meal_type: "afternoon_snack", day_of_week: 0, calories_target: 200 },
    ]);

    const result = personalizePlanItems(items, ctx);

    expect(result.changes.some(c => c.type === "calorie_adjusted")).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO 7: Template with blocked food
// ══════════════════════════════════════════════════════════════
describe("Scenario 7: Template with blocked food in restrictions", () => {
  it("should handle multiple restrictions simultaneously", () => {
    const ctx = mockContext({ restrictions: ["lactose", "gluten"] });
    const items = mockItems([
      { title: "Pão com queijo", description: "Pão integral com queijo mussarela" },
    ]);

    const result = personalizePlanItems(items, ctx);

    expect(result.changes.filter(c => c.type === "restriction_removed").length).toBeGreaterThanOrEqual(2);
    expect(result.items[0].title?.toLowerCase()).not.toContain("pão");
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO 8: Patient without completed anamnesis
// ══════════════════════════════════════════════════════════════
describe("Scenario 8: Patient without anamnesis (null context)", () => {
  it("should produce plan unchanged when context is null", () => {
    const ctx = mockContext({
      restrictions: [],
      rejectedFoods: [],
      targetCalories: 0,
    });
    const items = mockItems([
      { title: "Frango com arroz", calories_target: 500 },
      { title: "Pão com ovo", calories_target: 300 },
    ]);

    const result = personalizePlanItems(items, ctx);

    expect(result.changes.filter(c => c.type === "restriction_removed").length).toBe(0);
    expect(result.changes.filter(c => c.type === "rejected_removed").length).toBe(0);
    expect(result.changes.filter(c => c.type === "calorie_adjusted").length).toBe(0);
    expect(result.items[0].title).toBe("Frango com arroz");
    expect(result.items[1].title).toBe("Pão com ovo");
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO 9: Manually edited items are protected
// ══════════════════════════════════════════════════════════════
describe("Scenario 9: Protected items skip personalization", () => {
  it("should not modify locked items", () => {
    const ctx = mockContext({ restrictions: ["lactose"] });
    const items = [
      {
        id: "item-1",
        title: "Iogurte especial",
        description: "Iogurte artesanal",
        meal_type: "breakfast" as MealType,
        day_of_week: 0,
        calories_target: 200,
        protein_target: 15,
        carbs_target: 20,
        fat_target: 8,
        is_locked: true,
        is_manually_edited: true,
      },
      {
        id: "item-2",
        title: "Leite com café",
        description: "Leite integral",
        meal_type: "breakfast" as MealType,
        day_of_week: 0,
        calories_target: 150,
        protein_target: 8,
        carbs_target: 12,
        fat_target: 6,
      },
    ];

    const result = personalizePlanItems(items, ctx);

    expect(result.items[0].title).toBe("Iogurte especial");
    expect(result.items[1].title?.toLowerCase()).not.toContain("leite");
  });

  it("isItemProtected correctly identifies protected items", () => {
    expect(isItemProtected({ is_locked: true })).toBe(true);
    expect(isItemProtected({ is_manually_edited: true })).toBe(true);
    expect(isItemProtected({ is_locked: false, is_manually_edited: false })).toBe(false);
    expect(isItemProtected({})).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO 10: Schedule change log
// ══════════════════════════════════════════════════════════════
describe("Scenario 10: Schedule audit trail", () => {
  it("should include schedule_applied change with source info", () => {
    const ctx = mockContext({
      scheduleSource: "anamnesis_wake_sleep",
      schedule: {
        breakfast: "06:30",
        morning_snack: "09:00",
        lunch: "12:30",
        afternoon_snack: "15:00",
        dinner: "18:30",
        evening_snack: "20:30",
      },
    });
    const items = mockItems([{ title: "Test" }]);

    const result = personalizePlanItems(items, ctx);

    const scheduleChange = result.changes.find(c => c.type === "schedule_applied");
    expect(scheduleChange).toBeDefined();
    expect(scheduleChange!.detail).toContain("anamnesis_wake_sleep");
    expect(scheduleChange!.detail).toContain("06:30");
  });

  it("should warn when using default schedule", () => {
    const ctx = mockContext({ scheduleSource: "default" });
    const items = mockItems([{ title: "Test" }]);

    const result = personalizePlanItems(items, ctx);

    expect(result.warnings.some(w => w.includes("padrão"))).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO 11: Vegetarian restriction
// ══════════════════════════════════════════════════════════════
describe("Scenario 11: Vegetarian restriction", () => {
  it("should remove all animal proteins", () => {
    const ctx = mockContext({ restrictions: ["vegetariano"] });
    const items = mockItems([
      { title: "Frango grelhado com arroz", description: "Peito de frango 120g + arroz 100g" },
      { title: "Salada de grão-de-bico", description: "Grão-de-bico com legumes" },
    ]);

    const result = personalizePlanItems(items, ctx);

    expect(result.changes.some(c => c.type === "restriction_removed")).toBe(true);
    const frangoItem = result.items[0];
    expect(frangoItem.title?.toLowerCase()).not.toContain("frango");
    expect(result.items[1].title?.toLowerCase()).toContain("grão-de-bico");
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO 12: Combined restrictions + rejected + calorie adjustment
// ══════════════════════════════════════════════════════════════
describe("Scenario 12: Full pipeline - combined adjustments", () => {
  it("should apply all personalization layers correctly", () => {
    const ctx = mockContext({
      restrictions: ["lactose"],
      rejectedFoods: ["brocolis"],
      targetCalories: 1200,
    });
    const items = mockItems([
      { title: "Iogurte com frutas", meal_type: "breakfast", day_of_week: 0, calories_target: 400 },
      { title: "Frango com brócolis", meal_type: "lunch", day_of_week: 0, calories_target: 600 },
      { title: "Carne com legumes", meal_type: "dinner", day_of_week: 0, calories_target: 500 },
    ]);

    const result = personalizePlanItems(items, ctx);

    expect(result.changes.some(c => c.type === "restriction_removed")).toBe(true);
    expect(result.changes.some(c => c.type === "rejected_removed")).toBe(true);
    expect(result.changes.some(c => c.type === "calorie_adjusted")).toBe(true);
    expect(result.changes.some(c => c.type === "schedule_applied")).toBe(true);

    expect(result.items.length).toBe(3);
    result.items.forEach(item => {
      expect(item.calories_target).toBeGreaterThan(0);
    });
  });
});
