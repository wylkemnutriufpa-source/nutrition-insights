import { assertEquals, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { generateWeeklyMarmitaPlan, estimateRecipeMacros, type MarmitaRecipe } from "./index.ts";

Deno.test("weekly_marmita integration: full contract validation", () => {
  // 1. Setup Mock Data
  const recipes: MarmitaRecipe[] = [
    { 
      id: "r1", name: "Frango com Batata Doce", meal_type: "almoço", 
      foods_json: [{ name: "Frango", grams: 150 }, { name: "Batata Doce", grams: 150 }],
      is_scalable: true 
    },
    { 
      id: "r2", name: "Patinho com Arroz", meal_type: "almoço", 
      foods_json: [{ name: "Patinho", grams: 150 }, { name: "Arroz", grams: 150 }],
      is_scalable: true 
    },
    { 
      id: "r3", name: "Peixe com Legumes", meal_type: "jantar", 
      foods_json: [{ name: "Tilápia", grams: 150 }, { name: "Brócolis", grams: 100 }],
      is_scalable: true 
    },
    { 
      id: "r4", name: "Omelete de Forno", meal_type: "jantar", 
      foods_json: [{ name: "Ovo", grams: 120 }, { name: "Queijo", grams: 30 }],
      is_scalable: false // Fixed grammage (Modo Paciente)
    }
  ];

  const kcalTarget = 2000;
  const macros = { protein: 160, carbs: 200, fat: 60 };

  // 2. Generate Plan
  const result = generateWeeklyMarmitaPlan(
    recipes, [], [], "manutencao", kcalTarget, macros, [], [], [], ["lunch", "dinner"]
  );

  // 3. Validate JSON structure & Length
  assertEquals(result.items.length, 14, "Should generate 14 items (7 days * 2 meals)");
  
  result.items.forEach(item => {
    const requiredFields = [
      "title", "description", "meal_type", "day_of_week", 
      "calories_target", "protein_target", "carbs_target", "fat_target",
      "_source", "_recipe_id", "_recipe_name", "_is_scalable"
    ];
    requiredFields.forEach(field => {
      assertNotEquals(item[field], undefined, `Field ${field} should be defined in ${item.title}`);
    });
    assertEquals(item._source, "meal_recipe");
  });

  // 4. Validate Macro Totals per Meal (Scalable vs Fixed)
  // Lunch Target: 2000 * 0.30 = 600
  // Dinner Target: 2000 * 0.22 = 440
  
  const lunch = result.items.find(i => i.meal_type === "lunch");
  const dinner = result.items.find(i => i.meal_type === "dinner");

  if (lunch && lunch._is_scalable) {
    assertEquals(lunch.calories_target, 600, "Lunch calories should match target (scalable)");
  }

  // 5. Validate Grammage Preservation (Modo Paciente)
  // Recipe r4 is not scalable. It has 120g Ovo + 30g Queijo = 150g total.
  // estimateRecipeMacros(r4) = 150 * 1.3 = 195. Math.max(195, 350) = 350 kcal.
  const fixedMeal = result.items.find(i => i._recipe_id === "r4");
  if (fixedMeal) {
    assertEquals(fixedMeal._is_scalable, false);
    assertEquals(fixedMeal.description.includes("120g Ovo"), true, "Should preserve 120g Ovo");
    assertEquals(fixedMeal.description.includes("30g Queijo"), true, "Should preserve 30g Queijo");
    assertEquals(fixedMeal.calories_target, 350, "Should use original estimated macros (floor 350) for non-scalable");
  }

  // 6. Validate Multiple Weeks (Variety/Consistency)
  // Calling it again with same parameters should yield same results due to deterministic seeds
  const week2 = generateWeeklyMarmitaPlan(
    recipes, [], [], "manutencao", kcalTarget, macros, [], [], [], ["lunch", "dinner"]
  );
  assertEquals(week2.items[0]._recipe_id, result.items[0]._recipe_id, "Deterministic results on same input");

  // In real use, we'd pass recentMeals to ensure variety, but here we just confirm 
  // that the structure holds for another run.
  assertEquals(week2.items.length, 14);
});
