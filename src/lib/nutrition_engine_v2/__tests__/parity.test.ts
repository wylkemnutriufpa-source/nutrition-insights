/**
 * Testes de paridade — Motor Determinístico V2
 *
 * Valida que o motor V2 reproduz EXATAMENTE os números do MOTOR_DETERMINISTICO.md
 * (seção 9 — exemplo João).
 *
 * Qualquer divergência aqui = implementação INCORRETA.
 */

import { describe, expect, it } from "vitest";
import {
  calcAge,
  calcMetrics,
  calcTMB,
  buildAutoPlan,
  MEAL_DISTRIBUTION,
  MEAL_ORDER,
  type FoodRecord,
} from "@/lib/nutrition_engine_v2";

describe("nutrition_engine_v2 — paridade com MOTOR_DETERMINISTICO.md", () => {
  it("TMB Mifflin-St Jeor (M) — João 80kg/175cm/36a → 1718.8", () => {
    expect(calcTMB("M", 80, 175, 36)).toBe(1718.8);
  });

  it("TMB Mifflin-St Jeor (F) — 60kg/165cm/30a → 1320.25", () => {
    // 10*60 + 6.25*165 - 5*30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25
    expect(calcTMB("F", 60, 165, 30)).toBe(1320.3);
  });

  it("Pipeline completo — exemplo João (lose) deve bater seção 9", () => {
    const m = calcMetrics({
      weight_kg: 80,
      height_cm: 175,
      sex: "M",
      age: 36,
      activity_level: "moderate",
      goal: "lose",
    });

    expect(m.tmb).toBe(1718.8);
    expect(m.get).toBe(2664.1);
    expect(m.target_kcal).toBe(2164.1);
    expect(m.protein_g).toBe(144);
    expect(m.fat_g).toBe(60.1);
    expect(m.carb_g).toBe(261.8);
    expect(m.imc).toBe(26.1);
    expect(m.engine_version).toBe("v2.0.0-deterministic");
  });

  it("Distribuição calórica entre refeições deve somar 100%", () => {
    const total = MEAL_ORDER.reduce((s, k) => s + MEAL_DISTRIBUTION[k], 0);
    expect(Math.round(total * 100) / 100).toBe(1.0);
  });

  it("Ajuste por objetivo: maintain → 0, gain → +400", () => {
    const base = { weight_kg: 80, height_cm: 175, sex: "M" as const, age: 36, activity_level: "moderate" as const };
    const maintain = calcMetrics({ ...base, goal: "maintain" });
    const gain = calcMetrics({ ...base, goal: "gain" });
    expect(maintain.target_kcal).toBe(2664.1);
    expect(gain.target_kcal).toBe(3064.1);
  });

  it("Proteína g/kg muda por objetivo: lose 1.8 / maintain 1.6 / gain 2.0", () => {
    const base = { weight_kg: 80, height_cm: 175, sex: "M" as const, age: 36, activity_level: "moderate" as const };
    expect(calcMetrics({ ...base, goal: "lose" }).protein_g).toBe(144);
    expect(calcMetrics({ ...base, goal: "maintain" }).protein_g).toBe(128);
    expect(calcMetrics({ ...base, goal: "gain" }).protein_g).toBe(160);
  });

  it("calcAge sem birth_date → 30 (default determinístico)", () => {
    expect(calcAge(undefined)).toBe(30);
    expect(calcAge(null)).toBe(30);
    expect(calcAge("")).toBe(30);
  });

  it("buildAutoPlan gera 6 refeições na ordem fixa do enum", () => {
    const metrics = calcMetrics({
      weight_kg: 80, height_cm: 175, sex: "M", age: 36,
      activity_level: "moderate", goal: "lose",
    });
    const foods: FoodRecord[] = [
      { id: "f1", name: "Ovo inteiro cozido", calories: 155, protein: 13, carbs: 1.1, fat: 11 },
      { id: "f2", name: "Pão integral", calories: 253, protein: 9.4, carbs: 49.9, fat: 3.2 },
      { id: "f3", name: "Mamão papaia", calories: 40, protein: 0.5, carbs: 10.4, fat: 0.1 },
      { id: "f4", name: "Café coado sem açúcar", calories: 2, protein: 0.1, carbs: 0.3, fat: 0 },
      { id: "f5", name: "Iogurte natural integral", calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3 },
      { id: "f6", name: "Maçã", calories: 56, protein: 0.3, carbs: 15.2, fat: 0.1 },
      { id: "f7", name: "Arroz integral cozido", calories: 124, protein: 2.6, carbs: 25.8, fat: 1 },
      { id: "f8", name: "Feijão carioca cozido", calories: 76, protein: 4.8, carbs: 13.6, fat: 0.5 },
      { id: "f9", name: "Peito de frango grelhado", calories: 163, protein: 31.5, carbs: 0, fat: 3.6 },
      { id: "f10", name: "Alface crespa", calories: 11, protein: 1.3, carbs: 1.7, fat: 0.2 },
      { id: "f11", name: "Tomate", calories: 15, protein: 1.1, carbs: 3.1, fat: 0.2 },
      { id: "f12", name: "Azeite de oliva extra virgem", calories: 884, protein: 0, carbs: 0, fat: 100 },
      { id: "f13", name: "Amêndoas", calories: 581, protein: 18.6, carbs: 19.5, fat: 47.3 },
      { id: "f14", name: "Tilápia grelhada", calories: 129, protein: 26.2, carbs: 0, fat: 2.7 },
      { id: "f15", name: "Batata doce cozida", calories: 77, protein: 0.6, carbs: 18.4, fat: 0.1 },
      { id: "f16", name: "Brócolis cozido", calories: 25, protein: 2.1, carbs: 4, fat: 0.4 },
    ];
    const plan = buildAutoPlan(metrics, "lose", foods);
    expect(plan.meals).toHaveLength(6);
    expect(plan.meals.map((m) => m.type)).toEqual(MEAL_ORDER);
    // Nenhum item resolvido vazio nos slots cobertos
    expect(plan.meals[0].items.length).toBeGreaterThan(0); // breakfast
    expect(plan.meals[2].items.length).toBeGreaterThan(0); // lunch
    expect(plan.totals.kcal).toBeGreaterThan(0);
  });
});
