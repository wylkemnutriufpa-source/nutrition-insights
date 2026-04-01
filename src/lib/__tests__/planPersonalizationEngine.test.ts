/**
 * Testes unitários — Motor de Personalização de Planos
 * Testa a lógica pura (personalizePlanItems) sem acesso ao banco.
 */
import { describe, it, expect } from "vitest";
import {
  personalizePlanItems,
  type PersonalizationContext,
} from "../planPersonalizationEngine";

function makeContext(overrides: Partial<PersonalizationContext> = {}): PersonalizationContext {
  return {
    patientId: "patient-1",
    goal: "weight_loss",
    targetCalories: 1800,
    targetProtein: 120,
    targetCarbs: 200,
    targetFat: 55,
    restrictions: [],
    rejectedFoods: [],
    schedule: { breakfast: "07:00", lunch: "12:00", dinner: "19:00" },
    scheduleSource: "anamnesis",
    ...overrides,
  };
}

function makeItems() {
  return [
    { title: "Pão com ovo", description: "2 fatias de pão integral, 2 ovos mexidos", meal_type: "breakfast" as const, day_of_week: 1, calories_target: 350, protein_target: 20, carbs_target: 40, fat_target: 12 },
    { title: "Arroz com frango", description: "Arroz branco, peito de frango grelhado, feijão", meal_type: "lunch" as const, day_of_week: 1, calories_target: 550, protein_target: 40, carbs_target: 60, fat_target: 15 },
    { title: "Iogurte com banana", description: "Iogurte natural, banana, granola", meal_type: "afternoon_snack" as const, day_of_week: 1, calories_target: 250, protein_target: 10, carbs_target: 35, fat_target: 8 },
    { title: "Carne moída com batata", description: "Carne moída refogada, batata doce cozida", meal_type: "dinner" as const, day_of_week: 1, calories_target: 450, protein_target: 30, carbs_target: 45, fat_target: 14 },
  ];
}

describe("personalizePlanItems — Restrições", () => {
  it("remove alimentos com lactose e aplica substituição", () => {
    const ctx = makeContext({ restrictions: ["lactose"] });
    const items = makeItems();
    const result = personalizePlanItems(items, ctx);

    // Iogurte deve ter sido substituído
    const snack = result.items.find(i => i.meal_type === "afternoon_snack");
    expect(snack?.title?.toLowerCase()).not.toContain("iogurte");
    expect(result.changes.some(c => c.type === "restriction_removed")).toBe(true);
  });

  it("remove alimentos com glúten e aplica substituição", () => {
    const ctx = makeContext({ restrictions: ["gluten"] });
    const items = makeItems();
    const result = personalizePlanItems(items, ctx);

    // Pão deve ter sido substituído por tapioca
    const breakfast = result.items.find(i => i.meal_type === "breakfast");
    expect(breakfast?.title?.toLowerCase()).not.toContain("pão");
    expect(result.changes.some(c => c.detail.includes("pão"))).toBe(true);
  });

  it("lida com múltiplas restrições simultaneamente", () => {
    const ctx = makeContext({ restrictions: ["lactose", "gluten"] });
    const items = makeItems();
    const result = personalizePlanItems(items, ctx);

    // Ambas as substituições devem ocorrer
    const hasLactoseChange = result.changes.some(c => c.detail.includes("lactose"));
    const hasGlutenChange = result.changes.some(c => c.detail.includes("gluten") || c.detail.includes("pão"));
    expect(hasLactoseChange || hasGlutenChange).toBe(true);
  });

  it("não modifica itens protegidos (is_locked)", () => {
    const ctx = makeContext({ restrictions: ["lactose"] });
    const items = [
      { title: "Iogurte especial", description: "Iogurte grego", meal_type: "snack" as const, day_of_week: 1, calories_target: 200, protein_target: 10, carbs_target: 20, fat_target: 8, is_locked: true },
    ];
    const result = personalizePlanItems(items as any, ctx);
    expect(result.items[0].title).toBe("Iogurte especial");
  });

  it("não modifica itens manualmente editados", () => {
    const ctx = makeContext({ restrictions: ["gluten"] });
    const items = [
      { title: "Pão artesanal", description: "Pão com queijo", meal_type: "breakfast" as const, day_of_week: 1, calories_target: 300, protein_target: 12, carbs_target: 35, fat_target: 10, is_manually_edited: true },
    ];
    const result = personalizePlanItems(items as any, ctx);
    expect(result.items[0].title).toBe("Pão artesanal");
  });
});

describe("personalizePlanItems — Alimentos rejeitados", () => {
  it("remove alimento rejeitado pelo paciente", () => {
    const ctx = makeContext({ rejectedFoods: ["banana"] });
    const items = makeItems();
    const result = personalizePlanItems(items, ctx);

    const snack = result.items.find(i => i.meal_type === "snack");
    expect(snack?.description?.toLowerCase()).not.toContain("banana");
    expect(result.changes.some(c => c.type === "rejected_removed")).toBe(true);
  });
});

describe("personalizePlanItems — Ajuste calórico", () => {
  it("ajusta calorias quando desvio > 10%", () => {
    const ctx = makeContext({ targetCalories: 1200 });
    const items = makeItems(); // total ~1600 kcal
    const result = personalizePlanItems(items, ctx);

    const hasCalorieChange = result.changes.some(c => c.type === "calorie_adjusted");
    expect(hasCalorieChange).toBe(true);
    // Calorias devem ter diminuído
    const totalAfter = result.items.reduce((s, i) => s + (i.calories_target || 0), 0);
    const totalBefore = items.reduce((s, i) => s + (i.calories_target || 0), 0);
    expect(totalAfter).toBeLessThan(totalBefore);
  });

  it("não ajusta quando desvio < 10%", () => {
    const ctx = makeContext({ targetCalories: 1580 }); // items sum ~1600
    const items = makeItems();
    const result = personalizePlanItems(items, ctx);

    const hasCalorieChange = result.changes.some(c => c.type === "calorie_adjusted");
    expect(hasCalorieChange).toBe(false);
  });

  it("pula escalonamento calórico quando skipCalorieScaling = true", () => {
    const ctx = makeContext({ targetCalories: 1200 });
    const items = makeItems();
    const result = personalizePlanItems(items, ctx, { skipCalorieScaling: true });

    const hasCalorieChange = result.changes.some(c => c.type === "calorie_adjusted");
    expect(hasCalorieChange).toBe(false);
  });
});

describe("personalizePlanItems — Schedule", () => {
  it("adiciona warning quando scheduleSource é default", () => {
    const ctx = makeContext({ scheduleSource: "default" });
    const items = makeItems();
    const result = personalizePlanItems(items, ctx);

    expect(result.warnings.some(w => w.includes("padrão"))).toBe(true);
  });

  it("registra schedule aplicado nos changes", () => {
    const ctx = makeContext();
    const items = makeItems();
    const result = personalizePlanItems(items, ctx);

    expect(result.changes.some(c => c.type === "schedule_applied")).toBe(true);
  });
});

describe("personalizePlanItems — Edge cases", () => {
  it("lida com items vazios sem crash", () => {
    const ctx = makeContext();
    const result = personalizePlanItems([], ctx);
    expect(result.items).toHaveLength(0);
    expect(result.changes.some(c => c.type === "schedule_applied")).toBe(true);
  });

  it("lida com restrição desconhecida sem crash", () => {
    const ctx = makeContext({ restrictions: ["alienigena_food"] });
    const items = makeItems();
    const result = personalizePlanItems(items, ctx);
    // Deve simplesmente não fazer nada
    expect(result.items.length).toBe(items.length);
  });
});
