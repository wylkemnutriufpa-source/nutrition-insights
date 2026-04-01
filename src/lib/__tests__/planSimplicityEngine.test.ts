/**
 * Testes unitários — Motor de Simplicidade
 */
import { describe, it, expect } from "vitest";
import {
  calculatePlanSimplicityScore,
  type MealItemForAudit,
} from "../planSimplicityEngine";

function makeMealItem(overrides: Partial<MealItemForAudit> = {}): MealItemForAudit {
  return {
    id: "item-1",
    title: "Arroz com frango",
    description: "Arroz branco, peito de frango grelhado, feijão",
    meal_type: "lunch",
    day_of_week: 1,
    calories_target: 500,
    protein_target: 35,
    carbs_target: 55,
    fat_target: 12,
    ...overrides,
  };
}

describe("calculatePlanSimplicityScore", () => {
  it("retorna score alto para plano simples e limpo", () => {
    const items: MealItemForAudit[] = [
      makeMealItem({ id: "1", title: "Pão com ovo", description: "Pão integral, ovo mexido", meal_type: "breakfast" }),
      makeMealItem({ id: "2", title: "Arroz com frango", description: "Arroz, frango, feijão", meal_type: "lunch" }),
      makeMealItem({ id: "3", title: "Banana", description: "Banana", meal_type: "snack" }),
      makeMealItem({ id: "4", title: "Carne com batata", description: "Carne moída, batata doce", meal_type: "dinner" }),
    ];
    const score = calculatePlanSimplicityScore(items);
    expect(score.total).toBeGreaterThanOrEqual(60);
    expect(score.blockedFoodsFound.length).toBe(0);
  });

  it("penaliza plano com alimentos bloqueados", () => {
    const items: MealItemForAudit[] = [
      makeMealItem({ id: "1", title: "Salmão grelhado", description: "Salmão com quinoa e kefir", meal_type: "lunch" }),
    ];
    const score = calculatePlanSimplicityScore(items);
    expect(score.blockedFoodsFound.length).toBeGreaterThan(0);
    expect(score.total).toBeLessThan(100);
  });

  it("penaliza café da manhã complexo", () => {
    const items: MealItemForAudit[] = [
      makeMealItem({
        id: "1",
        title: "Café elaborado",
        description: "Omelete de claras, queijo cottage, granola premium, iogurte grego, frutas vermelhas, chia",
        meal_type: "breakfast",
      }),
    ];
    const score = calculatePlanSimplicityScore(items);
    expect(score.issues.length).toBeGreaterThan(0);
  });

  it("retorna label coerente com score", () => {
    const items: MealItemForAudit[] = [
      makeMealItem({ id: "1", title: "Arroz com ovo", description: "Arroz, ovo, feijão", meal_type: "lunch" }),
    ];
    const score = calculatePlanSimplicityScore(items);
    expect(["Excelente", "Bom", "Regular", "Precisa Melhorar", "Crítico"]).toContain(score.label);
  });

  it("lida com lista vazia sem crash", () => {
    const score = calculatePlanSimplicityScore([]);
    expect(score.total).toBeDefined();
    expect(score.issues).toHaveLength(0);
  });
});
