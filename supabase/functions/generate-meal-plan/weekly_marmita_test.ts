
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { generateWeeklyMarmitaPlan, buildMarmitaItem, estimateRecipeMacros, type MarmitaRecipe } from "./index.ts";

Deno.test("weekly_marmita: buildMarmitaItem correctly scales macros and grams", () => {
  const recipe: MarmitaRecipe = {
    id: "r1",
    name: "Frango com Arroz",
    meal_type: "almoço",
    foods_json: [
      { name: "Frango", grams: 100 },
      { name: "Arroz", grams: 100 }
    ],
    is_scalable: true
  };

  const targetKcal = 600;
  // baseMacros for 200g total (1.3 kcal/g) = 260 kcal
  const baseMacros = estimateRecipeMacros(recipe);
  assertEquals(baseMacros.cal, 350); // It has a 350 floor in estimateRecipeMacros

  const item = buildMarmitaItem(recipe, "lunch", 0, targetKcal, "manutencao", []);
  
  // scaleFactor = 600 / 350 = 1.714
  // 100g * 1.714 = 171g
  assertEquals(item._scale_factor > 1.7 && item._scale_factor < 1.72, true);
  
  // Check if description has scaled grams
  assertEquals(item.description.includes("171g Frango"), true);
  assertEquals(item.description.includes("171g Arroz"), true);
});

Deno.test("weekly_marmita: buildMarmitaItem preserves grammages when is_scalable is false", () => {
  const recipe: MarmitaRecipe = {
    id: "r2",
    name: "Frango Fixo",
    meal_type: "almoço",
    foods_json: [
      { name: "Frango", grams: 150 }
    ],
    is_scalable: false
  };

  const targetKcal = 800; // Much higher than base
  const item = buildMarmitaItem(recipe, "lunch", 0, targetKcal, "manutencao", []);
  
  // Scale factor should be 1.0 even if target is different
  assertEquals(item._scale_factor, 1);
  assertEquals(item.description.includes("150g Frango"), true);
  
  // Macros should also be preserved (from estimateRecipeMacros for 150g)
  // 150g * 1.3 = 195 kcal -> should be at floor 350 though.
  const base = estimateRecipeMacros(recipe);
  assertEquals(item.calories_target, base.cal);
  assertEquals(item.protein_target, base.p);
});

Deno.test("weekly_marmita: generateWeeklyMarmitaPlan distributes macros correctly", () => {
  const recipes: MarmitaRecipe[] = [
    { id: "l1", name: "Almoço 1", meal_type: "almoço", foods_json: [{ name: "F", grams: 100 }] },
    { id: "d1", name: "Jantar 1", meal_type: "jantar", foods_json: [{ name: "F", grams: 100 }] }
  ];
  
  const kcalTarget = 2000;
  const macros = { protein: 150, carbs: 200, fat: 60 };
  
  const result = generateWeeklyMarmitaPlan(
    recipes, [], [], "manutencao", kcalTarget, macros, [], [], [], ["lunch", "dinner"]
  );
  
  assertEquals(result.items.length, 14); // 7 days * 2 meals
  
  // Check day 0 lunch
  const lunch = result.items.find(i => i.day_of_week === 0 && i.meal_type === "lunch");
  const dinner = result.items.find(i => i.day_of_week === 0 && i.meal_type === "dinner");
  
  // MEAL_KCAL_SPLIT["lunch"] is 0.30, ["dinner"] is 0.22
  // lunchKcal = 2000 * 0.3 = 600
  // dinnerKcal = 2000 * 0.22 = 440
  // Total marmita kcal = 1040
  // lunchShare = 600 / 1040 = 0.5769
  // proteinTarget for lunch = 150 * 0.5769 = 86.5 -> 87
  
  assertEquals(lunch.calories_target, 600);
  assertEquals(dinner.calories_target, 440);
  assertEquals(lunch.protein_target, 87);
  assertEquals(dinner.protein_target, 63); // 150 - 87
});
