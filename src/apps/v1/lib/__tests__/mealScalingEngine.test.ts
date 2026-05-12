/**
 * Testes unitários — Motor de Escala Nutricional
 */
import { describe, it, expect } from "vitest";
import {
  scaleMealToTarget,
  rankTemplatesForPatient,
  type MealTemplate,
  type ScalingTarget,
} from "../mealScalingEngine";

// ── Helpers ──
function makeTemplate(overrides: Partial<MealTemplate> = {}): MealTemplate {
  return {
    id: "tpl-1",
    name: "Almoço padrão",
    meal_type: "lunch",
    kcal_base: 500,
    protein_base: 30,
    carbs_base: 60,
    fat_base: 15,
    foods_structure: [
      { name: "Arroz", portion_grams: 150, calories: 200, protein: 4, carbs: 44, fat: 0.5 },
      { name: "Feijão", portion_grams: 100, calories: 80, protein: 5, carbs: 14, fat: 0.5 },
      { name: "Frango grelhado", portion_grams: 120, calories: 180, protein: 20, carbs: 0, fat: 4 },
      { name: "Salada", portion_grams: 80, calories: 40, protein: 1, carbs: 2, fat: 10 },
    ],
    ...overrides,
  };
}

describe("scaleMealToTarget", () => {
  it("retorna estrutura válida com escala 1:1 quando target = base", () => {
    const tpl = makeTemplate();
    const result = scaleMealToTarget(tpl, { target_kcal: 500 });
    expect(result.scale_factor).toBe(1);
    expect(result.foods.length).toBe(4);
    expect(result.total_calories).toBeGreaterThan(0);
  });

  it("escala para cima corretamente", () => {
    const tpl = makeTemplate();
    const result = scaleMealToTarget(tpl, { target_kcal: 1000 });
    expect(result.scale_factor).toBe(2);
    expect(result.total_calories).toBeGreaterThan(500);
    // Porções devem ter crescido
    result.foods.forEach(f => {
      expect(f.portion_grams).toBeGreaterThanOrEqual(f.original_portion);
    });
  });

  it("escala para baixo corretamente", () => {
    const tpl = makeTemplate();
    const result = scaleMealToTarget(tpl, { target_kcal: 250 });
    expect(result.scale_factor).toBe(0.5);
    result.foods.forEach(f => {
      expect(f.portion_grams).toBeLessThanOrEqual(f.original_portion);
    });
  });

  it("respeita limite máximo de escala (2.5x)", () => {
    const tpl = makeTemplate();
    const result = scaleMealToTarget(tpl, { target_kcal: 5000 });
    expect(result.scale_factor).toBe(2.5);
  });

  it("respeita limite mínimo de escala (0.3x)", () => {
    const tpl = makeTemplate();
    const result = scaleMealToTarget(tpl, { target_kcal: 50 });
    expect(result.scale_factor).toBe(0.3);
  });

  it("respeita porção mínima de 10g", () => {
    const tpl = makeTemplate({
      foods_structure: [
        { name: "Azeite", portion_grams: 5, calories: 45, protein: 0, carbs: 0, fat: 5 },
      ],
    });
    const result = scaleMealToTarget(tpl, { target_kcal: 100 });
    expect(result.foods[0].portion_grams).toBeGreaterThanOrEqual(10);
  });

  it("respeita porção máxima de 500g", () => {
    const tpl = makeTemplate({
      foods_structure: [
        { name: "Arroz", portion_grams: 400, calories: 500, protein: 10, carbs: 100, fat: 2 },
      ],
    });
    const result = scaleMealToTarget(tpl, { target_kcal: 2000 });
    expect(result.foods[0].portion_grams).toBeLessThanOrEqual(500);
  });

  it("aplica protein cap por kg de peso corporal", () => {
    const tpl = makeTemplate({
      kcal_base: 500,
      foods_structure: [
        { name: "Frango", portion_grams: 300, calories: 500, protein: 90, carbs: 0, fat: 10 },
      ],
    });
    const result = scaleMealToTarget(tpl, {
      target_kcal: 500,
      patient_weight_kg: 60,
    });
    // Max = 60 * 2.5 = 150g, original 90g should be fine at 1:1
    expect(result.total_protein).toBeLessThanOrEqual(150);
  });

  it("garante gordura mínima de 20g", () => {
    const tpl = makeTemplate({
      kcal_base: 400,
      foods_structure: [
        { name: "Arroz", portion_grams: 200, calories: 300, protein: 5, carbs: 60, fat: 1 },
        { name: "Frango", portion_grams: 100, calories: 100, protein: 20, carbs: 0, fat: 2 },
      ],
    });
    const result = scaleMealToTarget(tpl, { target_kcal: 400 });
    expect(result.total_fat).toBeGreaterThanOrEqual(20);
  });

  it("lida com template de 0 kcal sem crash", () => {
    const tpl = makeTemplate({ kcal_base: 0 });
    const result = scaleMealToTarget(tpl, { target_kcal: 500 });
    expect(result.scale_factor).toBe(1);
    expect(result.total_calories).toBe(0);
  });
});

describe("rankTemplatesForPatient", () => {
  const templates = [
    makeTemplate({ id: "a", goal_tags: ["weight_loss"], meal_type: "lunch", complexity_level: "simple" }),
    makeTemplate({ id: "b", goal_tags: ["hypertrophy"], meal_type: "lunch", complexity_level: "moderate" }),
    makeTemplate({ id: "c", goal_tags: ["weight_loss", "maintenance"], meal_type: "breakfast" }),
  ];

  it("ranqueia por goal match", () => {
    const ranked = rankTemplatesForPatient(templates, "weight_loss");
    expect(ranked[0].id).toBe("a"); // goal match + simple
  });

  it("ranqueia por meal_type match", () => {
    const ranked = rankTemplatesForPatient(templates, "hypertrophy", undefined, "lunch");
    expect(ranked[0].id).toBe("b"); // goal + meal_type match
  });

  it("favorece simplicidade para behavioral_struggler", () => {
    const ranked = rankTemplatesForPatient(templates, "weight_loss", "behavioral_struggler");
    const aScore = ranked.find(t => t.id === "a")!.relevance_score;
    const cScore = ranked.find(t => t.id === "c")!.relevance_score;
    expect(aScore).toBeGreaterThan(cScore); // a has simple complexity
  });
});
