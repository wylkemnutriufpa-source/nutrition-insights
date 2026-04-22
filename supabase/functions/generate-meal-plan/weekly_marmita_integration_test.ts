import { assertEquals, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { generateWeeklyMarmitaPlan, type MarmitaRecipe } from "./index.ts";

Deno.test("weekly_marmita integration: full contract validation", () => {
  // 1. Setup Mock Data with variety
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
    },
    { 
      id: "r5", name: "Lombo Suíno", meal_type: "almoço", 
      foods_json: [{ name: "Lombo", grams: 150 }],
      is_scalable: true 
    },
    { 
      id: "r6", name: "Frango Desfiado", meal_type: "jantar", 
      foods_json: [{ name: "Frango", grams: 120 }],
      is_scalable: true 
    }
  ];

  const kcalTarget = 2000;
  const macros = { protein: 160, carbs: 200, fat: 60 };

  // 2. Generate Plan for Week 1
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

  // 4. Validate Macro Totals and Proportions
  // Lunch Target: 2000 * 0.30 = 600
  // Dinner Target: 2000 * 0.22 = 440
  
  const lunchDay0 = result.items.find(i => i.day_of_week === 0 && i.meal_type === "lunch");
  const dinnerDay0 = result.items.find(i => i.day_of_week === 0 && i.meal_type === "dinner");

  if (lunchDay0 && lunchDay0._is_scalable) {
    assertEquals(lunchDay0.calories_target, 600, "Lunch calories should match target (scalable)");
  }
  if (dinnerDay0 && dinnerDay0._is_scalable) {
    assertEquals(dinnerDay0.calories_target, 440, "Dinner calories should match target (scalable)");
  }

  // 5. Validate Grammage Preservation (Modo Paciente)
  const fixedMeal = result.items.find(i => i._recipe_id === "r4");
  if (fixedMeal) {
    assertEquals(fixedMeal._is_scalable, false);
    assertEquals(fixedMeal.description.includes("120g Ovo"), true, "Should preserve 120g Ovo");
    assertEquals(fixedMeal.description.includes("30g Queijo"), true, "Should preserve 30g Queijo");
    // calories_target for fixed_meal is estimateRecipeMacros(r4) = 350
    assertEquals(fixedMeal.calories_target, 350);
  }

  // 6. Variety Validation: At least 3 different proteins used in a week
  const proteins = new Set(result.items.map(i => i._recipe_name.split(' ')[0])); // Simple protein detection
  assertEquals(proteins.size >= 3, true, `Should have variety, found: ${Array.from(proteins)}`);

  // 7. Multi-week consistency
  const week2 = generateWeeklyMarmitaPlan(
    recipes, [], [], "manutencao", kcalTarget, macros, [], [], [], ["lunch", "dinner"]
  );
  assertEquals(week2.items.length, 14);
  assertEquals(week2.items[0]._recipe_id, result.items[0]._recipe_id, "Selection should be deterministic on same seed/day");

  // 8. Total daily macro sum (Lunch + Dinner in this case as snacks are empty)
  const day0Meals = result.items.filter(i => i.day_of_week === 0);
  const totalProteinDay0 = day0Meals.reduce((s, i) => s + i.protein_target, 0);
  
  const allScalable = day0Meals.every(i => i._is_scalable);
  if (allScalable) {
    assertEquals(totalProteinDay0, macros.protein, "Daily protein target should be met if all meals are scalable");
  } else {
    // If not all scalable, it should still be a positive number
    assertEquals(totalProteinDay0 > 0, true);
  }
});
