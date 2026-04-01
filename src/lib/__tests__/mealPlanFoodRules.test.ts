/**
 * Testes unitários — Regras de Alimentos
 */
import { describe, it, expect } from "vitest";
import {
  BLOCKED_FOODS,
  ALLOWED_PROTEINS,
  ALLOWED_CARBS,
  ALLOWED_FRUITS,
} from "../mealPlanFoodRules";

describe("BLOCKED_FOODS", () => {
  it("contém alimentos caros/importados", () => {
    expect(BLOCKED_FOODS).toContain("salmão");
    expect(BLOCKED_FOODS).toContain("quinoa");
    expect(BLOCKED_FOODS).toContain("whey protein");
  });

  it("não contém alimentos brasileiros populares", () => {
    const basicFoods = ["arroz", "feijão", "frango", "ovo", "banana"];
    for (const food of basicFoods) {
      expect(BLOCKED_FOODS).not.toContain(food);
    }
  });
});

describe("ALLOWED_PROTEINS", () => {
  it("contém proteínas brasileiras básicas", () => {
    expect(ALLOWED_PROTEINS).toContain("frango");
    expect(ALLOWED_PROTEINS).toContain("carne moída");
    expect(ALLOWED_PROTEINS).toContain("ovo");
  });

  it("não tem overlap com BLOCKED_FOODS", () => {
    const blockedSet = new Set(BLOCKED_FOODS.map(f => f.toLowerCase()));
    for (const protein of ALLOWED_PROTEINS) {
      expect(blockedSet.has(protein.toLowerCase())).toBe(false);
    }
  });
});

describe("ALLOWED_CARBS", () => {
  it("contém carboidratos brasileiros", () => {
    expect(ALLOWED_CARBS).toContain("arroz");
    expect(ALLOWED_CARBS).toContain("batata doce");
  });
});

describe("ALLOWED_FRUITS", () => {
  it("contém frutas populares brasileiras", () => {
    expect(ALLOWED_FRUITS).toContain("banana");
    expect(ALLOWED_FRUITS).toContain("maçã");
  });
});
