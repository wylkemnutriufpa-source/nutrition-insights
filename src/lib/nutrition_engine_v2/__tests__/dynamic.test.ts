import { describe, it, expect } from "vitest";
import { buildMealStructure } from "../mealStructureBuilder";
import { buildDynamicDistribution } from "../distributionEngine";
import { calcMetrics } from "../calculations";

describe("Nutrition Engine V2.1 - Dynamic Structure", () => {
  const patient = {
    weight_kg: 80,
    height_cm: 180,
    sex: "M" as const,
    age: 30,
    activity_level: "moderate" as const,
    goal: "maintain" as const,
  };

  it("should create exactly 4 meals from 4 inputs", () => {
    const inputs = [
      { time: "07:00", label: "Café" },
      { time: "12:30", label: "Almoço" },
      { time: "16:00", label: "Lanche" },
      { time: "20:00", label: "Jantar" },
    ];
    const structure = buildMealStructure(inputs);
    expect(structure).toHaveLength(4);
    expect(structure[0].time).toBe("07:00");
    expect(structure[1].time).toBe("12:30");
  });

  it("should distribute calories correctly (sum = target_kcal)", () => {
    const metrics = calcMetrics(patient);
    const inputs = [
      { time: "08:00" },
      { time: "13:00" },
      { time: "20:00" },
    ];
    const structure = buildMealStructure(inputs);
    const dist = buildDynamicDistribution(structure, metrics.target_kcal);
    
    const totalDist = dist.reduce((sum, d) => sum + d.kcal_target, 0);
    expect(Math.abs(totalDist - metrics.target_kcal)).toBeLessThan(1);
  });

  it("should prioritize lunch/dinner in calorie distribution", () => {
    const inputs = [
      { time: "08:00", label: "Café" },
      { time: "13:00", label: "Almoço" },
      { time: "16:00", label: "Lanche" },
    ];
    const structure = buildMealStructure(inputs);
    const dist = buildDynamicDistribution(structure, 2000);
    
    const lunchDist = dist.find(d => structure.find(s => s.id === d.meal_id)?.type_hint === 'lunch');
    const cafeDist = dist.find(d => structure.find(s => s.id === d.meal_id)?.name === 'Café');
    
    expect(lunchDist!.kcal_target).toBeGreaterThan(cafeDist!.kcal_target);
  });
});
